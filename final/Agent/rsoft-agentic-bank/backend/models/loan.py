"""
Loan Data Models for RSoft Agentic Bank
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class LoanStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ACTIVE = "active"
    REPAID = "repaid"
    DEFAULTED = "defaulted"
    LIQUIDATED = "liquidated"


class Loan(BaseModel):
    """Core Loan Model"""
    loan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_id: str
    
    # Loan Details
    amount: float
    interest_rate: float  # Annual percentage
    duration_days: int = 30
    collateral_amount: float = 0.0
    
    # Status
    status: LoanStatus = LoanStatus.PENDING
    risk_score_at_request: float = 0.0
    
    # Repayment
    amount_repaid: float = 0.0
    repayment_deadline: Optional[datetime] = None
    
    # Timestamps
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Risk Evaluation
    risk_evaluation: dict = {}

    @property
    def total_due(self) -> float:
        """Calculate total amount due including interest"""
        interest = self.amount * (self.interest_rate / 100) * (self.duration_days / 365)
        return self.amount + interest

    @property
    def remaining_amount(self) -> float:
        """Calculate remaining amount to repay"""
        return max(0, self.total_due - self.amount_repaid)

    @property
    def is_overdue(self) -> bool:
        """Check if loan is overdue"""
        if self.status != LoanStatus.ACTIVE or not self.repayment_deadline:
            return False
        return datetime.utcnow() > self.repayment_deadline


class LoanRequest(BaseModel):
    """Request model for loan application"""
    agent_id: str
    amount: float = Field(gt=0)
    duration_days: int = Field(default=30, ge=1, le=365)
    collateral_amount: float = Field(default=0.0, ge=0)


class LoanRepayment(BaseModel):
    """Request model for loan repayment"""
    loan_id: str
    amount: float = Field(gt=0)


class LoanResponse(BaseModel):
    """Response model for loan data"""
    loan_id: str
    agent_id: str
    amount: float
    interest_rate: float
    status: LoanStatus
    risk_score_at_request: float
    total_due: float
    amount_repaid: float
    remaining_amount: float
    requested_at: datetime
    repayment_deadline: Optional[datetime]
