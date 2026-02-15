"""
Data models and ORM-like helpers for NBFC Loan Foreclosure System.
"""
from dataclasses import dataclass, asdict
from typing import Optional, List
from datetime import datetime, date
import json

@dataclass
class Employee:
    employee_id: str
    name: str
    email: str
    password_hash: str
    role: str  # RM, MANAGER, ADMIN
    branch_id: str
    created_at: Optional[datetime] = None

    def to_dict(self, exclude_password=True):
        d = asdict(self)
        if exclude_password:
            del d['password_hash']
        if self.created_at:
            d['created_at'] = self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at
        return d

@dataclass
class Customer:
    customer_id: str
    name: str
    age: Optional[int] = None
    income_band: Optional[str] = None
    employment_type: Optional[str] = None
    credit_score_band: Optional[str] = None
    location_tier: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    assigned_employee_id: Optional[str] = None
    created_at: Optional[datetime] = None

    def to_dict(self, mask_pii=False):
        d = asdict(self)
        if mask_pii and self.phone:
            d['phone'] = '****' + self.phone[-4:] if len(self.phone) >= 4 else '****'
        return d

@dataclass
class Loan:
    loan_id: str
    customer_id: str
    loan_type: str  # HL, PL, LAP, BL, VL, GL
    loan_amount: float
    interest_rate: float
    emi_amount: float
    total_tenure: int
    remaining_tenure: int
    outstanding_principal: float
    disbursement_date: date
    status: str = 'ACTIVE'

    def to_dict(self):
        d = asdict(self)
        if isinstance(self.disbursement_date, date):
            d['disbursement_date'] = self.disbursement_date.isoformat()
        return d

    @property
    def remaining_interest_payable(self) -> float:
        """Calculate remaining interest to be paid."""
        return (self.emi_amount * self.remaining_tenure) - self.outstanding_principal

@dataclass
class EMIPayment:
    payment_id: Optional[int]
    loan_id: str
    due_date: date
    payment_date: Optional[date]
    amount_due: float
    amount_paid: Optional[float]
    delay_days: int = 0
    bounced: bool = False

    def to_dict(self):
        d = asdict(self)
        if isinstance(self.due_date, date):
            d['due_date'] = self.due_date.isoformat()
        if isinstance(self.payment_date, date):
            d['payment_date'] = self.payment_date.isoformat()
        return d

@dataclass
class Prediction:
    prediction_id: Optional[int]
    loan_id: str
    prediction_date: Optional[datetime]
    foreclosure_probability: float
    time_to_foreclosure_days: Optional[int]
    revenue_at_risk: float
    risk_category: str  # LOW, MEDIUM, HIGH
    model_version: str
    top_factors: Optional[str] = None  # JSON string

    def to_dict(self):
        d = asdict(self)
        if self.prediction_date:
            d['prediction_date'] = self.prediction_date.isoformat() if isinstance(self.prediction_date, datetime) else self.prediction_date
        # Parse top_factors from JSON
        if self.top_factors:
            try:
                d['top_factors'] = json.loads(self.top_factors)
            except json.JSONDecodeError:
                d['top_factors'] = []
        return d

@dataclass
class Action:
    action_id: Optional[int]
    loan_id: str
    employee_id: str
    action_type: str  # CALL, OFFER, VISIT, EMAIL, NOTE
    action_date: Optional[datetime]
    notes: Optional[str]
    outcome: str = 'PENDING'  # PENDING, RETAINED, FORECLOSED, NO_RESPONSE

    def to_dict(self):
        d = asdict(self)
        if self.action_date:
            d['action_date'] = self.action_date.isoformat() if isinstance(self.action_date, datetime) else self.action_date
        return d

@dataclass
class RetentionOffer:
    offer_id: Optional[int]
    loan_id: str
    offer_type: str  # RATE_REDUCTION, TENURE_EXTENSION, CROSS_SELL
    offer_value: str
    offered_date: Optional[datetime]
    accepted: Optional[bool]
    employee_id: str

    def to_dict(self):
        d = asdict(self)
        if self.offered_date:
            d['offered_date'] = self.offered_date.isoformat() if isinstance(self.offered_date, datetime) else self.offered_date
        return d

@dataclass
class BTInquiry:
    inquiry_id: Optional[int]
    loan_id: str
    inquiry_date: date
    competitor_bank: Optional[str]
    offered_rate: Optional[float]

    def to_dict(self):
        d = asdict(self)
        if isinstance(self.inquiry_date, date):
            d['inquiry_date'] = self.inquiry_date.isoformat()
        return d

# Loan type display names
LOAN_TYPE_NAMES = {
    'HL': 'Home Loan',
    'PL': 'Personal Loan',
    'LAP': 'Loan Against Property',
    'BL': 'Business Loan',
    'VL': 'Vehicle Loan',
    'GL': 'Gold Loan'
}

# Income band display
INCOME_BANDS = ['0-3L', '3-6L', '6-10L', '10-25L', '25L+']

# Indian states list
INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Chandigarh'
]
