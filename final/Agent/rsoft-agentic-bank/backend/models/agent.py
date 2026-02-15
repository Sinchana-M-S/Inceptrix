"""
Agent Data Models for RSoft Agentic Bank
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
import hashlib
import uuid


class ReputationLevel(str, Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class AgentType(str, Enum):
    CUSTOMER = "customer"
    MANAGER = "manager"
    ADMIN = "admin"
    TRADER = "trader"
    LENDER = "lender"


class AgentAction(BaseModel):
    """Represents a single agent action in history"""
    action_type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: dict = {}
    success: bool = True


class Agent(BaseModel):
    """Core Agent Identity Model"""
    agent_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    agent_type: AgentType = AgentType.CUSTOMER
    wallet_address: str
    code_hash: str  # SHA-256 hash of agent code/config
    
    # KYA Identity Fields
    risk_score: float = Field(default=50.0, ge=0, le=100)
    reputation_level: ReputationLevel = ReputationLevel.BRONZE
    
    # History & Metrics
    behavior_history: List[AgentAction] = []
    transaction_count: int = 0
    successful_loans: int = 0
    failed_loans: int = 0
    total_borrowed: float = 0.0
    total_repaid: float = 0.0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)
    
    # Authentication
    api_key: Optional[str] = None
    is_active: bool = True

    def update_reputation(self):
        """Update reputation level based on risk score"""
        if self.risk_score >= 80:
            self.reputation_level = ReputationLevel.PLATINUM
        elif self.risk_score >= 60:
            self.reputation_level = ReputationLevel.GOLD
        elif self.risk_score >= 40:
            self.reputation_level = ReputationLevel.SILVER
        else:
            self.reputation_level = ReputationLevel.BRONZE

    def add_action(self, action_type: str, details: dict = {}, success: bool = True):
        """Add an action to behavior history"""
        action = AgentAction(
            action_type=action_type,
            details=details,
            success=success
        )
        self.behavior_history.append(action)
        self.last_active = datetime.utcnow()


class AgentRegistration(BaseModel):
    """Request model for agent registration"""
    name: str
    agent_type: AgentType = AgentType.CUSTOMER
    code_hash: str  # Client provides hash of their code
    wallet_address: Optional[str] = None  # Auto-generate if not provided


class AgentLoginRequest(BaseModel):
    """Request model for agent login"""
    agent_id: str
    api_key: str


class AgentResponse(BaseModel):
    """Response model for agent data"""
    agent_id: str
    name: str
    agent_type: AgentType
    wallet_address: str
    risk_score: float
    reputation_level: ReputationLevel
    transaction_count: int
    successful_loans: int
    created_at: datetime
    is_active: bool
