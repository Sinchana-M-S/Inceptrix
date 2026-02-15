"""
Feature Engineering Pipeline for NBFC Loan Foreclosure Prediction.
"""
import numpy as np
import pandas as pd
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from database import get_db, rows_to_list

def get_loan_features(loan_id: str = None) -> pd.DataFrame:
    """
    Extract features for foreclosure prediction.
    If loan_id is provided, returns features for single loan.
    Otherwise returns features for all active loans.
    """
    with get_db() as conn:
        # Base loan and customer data
        query = """
            SELECT 
                l.loan_id,
                l.customer_id,
                l.loan_type,
                l.loan_amount,
                l.interest_rate,
                l.emi_amount,
                l.total_tenure,
                l.remaining_tenure,
                l.outstanding_principal,
                l.disbursement_date,
                c.age,
                c.income_band,
                c.employment_type,
                c.credit_score_band,
                c.location_tier,
                c.state
            FROM loans l
            JOIN customers c ON l.customer_id = c.customer_id
            WHERE l.status = 'ACTIVE'
        """
        
        if loan_id:
            query += " AND l.loan_id = ?"
            params = (loan_id,)
        else:
            params = ()
        
        cursor = conn.execute(query, params)
        loans = rows_to_list(cursor.fetchall())
        
        if not loans:
            return pd.DataFrame()
        
        df = pd.DataFrame(loans)
        
        # Add payment behavior features
        for idx, row in df.iterrows():
            lid = row['loan_id']
            
            # EMI payment statistics
            cursor = conn.execute("""
                SELECT 
                    AVG(amount_paid) as avg_payment,
                    AVG(delay_days) as avg_delay,
                    SUM(CASE WHEN delay_days > 0 THEN 1 ELSE 0 END) as delay_count,
                    SUM(CASE WHEN bounced = 1 THEN 1 ELSE 0 END) as bounce_count,
                    COUNT(*) as total_payments
                FROM (
                    SELECT * FROM emi_payments 
                    WHERE loan_id = ?
                    ORDER BY due_date DESC LIMIT 12
                )
            """, (lid,))
            stats = dict(cursor.fetchone())
            
            df.at[idx, 'avg_emi_last_12m'] = stats['avg_payment'] or row['emi_amount']
            df.at[idx, 'avg_delay_days'] = stats['avg_delay'] or 0
            df.at[idx, 'delay_count_12m'] = stats['delay_count'] or 0
            df.at[idx, 'bounce_count_12m'] = stats['bounce_count'] or 0
            
            # Last 3 months statistics
            cursor = conn.execute("""
                SELECT 
                    SUM(CASE WHEN delay_days > 0 THEN 1 ELSE 0 END) as delay_count_3m,
                    SUM(CASE WHEN bounced = 1 THEN 1 ELSE 0 END) as bounce_count_3m
                FROM (
                    SELECT * FROM emi_payments 
                    WHERE loan_id = ?
                    ORDER BY due_date DESC LIMIT 3
                )
            """, (lid,))
            stats_3m = dict(cursor.fetchone())
            df.at[idx, 'delay_count_3m'] = stats_3m['delay_count_3m'] or 0
            df.at[idx, 'bounce_count_3m'] = stats_3m['bounce_count_3m'] or 0
            
            # Prepayment statistics
            cursor = conn.execute("""
                SELECT COUNT(*) as prepay_count, SUM(amount) as prepay_total
                FROM prepayments WHERE loan_id = ?
            """, (lid,))
            prepay = dict(cursor.fetchone())
            df.at[idx, 'prepayment_count'] = prepay['prepay_count'] or 0
            df.at[idx, 'prepayment_total'] = prepay['prepay_total'] or 0
            
            # BT inquiry features
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as bt_count,
                    MIN(julianday('now') - julianday(inquiry_date)) as days_since_bt,
                    MIN(offered_rate) as best_offered_rate
                FROM bt_inquiries
                WHERE loan_id = ?
                AND inquiry_date >= date('now', '-6 months')
            """, (lid,))
            bt = dict(cursor.fetchone())
            df.at[idx, 'bt_inquiry_count'] = bt['bt_count'] or 0
            df.at[idx, 'days_since_bt'] = bt['days_since_bt'] or 365
            df.at[idx, 'rate_differential'] = (
                row['interest_rate'] - (bt['best_offered_rate'] or row['interest_rate'])
            )
    
    return df

def encode_features(df: pd.DataFrame) -> pd.DataFrame:
    """Encode categorical features and create derived features."""
    if df.empty:
        return df
    
    # Loan type encoding
    loan_type_map = {'HL': 0, 'LAP': 1, 'PL': 2, 'BL': 3, 'VL': 4, 'GL': 5}
    df['loan_type_enc'] = df['loan_type'].map(loan_type_map).fillna(0)
    
    # Income band encoding (ordinal)
    income_map = {'0-3L': 1, '3-6L': 2, '6-10L': 3, '10-25L': 4, '25L+': 5}
    df['income_band_enc'] = df['income_band'].map(income_map).fillna(2)
    
    # Employment type encoding
    emp_map = {'SALARIED': 0, 'SELF_EMPLOYED': 1, 'BUSINESS': 2}
    df['employment_type_enc'] = df['employment_type'].map(emp_map).fillna(0)
    
    # Credit score band encoding (ordinal)
    credit_map = {'300-500': 1, '500-650': 2, '650-750': 3, '750-900': 4}
    df['credit_score_enc'] = df['credit_score_band'].map(credit_map).fillna(2)
    
    # Location tier encoding
    tier_map = {'TIER1': 1, 'TIER2': 2, 'TIER3': 3}
    df['location_tier_enc'] = df['location_tier'].map(tier_map).fillna(2)
    
    # Derived features
    df['loan_age_months'] = (
        (datetime.now() - pd.to_datetime(df['disbursement_date'])).dt.days / 30
    ).astype(int)
    
    df['tenure_elapsed_ratio'] = 1 - (df['remaining_tenure'] / df['total_tenure'])
    df['outstanding_ratio'] = df['outstanding_principal'] / df['loan_amount']
    
    # EMI to income ratio (approximated)
    income_midpoints = {'0-3L': 150000, '3-6L': 450000, '6-10L': 800000, 
                        '10-25L': 1750000, '25L+': 3500000}
    df['approx_income'] = df['income_band'].map(income_midpoints).fillna(500000)
    df['emi_to_income_ratio'] = (df['emi_amount'] * 12) / df['approx_income']
    
    # Remaining interest payable
    df['remaining_interest'] = (
        df['emi_amount'] * df['remaining_tenure'] - df['outstanding_principal']
    )
    
    # BT inquiry flag
    df['has_bt_inquiry'] = (df['bt_inquiry_count'] > 0).astype(int)
    df['recent_bt'] = (df['days_since_bt'] < 30).astype(int)
    
    # Prepayment frequency
    df['prepay_frequency'] = df['prepayment_count'] / (df['loan_age_months'] + 1)
    
    return df

def get_feature_columns():
    """Return list of features used for model training."""
    return [
        'loan_type_enc', 'loan_amount', 'interest_rate', 'emi_amount',
        'total_tenure', 'remaining_tenure', 'outstanding_principal',
        'age', 'income_band_enc', 'employment_type_enc', 'credit_score_enc',
        'location_tier_enc', 'avg_emi_last_12m', 'avg_delay_days',
        'delay_count_12m', 'bounce_count_12m', 'delay_count_3m', 'bounce_count_3m',
        'prepayment_count', 'prepayment_total', 'bt_inquiry_count',
        'days_since_bt', 'rate_differential', 'loan_age_months',
        'tenure_elapsed_ratio', 'outstanding_ratio', 'emi_to_income_ratio',
        'remaining_interest', 'has_bt_inquiry', 'recent_bt', 'prepay_frequency'
    ]

def prepare_features(loan_id: str = None) -> tuple:
    """
    Main feature preparation pipeline.
    Returns: (DataFrame with features, feature column names)
    """
    df = get_loan_features(loan_id)
    if df.empty:
        return df, []
    
    df = encode_features(df)
    feature_cols = get_feature_columns()
    
    # Fill any missing values
    for col in feature_cols:
        if col in df.columns:
            df[col] = df[col].fillna(0)
    
    return df, feature_cols
