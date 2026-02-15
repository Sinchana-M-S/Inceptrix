"""
Seed data generator for NBFC Loan Foreclosure System.
Generates realistic mock data for testing and demonstration.
"""
import random
import string
from datetime import datetime, timedelta, date
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from database import get_db, init_db
from auth import hash_password

# Configuration
NUM_EMPLOYEES = 8
NUM_CUSTOMERS_PER_RM = 25
MONTHS_HISTORY = 24

# Indian first names and last names
FIRST_NAMES = [
    'Amit', 'Rahul', 'Priya', 'Sunita', 'Rajesh', 'Anita', 'Vikram', 'Neha',
    'Arun', 'Sanjay', 'Pooja', 'Meena', 'Deepak', 'Kavita', 'Suresh', 'Rekha',
    'Manoj', 'Anjali', 'Vivek', 'Shweta', 'Nitin', 'Swati', 'Ashok', 'Geeta',
    'Ravi', 'Smita', 'Vinod', 'Jyoti', 'Prakash', 'Asha', 'Mukesh', 'Seema',
    'Ramesh', 'Kiran', 'Ajay', 'Nisha', 'Pankaj', 'Ritu', 'Sandeep', 'Mamta'
]

LAST_NAMES = [
    'Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Verma', 'Joshi', 'Rao',
    'Desai', 'Mehta', 'Shah', 'Reddy', 'Nair', 'Iyer', 'Menon', 'Pillai',
    'Agarwal', 'Mishra', 'Tiwari', 'Pandey', 'Yadav', 'Chauhan', 'Malhotra',
    'Kapoor', 'Khanna', 'Chopra', 'Bhatia', 'Jain', 'Saxena', 'Bansal'
]

INDIAN_STATES = [
    'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Delhi',
    'Telangana', 'Rajasthan', 'Uttar Pradesh', 'West Bengal', 'Kerala'
]

TIER1_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune']
TIER2_CITIES = ['Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Nagpur', 'Indore', 'Coimbatore']
TIER3_CITIES = ['Nashik', 'Vadodara', 'Agra', 'Varanasi', 'Bhopal', 'Kochi', 'Visakhapatnam']

COMPETITOR_BANKS = ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Yes Bank', 'IndusInd']

def random_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def random_phone():
    return f"9{random.randint(100000000, 999999999)}"

def random_customer_id():
    return f"CUST{random.randint(10000, 99999)}"

def random_loan_id():
    return f"LN{random.randint(100000, 999999)}"

def random_employee_id(prefix="EMP"):
    return f"{prefix}{random.randint(100, 999)}"

def generate_employees():
    """Generate employee data."""
    employees = []
    
    # Create RMs
    for i in range(1, NUM_EMPLOYEES - 1):
        emp = {
            'employee_id': f'EMP{str(i).zfill(3)}',
            'name': random_name(),
            'email': f'rm{i}@nbfc.com',
            'password_hash': hash_password('password123'),
            'role': 'RM',
            'branch_id': f'BR_MUM_{str(i).zfill(3)}'
        }
        employees.append(emp)
    
    # Create Manager
    employees.append({
        'employee_id': 'MGR001',
        'name': random_name(),
        'email': 'manager@nbfc.com',
        'password_hash': hash_password('password123'),
        'role': 'MANAGER',
        'branch_id': 'BR_MUM_001'
    })
    
    # Create Admin
    employees.append({
        'employee_id': 'ADM001',
        'name': random_name(),
        'email': 'admin@nbfc.com',
        'password_hash': hash_password('password123'),
        'role': 'ADMIN',
        'branch_id': 'HEAD_OFFICE'
    })
    
    return employees

def generate_customer_loan_pair(employee_id, loan_types_weights):
    """Generate a customer with associated loan."""
    customer_id = random_customer_id()
    loan_id = random_loan_id()
    
    # Customer demographics
    income_band = random.choices(
        ['0-3L', '3-6L', '6-10L', '10-25L', '25L+'],
        weights=[0.15, 0.25, 0.30, 0.20, 0.10]
    )[0]
    
    location_tier = random.choices(
        ['TIER1', 'TIER2', 'TIER3'],
        weights=[0.4, 0.35, 0.25]
    )[0]
    
    credit_score_band = random.choices(
        ['300-500', '500-650', '650-750', '750-900'],
        weights=[0.05, 0.15, 0.40, 0.40]
    )[0]
    
    customer = {
        'customer_id': customer_id,
        'name': random_name(),
        'age': random.randint(25, 60),
        'income_band': income_band,
        'employment_type': random.choices(
            ['SALARIED', 'SELF_EMPLOYED', 'BUSINESS'],
            weights=[0.55, 0.25, 0.20]
        )[0],
        'credit_score_band': credit_score_band,
        'location_tier': location_tier,
        'state': random.choice(INDIAN_STATES),
        'phone': random_phone(),
        'assigned_employee_id': employee_id
    }
    
    # Loan details based on type
    loan_type = random.choices(
        list(loan_types_weights.keys()),
        weights=list(loan_types_weights.values())
    )[0]
    
    # Loan amount ranges by type (in lakhs)
    loan_ranges = {
        'HL': (30, 150),   # Home Loan
        'PL': (1, 10),     # Personal Loan
        'LAP': (10, 100),  # Loan Against Property
        'BL': (5, 50),     # Business Loan
        'VL': (3, 15),     # Vehicle Loan
        'GL': (0.5, 5)     # Gold Loan
    }
    
    min_amt, max_amt = loan_ranges[loan_type]
    loan_amount = random.randint(int(min_amt * 100000), int(max_amt * 100000))
    
    # Interest rates by loan type
    rate_ranges = {
        'HL': (7.5, 10.5),
        'PL': (10.5, 18.0),
        'LAP': (8.5, 12.0),
        'BL': (11.0, 18.0),
        'VL': (8.5, 12.0),
        'GL': (7.0, 12.0)
    }
    
    min_rate, max_rate = rate_ranges[loan_type]
    interest_rate = round(random.uniform(min_rate, max_rate), 2)
    
    # Tenure by loan type (in months)
    tenure_ranges = {
        'HL': (120, 300),
        'PL': (12, 60),
        'LAP': (60, 180),
        'BL': (12, 84),
        'VL': (12, 84),
        'GL': (6, 36)
    }
    
    min_tenure, max_tenure = tenure_ranges[loan_type]
    total_tenure = random.randint(min_tenure, max_tenure)
    
    # Calculate disbursement date (random in past 2-8 years)
    months_ago = random.randint(24, 96)
    disbursement_date = datetime.now() - timedelta(days=months_ago * 30)
    
    # Calculate remaining tenure
    elapsed_months = min(months_ago, total_tenure - 12)
    remaining_tenure = total_tenure - elapsed_months
    
    # Calculate EMI using loan formula
    monthly_rate = interest_rate / 12 / 100
    emi = loan_amount * monthly_rate * ((1 + monthly_rate) ** total_tenure) / (((1 + monthly_rate) ** total_tenure) - 1)
    emi = round(emi, 2)
    
    # Calculate outstanding principal
    outstanding = loan_amount * (remaining_tenure / total_tenure) * 1.1  # Simplified
    outstanding = min(outstanding, loan_amount)
    
    loan = {
        'loan_id': loan_id,
        'customer_id': customer_id,
        'loan_type': loan_type,
        'loan_amount': loan_amount,
        'interest_rate': interest_rate,
        'emi_amount': emi,
        'total_tenure': total_tenure,
        'remaining_tenure': remaining_tenure,
        'outstanding_principal': round(outstanding, 2),
        'disbursement_date': disbursement_date.strftime('%Y-%m-%d'),
        'status': 'ACTIVE'
    }
    
    return customer, loan

def generate_payment_history(loan, is_high_risk):
    """Generate EMI payment history for a loan."""
    payments = []
    loan_id = loan['loan_id']
    disbursement = datetime.strptime(loan['disbursement_date'], '%Y-%m-%d')
    emi_amount = loan['emi_amount']
    
    elapsed_months = loan['total_tenure'] - loan['remaining_tenure']
    
    for month in range(elapsed_months):
        due_date = disbursement + timedelta(days=30 * (month + 1))
        
        # High risk customers have more delays
        if is_high_risk:
            delay_prob = 0.35
            bounce_prob = 0.15
        else:
            delay_prob = 0.10
            bounce_prob = 0.03
        
        if random.random() < bounce_prob:
            # Bounced payment
            payment = {
                'loan_id': loan_id,
                'due_date': due_date.strftime('%Y-%m-%d'),
                'payment_date': (due_date + timedelta(days=random.randint(10, 30))).strftime('%Y-%m-%d'),
                'amount_due': emi_amount,
                'amount_paid': emi_amount,
                'delay_days': random.randint(10, 30),
                'bounced': True
            }
        elif random.random() < delay_prob:
            # Delayed payment
            delay = random.randint(1, 15)
            payment = {
                'loan_id': loan_id,
                'due_date': due_date.strftime('%Y-%m-%d'),
                'payment_date': (due_date + timedelta(days=delay)).strftime('%Y-%m-%d'),
                'amount_due': emi_amount,
                'amount_paid': emi_amount,
                'delay_days': delay,
                'bounced': False
            }
        else:
            # On-time payment
            payment = {
                'loan_id': loan_id,
                'due_date': due_date.strftime('%Y-%m-%d'),
                'payment_date': due_date.strftime('%Y-%m-%d'),
                'amount_due': emi_amount,
                'amount_paid': emi_amount,
                'delay_days': 0,
                'bounced': False
            }
        
        # Only keep last 24 months
        if month >= elapsed_months - 24:
            payments.append(payment)
    
    return payments

def generate_bt_inquiries(loan, is_high_risk):
    """Generate balance transfer inquiries for high risk loans."""
    inquiries = []
    
    if not is_high_risk:
        # Low risk - maybe 1 inquiry
        if random.random() < 0.15:
            inquiry_date = datetime.now() - timedelta(days=random.randint(30, 180))
            inquiries.append({
                'loan_id': loan['loan_id'],
                'inquiry_date': inquiry_date.strftime('%Y-%m-%d'),
                'competitor_bank': random.choice(COMPETITOR_BANKS),
                'offered_rate': round(loan['interest_rate'] - random.uniform(0.25, 0.75), 2)
            })
    else:
        # High risk - 1-3 inquiries
        num_inquiries = random.randint(1, 3)
        for _ in range(num_inquiries):
            inquiry_date = datetime.now() - timedelta(days=random.randint(7, 90))
            inquiries.append({
                'loan_id': loan['loan_id'],
                'inquiry_date': inquiry_date.strftime('%Y-%m-%d'),
                'competitor_bank': random.choice(COMPETITOR_BANKS),
                'offered_rate': round(loan['interest_rate'] - random.uniform(0.5, 1.5), 2)
            })
    
    return inquiries

def generate_prediction(loan, is_high_risk, customer):
    """Generate a prediction for a loan."""
    loan_id = loan['loan_id']
    
    if is_high_risk:
        prob = round(random.uniform(0.60, 0.95), 2)
        days = random.randint(15, 60)
        category = 'HIGH'
    else:
        prob = round(random.uniform(0.05, 0.45), 2)
        days = random.randint(120, 365) if prob > 0.3 else None
        category = 'MEDIUM' if prob > 0.3 else 'LOW'
    
    # Calculate revenue at risk (remaining interest)
    monthly_rate = loan['interest_rate'] / 12 / 100
    remaining_interest = loan['outstanding_principal'] * monthly_rate * loan['remaining_tenure']
    revenue_at_risk = round(remaining_interest, 2)
    
    # Generate SHAP factors
    base_factors = [
        {'factor': 'balance_transfer_inquiry', 'impact': 0.35, 'direction': 'positive'},
        {'factor': 'remaining_tenure_high', 'impact': 0.22, 'direction': 'positive'},
        {'factor': 'competitor_rate_lower', 'impact': 0.18, 'direction': 'positive'},
        {'factor': 'prepayment_frequency', 'impact': 0.12, 'direction': 'positive'},
        {'factor': 'credit_score_high', 'impact': 0.08, 'direction': 'positive'}
    ]
    
    if is_high_risk:
        factors = random.sample(base_factors, 5)
        for i, f in enumerate(factors):
            f['impact'] = round(0.35 - (i * 0.06) + random.uniform(-0.03, 0.03), 2)
    else:
        factors = random.sample(base_factors, 3)
        for i, f in enumerate(factors):
            f['impact'] = round(0.15 - (i * 0.04) + random.uniform(-0.02, 0.02), 2)
            f['direction'] = 'negative'
    
    prediction = {
        'loan_id': loan_id,
        'prediction_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'foreclosure_probability': prob,
        'time_to_foreclosure_days': days,
        'revenue_at_risk': revenue_at_risk,
        'risk_category': category,
        'model_version': 'v1.0.0',
        'top_factors': json.dumps(factors)
    }
    
    return prediction

def seed_database():
    """Seed the database with test data."""
    print("Initializing database...")
    init_db()
    
    print("Generating seed data...")
    
    # Loan type weights (HL most common for NBFCs)
    loan_types_weights = {
        'HL': 0.35,
        'LAP': 0.25,
        'PL': 0.15,
        'BL': 0.12,
        'VL': 0.08,
        'GL': 0.05
    }
    
    employees = generate_employees()
    all_customers = []
    all_loans = []
    all_payments = []
    all_bt_inquiries = []
    all_predictions = []
    
    # Get RM employees
    rm_employees = [e for e in employees if e['role'] == 'RM']
    
    for emp in rm_employees:
        for _ in range(NUM_CUSTOMERS_PER_RM):
            customer, loan = generate_customer_loan_pair(emp['employee_id'], loan_types_weights)
            
            # 30% high risk
            is_high_risk = random.random() < 0.30
            
            all_customers.append(customer)
            all_loans.append(loan)
            
            # Generate related data
            payments = generate_payment_history(loan, is_high_risk)
            all_payments.extend(payments)
            
            bt_inquiries = generate_bt_inquiries(loan, is_high_risk)
            all_bt_inquiries.extend(bt_inquiries)
            
            prediction = generate_prediction(loan, is_high_risk, customer)
            all_predictions.append(prediction)
    
    # Insert into database
    with get_db() as conn:
        print(f"Inserting {len(employees)} employees...")
        for emp in employees:
            conn.execute("""
                INSERT INTO employees (employee_id, name, email, password_hash, role, branch_id)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (emp['employee_id'], emp['name'], emp['email'], emp['password_hash'], 
                  emp['role'], emp['branch_id']))
        
        print(f"Inserting {len(all_customers)} customers...")
        for cust in all_customers:
            conn.execute("""
                INSERT INTO customers (customer_id, name, age, income_band, employment_type,
                credit_score_band, location_tier, state, phone, assigned_employee_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (cust['customer_id'], cust['name'], cust['age'], cust['income_band'],
                  cust['employment_type'], cust['credit_score_band'], cust['location_tier'],
                  cust['state'], cust['phone'], cust['assigned_employee_id']))
        
        print(f"Inserting {len(all_loans)} loans...")
        for loan in all_loans:
            conn.execute("""
                INSERT INTO loans (loan_id, customer_id, loan_type, loan_amount, interest_rate,
                emi_amount, total_tenure, remaining_tenure, outstanding_principal,
                disbursement_date, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (loan['loan_id'], loan['customer_id'], loan['loan_type'], loan['loan_amount'],
                  loan['interest_rate'], loan['emi_amount'], loan['total_tenure'],
                  loan['remaining_tenure'], loan['outstanding_principal'],
                  loan['disbursement_date'], loan['status']))
        
        print(f"Inserting {len(all_payments)} EMI payments...")
        for pmt in all_payments:
            conn.execute("""
                INSERT INTO emi_payments (loan_id, due_date, payment_date, amount_due,
                amount_paid, delay_days, bounced)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (pmt['loan_id'], pmt['due_date'], pmt['payment_date'], pmt['amount_due'],
                  pmt['amount_paid'], pmt['delay_days'], pmt['bounced']))
        
        print(f"Inserting {len(all_bt_inquiries)} BT inquiries...")
        for bt in all_bt_inquiries:
            conn.execute("""
                INSERT INTO bt_inquiries (loan_id, inquiry_date, competitor_bank, offered_rate)
                VALUES (?, ?, ?, ?)
            """, (bt['loan_id'], bt['inquiry_date'], bt['competitor_bank'], bt['offered_rate']))
        
        print(f"Inserting {len(all_predictions)} predictions...")
        for pred in all_predictions:
            conn.execute("""
                INSERT INTO predictions (loan_id, prediction_date, foreclosure_probability,
                time_to_foreclosure_days, revenue_at_risk, risk_category, model_version, top_factors)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (pred['loan_id'], pred['prediction_date'], pred['foreclosure_probability'],
                  pred['time_to_foreclosure_days'], pred['revenue_at_risk'], pred['risk_category'],
                  pred['model_version'], pred['top_factors']))
    
    print("\n✅ Database seeded successfully!")
    print(f"   - {len(employees)} employees")
    print(f"   - {len(all_customers)} customers")
    print(f"   - {len(all_loans)} loans")
    print(f"   - {len(all_payments)} payment records")
    print(f"   - {len(all_bt_inquiries)} BT inquiries")
    print(f"   - {len(all_predictions)} predictions")
    print("\n📌 Test credentials:")
    print("   RM: rm1@nbfc.com / password123")
    print("   Manager: manager@nbfc.com / password123")
    print("   Admin: admin@nbfc.com / password123")

if __name__ == "__main__":
    seed_database()
