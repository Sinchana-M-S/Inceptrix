-- NBFC Loan Foreclosure Prediction System - Database Schema
-- SQLite compatible

-- Employees Table (RBAC)
CREATE TABLE employees (
    employee_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('RM', 'MANAGER', 'ADMIN')) NOT NULL,
    branch_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    income_band TEXT CHECK(income_band IN ('0-3L', '3-6L', '6-10L', '10-25L', '25L+')),
    employment_type TEXT CHECK(employment_type IN ('SALARIED', 'SELF_EMPLOYED', 'BUSINESS')),
    credit_score_band TEXT CHECK(credit_score_band IN ('300-500', '500-650', '650-750', '750-900')),
    location_tier TEXT CHECK(location_tier IN ('TIER1', 'TIER2', 'TIER3')),
    state TEXT,
    phone TEXT,
    assigned_employee_id TEXT REFERENCES employees(employee_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loans Table
CREATE TABLE loans (
    loan_id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(customer_id),
    loan_type TEXT CHECK(loan_type IN ('HL', 'PL', 'LAP', 'BL', 'VL', 'GL')),
    loan_amount REAL NOT NULL,
    interest_rate REAL NOT NULL,
    emi_amount REAL NOT NULL,
    total_tenure INTEGER NOT NULL,
    remaining_tenure INTEGER NOT NULL,
    outstanding_principal REAL NOT NULL,
    disbursement_date DATE NOT NULL,
    status TEXT CHECK(status IN ('ACTIVE', 'CLOSED', 'FORECLOSED', 'NPA')) DEFAULT 'ACTIVE'
);

-- EMI Payment History (Time-Series)
CREATE TABLE emi_payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id TEXT REFERENCES loans(loan_id),
    due_date DATE NOT NULL,
    payment_date DATE,
    amount_due REAL NOT NULL,
    amount_paid REAL,
    delay_days INTEGER DEFAULT 0,
    bounced BOOLEAN DEFAULT FALSE
);

-- Prepayment History  
CREATE TABLE prepayments (
    prepayment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id TEXT REFERENCES loans(loan_id),
    prepayment_date DATE NOT NULL,
    amount REAL NOT NULL,
    prepayment_type TEXT CHECK(prepayment_type IN ('PART', 'FULL'))
);

-- Balance Transfer Inquiries
CREATE TABLE bt_inquiries (
    inquiry_id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id TEXT REFERENCES loans(loan_id),
    inquiry_date DATE NOT NULL,
    competitor_bank TEXT,
    offered_rate REAL
);

-- Model Predictions
CREATE TABLE predictions (
    prediction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id TEXT REFERENCES loans(loan_id),
    prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    foreclosure_probability REAL NOT NULL,
    time_to_foreclosure_days INTEGER,
    revenue_at_risk REAL NOT NULL,
    risk_category TEXT CHECK(risk_category IN ('LOW', 'MEDIUM', 'HIGH')),
    model_version TEXT NOT NULL,
    top_factors TEXT -- JSON array of SHAP factors
);

-- Employee Actions
CREATE TABLE actions (
    action_id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id TEXT REFERENCES loans(loan_id),
    employee_id TEXT REFERENCES employees(employee_id),
    action_type TEXT CHECK(action_type IN ('CALL', 'OFFER', 'VISIT', 'EMAIL', 'NOTE')),
    action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    outcome TEXT CHECK(outcome IN ('PENDING', 'RETAINED', 'FORECLOSED', 'NO_RESPONSE'))
);

-- Retention Offers
CREATE TABLE retention_offers (
    offer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id TEXT REFERENCES loans(loan_id),
    offer_type TEXT CHECK(offer_type IN ('RATE_REDUCTION', 'TENURE_EXTENSION', 'CROSS_SELL')),
    offer_value TEXT,
    offered_date TIMESTAMP,
    accepted BOOLEAN,
    employee_id TEXT REFERENCES employees(employee_id)
);

-- Audit Log
CREATE TABLE audit_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    employee_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT
);

-- Indexes for performance
CREATE INDEX idx_customers_assigned_employee ON customers(assigned_employee_id);
CREATE INDEX idx_loans_customer ON loans(customer_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_emi_payments_loan ON emi_payments(loan_id);
CREATE INDEX idx_predictions_loan ON predictions(loan_id);
CREATE INDEX idx_actions_loan ON actions(loan_id);
CREATE INDEX idx_actions_employee ON actions(employee_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
