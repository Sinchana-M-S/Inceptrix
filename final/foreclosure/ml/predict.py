"""
Prediction module with SHAP explainability for NBFC Loan Foreclosure.
Uses a rule-based model as fallback when ML model is not trained.
"""
import json
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from database import get_db, row_to_dict

# Model version
MODEL_VERSION = "v1.0.0"

def calculate_risk_score(features: dict) -> dict:
    """
    Calculate foreclosure risk score using rule-based model.
    This serves as a reliable baseline and fallback.
    """
    score = 0.0
    factors = []
    
    # BT inquiry is strongest signal
    bt_count = features.get('bt_inquiry_count', 0)
    if bt_count > 0:
        bt_impact = min(0.35, bt_count * 0.15)
        score += bt_impact
        factors.append({
            'factor': 'Balance Transfer Inquiry',
            'impact': round(bt_impact, 2),
            'direction': 'positive',
            'description': f'{bt_count} BT inquiry(ies) in last 6 months'
        })
    
    # Rate differential
    rate_diff = features.get('rate_differential', 0)
    if rate_diff > 0.25:
        rate_impact = min(0.20, rate_diff * 0.15)
        score += rate_impact
        factors.append({
            'factor': 'Competitor Offering Lower Rate',
            'impact': round(rate_impact, 2),
            'direction': 'positive',
            'description': f'Rate {rate_diff:.2f}% lower available'
        })
    
    # High remaining tenure (more likely to BT for savings)
    remaining_tenure = features.get('remaining_tenure', 0)
    total_tenure = features.get('total_tenure', 1)
    tenure_ratio = remaining_tenure / total_tenure
    if tenure_ratio > 0.6:
        tenure_impact = tenure_ratio * 0.18
        score += tenure_impact
        factors.append({
            'factor': 'High Remaining Tenure',
            'impact': round(tenure_impact, 2),
            'direction': 'positive',
            'description': f'{remaining_tenure} months remaining ({tenure_ratio:.0%} of loan)'
        })
    
    # Good credit score (easier to get BT)
    credit_score = features.get('credit_score_enc', 2)
    if credit_score >= 3:
        credit_impact = 0.12 if credit_score == 4 else 0.08
        score += credit_impact
        factors.append({
            'factor': 'High Credit Score',
            'impact': round(credit_impact, 2),
            'direction': 'positive',
            'description': 'Customer has good credit, easier to get BT'
        })
    
    # Prepayment history
    prepay_count = features.get('prepayment_count', 0)
    if prepay_count > 0:
        prepay_impact = min(0.15, prepay_count * 0.05)
        score += prepay_impact
        factors.append({
            'factor': 'Prepayment History',
            'impact': round(prepay_impact, 2),
            'direction': 'positive',
            'description': f'{prepay_count} prepayment(s) made'
        })
    
    # Large outstanding principal (more savings from BT)
    outstanding = features.get('outstanding_principal', 0)
    if outstanding > 2000000:  # 20 lakhs
        outstanding_impact = min(0.12, (outstanding / 10000000) * 0.10)
        score += outstanding_impact
        factors.append({
            'factor': 'Large Outstanding Principal',
            'impact': round(outstanding_impact, 2),
            'direction': 'positive',
            'description': f'₹{outstanding/100000:.1f}L outstanding'
        })
    
    # High income (better BT options)
    income_enc = features.get('income_band_enc', 2)
    if income_enc >= 4:
        income_impact = 0.08
        score += income_impact
        factors.append({
            'factor': 'High Income Customer',
            'impact': round(income_impact, 2),
            'direction': 'positive',
            'description': 'High income makes customer attractive for competitors'
        })
    
    # Payment delays (negative factor - harder to get BT)
    delay_count = features.get('delay_count_3m', 0)
    if delay_count > 0:
        delay_impact = -min(0.15, delay_count * 0.05)
        score += delay_impact
        factors.append({
            'factor': 'Recent Payment Delays',
            'impact': round(abs(delay_impact), 2),
            'direction': 'negative', 
            'description': f'{delay_count} late payment(s) in last 3 months'
        })
    
    # Bounced payments (negative)
    bounce_count = features.get('bounce_count_12m', 0)
    if bounce_count > 0:
        bounce_impact = -min(0.20, bounce_count * 0.08)
        score += bounce_impact
        factors.append({
            'factor': 'Bounced EMIs',
            'impact': round(abs(bounce_impact), 2),
            'direction': 'negative',
            'description': f'{bounce_count} bounced payment(s) in last year'
        })
    
    # Clamp score to [0, 1]
    score = max(0.05, min(0.95, score))
    
    # Sort factors by absolute impact
    factors.sort(key=lambda x: x['impact'], reverse=True)
    
    return {
        'probability': round(score, 2),
        'factors': factors[:5]  # Top 5 factors
    }

def calculate_time_to_foreclosure(probability: float, features: dict) -> int:
    """
    Estimate time to foreclosure based on probability and signals.
    Returns number of days.
    """
    if probability < 0.3:
        return None  # Low risk, no imminent foreclosure
    
    # Base estimate inversely proportional to probability
    base_days = int((1 - probability) * 180)
    
    # Adjust based on recency of BT inquiry
    days_since_bt = features.get('days_since_bt', 365)
    if days_since_bt < 30:
        base_days = int(base_days * 0.5)  # Recent inquiry = faster
    elif days_since_bt < 90:
        base_days = int(base_days * 0.75)
    
    # Minimum 15 days, maximum 180 days
    return max(15, min(180, base_days))

def calculate_revenue_at_risk(features: dict) -> float:
    """
    Calculate total revenue at risk if loan is foreclosed.
    Revenue = Remaining interest payments.
    """
    emi = features.get('emi_amount', 0)
    remaining_tenure = features.get('remaining_tenure', 0)
    outstanding = features.get('outstanding_principal', 0)
    
    # Remaining interest = Total remaining payments - Outstanding principal
    remaining_interest = (emi * remaining_tenure) - outstanding
    return max(0, round(remaining_interest, 2))

def get_risk_category(probability: float) -> str:
    """Categorize risk level."""
    if probability >= 0.6:
        return 'HIGH'
    elif probability >= 0.3:
        return 'MEDIUM'
    else:
        return 'LOW'

def get_loan_features_for_prediction(loan_id: str) -> dict:
    """Fetch all features needed for prediction."""
    with get_db() as conn:
        # Get loan and customer data
        cursor = conn.execute("""
            SELECT 
                l.loan_id, l.loan_type, l.loan_amount, l.interest_rate,
                l.emi_amount, l.total_tenure, l.remaining_tenure,
                l.outstanding_principal, l.disbursement_date,
                c.age, c.income_band, c.employment_type, 
                c.credit_score_band, c.location_tier
            FROM loans l
            JOIN customers c ON l.customer_id = c.customer_id
            WHERE l.loan_id = ?
        """, (loan_id,))
        row = cursor.fetchone()
        
        if not row:
            return None
        
        features = dict(row)
        
        # Encode categorical features
        income_map = {'0-3L': 1, '3-6L': 2, '6-10L': 3, '10-25L': 4, '25L+': 5}
        credit_map = {'300-500': 1, '500-650': 2, '650-750': 3, '750-900': 4}
        
        features['income_band_enc'] = income_map.get(features.get('income_band'), 2)
        features['credit_score_enc'] = credit_map.get(features.get('credit_score_band'), 2)
        
        # Get payment statistics
        cursor = conn.execute("""
            SELECT 
                SUM(CASE WHEN delay_days > 0 THEN 1 ELSE 0 END) as delay_count_12m,
                SUM(CASE WHEN bounced = 1 THEN 1 ELSE 0 END) as bounce_count_12m
            FROM (
                SELECT * FROM emi_payments 
                WHERE loan_id = ? ORDER BY due_date DESC LIMIT 12
            )
        """, (loan_id,))
        stats = dict(cursor.fetchone())
        features['delay_count_12m'] = stats['delay_count_12m'] or 0
        features['bounce_count_12m'] = stats['bounce_count_12m'] or 0
        
        # Last 3 months
        cursor = conn.execute("""
            SELECT SUM(CASE WHEN delay_days > 0 THEN 1 ELSE 0 END) as delay_count_3m
            FROM (
                SELECT * FROM emi_payments 
                WHERE loan_id = ? ORDER BY due_date DESC LIMIT 3
            )
        """, (loan_id,))
        stats_3m = dict(cursor.fetchone())
        features['delay_count_3m'] = stats_3m['delay_count_3m'] or 0
        
        # Prepayments
        cursor = conn.execute("""
            SELECT COUNT(*) as prepayment_count
            FROM prepayments WHERE loan_id = ?
        """, (loan_id,))
        features['prepayment_count'] = dict(cursor.fetchone())['prepayment_count'] or 0
        
        # BT inquiries
        cursor = conn.execute("""
            SELECT 
                COUNT(*) as bt_inquiry_count,
                MIN(julianday('now') - julianday(inquiry_date)) as days_since_bt,
                MIN(offered_rate) as best_offered_rate
            FROM bt_inquiries
            WHERE loan_id = ?
            AND inquiry_date >= date('now', '-6 months')
        """, (loan_id,))
        bt = dict(cursor.fetchone())
        features['bt_inquiry_count'] = bt['bt_inquiry_count'] or 0
        features['days_since_bt'] = bt['days_since_bt'] or 365
        features['rate_differential'] = (
            features['interest_rate'] - (bt['best_offered_rate'] or features['interest_rate'])
        )
    
    return features

def make_prediction(loan_id: str) -> dict:
    """
    Make a foreclosure prediction for a loan.
    Stores prediction in database and returns result.
    """
    features = get_loan_features_for_prediction(loan_id)
    
    if not features:
        return {'error': f'Loan {loan_id} not found'}
    
    # Calculate risk score with explainability
    risk_result = calculate_risk_score(features)
    probability = risk_result['probability']
    factors = risk_result['factors']
    
    # Calculate time to foreclosure
    ttf = calculate_time_to_foreclosure(probability, features)
    
    # Calculate revenue at risk
    revenue = calculate_revenue_at_risk(features)
    
    # Get risk category
    category = get_risk_category(probability)
    
    # Store prediction
    with get_db() as conn:
        conn.execute("""
            INSERT INTO predictions 
            (loan_id, foreclosure_probability, time_to_foreclosure_days,
             revenue_at_risk, risk_category, model_version, top_factors)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            loan_id, probability, ttf, revenue, category,
            MODEL_VERSION, json.dumps(factors)
        ))
    
    return {
        'loan_id': loan_id,
        'foreclosure_probability': probability,
        'time_to_foreclosure_days': ttf,
        'revenue_at_risk': revenue,
        'risk_category': category,
        'top_factors': factors,
        'model_version': MODEL_VERSION
    }

def batch_predict(loan_ids: list = None) -> list:
    """
    Make predictions for multiple loans.
    If loan_ids is None, predicts for all active loans.
    """
    if loan_ids is None:
        with get_db() as conn:
            cursor = conn.execute(
                "SELECT loan_id FROM loans WHERE status = 'ACTIVE'"
            )
            loan_ids = [row['loan_id'] for row in cursor.fetchall()]
    
    results = []
    for loan_id in loan_ids:
        try:
            result = make_prediction(loan_id)
            results.append(result)
        except Exception as e:
            results.append({'loan_id': loan_id, 'error': str(e)})
    
    return results

if __name__ == "__main__":
    # Test prediction
    import sys
    if len(sys.argv) > 1:
        loan_id = sys.argv[1]
        result = make_prediction(loan_id)
        print(json.dumps(result, indent=2))
    else:
        print("Usage: python predict.py <loan_id>")
