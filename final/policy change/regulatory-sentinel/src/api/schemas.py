"""
Pydantic schemas for API request/response models
"""
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# ============================================================================
# Policy Schemas
# ============================================================================

class PolicyBase(BaseModel):
    policy_name: str
    policy_text: str
    domain: str
    mapped_regulations: List[str] = []
    risk_level: str = "Medium"
    owner_team: str = "Compliance"


class PolicyCreate(PolicyBase):
    pass


class PolicyResponse(PolicyBase):
    policy_id: str
    last_updated: Optional[datetime] = None
    version: str = "v1.0"
    
    class Config:
        from_attributes = True


class PolicyListResponse(BaseModel):
    total: int
    policies: List[PolicyResponse]


# ============================================================================
# Regulation Schemas
# ============================================================================

class RegulationIngest(BaseModel):
    regulation_name: str
    regulation_text: Optional[str] = None
    regulation_id: Optional[str] = None


class ClauseResponse(BaseModel):
    clause_id: str
    clause_number: str
    clause_text: str
    risk_tags: List[str] = []


class RegulationResponse(BaseModel):
    regulation_id: str
    regulation_name: str
    source_file: Optional[str] = None
    ingestion_date: Optional[datetime] = None
    status: str
    clause_count: int = 0
    clauses: List[ClauseResponse] = []


# ============================================================================
# Impact Analysis Schemas
# ============================================================================

class ImpactAnalysisResponse(BaseModel):
    analysis_id: str
    regulation_id: str
    policy_id: str
    clause_id: str
    impact_level: str
    impact_score: float
    reason: str
    created_at: Optional[datetime] = None


# ============================================================================
# Change Proposal Schemas
# ============================================================================

class ChangeProposalResponse(BaseModel):
    proposal_id: str
    policy_id: str
    policy_name: Optional[str] = None
    regulation_clause: str
    change_type: str
    diff_summary: str
    before_text: Optional[str] = None
    after_proposed_text: Optional[str] = None
    highlighted_changes: Optional[Dict[str, List[str]]] = None
    confidence: float
    risk_level: str
    assumptions: List[str] = []
    status: str
    reviewer_id: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_comments: Optional[str] = None
    created_at: Optional[datetime] = None


class ApprovalRequest(BaseModel):
    reviewer_id: str
    comments: Optional[str] = None


class RejectionRequest(BaseModel):
    reviewer_id: str
    reason: str


class ModificationRequest(BaseModel):
    reviewer_id: str
    modification_request: str


class ApprovalResponse(BaseModel):
    status: str
    proposal_id: str
    policy_id: Optional[str] = None
    reviewer: Optional[str] = None
    message: Optional[str] = None
    reason: Optional[str] = None
    error: Optional[str] = None


# ============================================================================
# Workflow Schemas
# ============================================================================

class WorkflowRequest(BaseModel):
    regulation_name: str
    regulation_text: Optional[str] = None
    regulation_id: Optional[str] = None
    skip_policy_generation: bool = False


class WorkflowResponse(BaseModel):
    workflow_id: str
    status: str
    regulation_id: str
    policy_count: int = 0
    clause_count: int = 0
    impacted_policy_count: int = 0
    proposal_count: int = 0
    pending_count: int = 0
    error: Optional[str] = None
    report_path: Optional[str] = None


# ============================================================================
# Audit Schemas
# ============================================================================

class AuditLogResponse(BaseModel):
    log_id: str
    action_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    performed_by: str
    performed_at: Optional[datetime] = None
    details: Optional[Dict[str, Any]] = None
    human_decision: Optional[str] = None


class ComplianceDashboardResponse(BaseModel):
    summary: Dict[str, int]
    approval_status: Dict[str, int]
    recent_activity: List[Dict[str, Any]]
    generated_at: str


# ============================================================================
# Stats Schemas
# ============================================================================

class StatsResponse(BaseModel):
    policy_count: int
    regulation_count: int
    proposal_count: int
    pending_approvals: int
    approved_count: int
    rejected_count: int
