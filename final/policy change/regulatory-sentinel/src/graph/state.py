"""
LangGraph State Management
Typed state for the regulatory compliance workflow
"""
from typing import TypedDict, List, Dict, Any, Optional, Annotated
from datetime import datetime


def merge_lists(a: List, b: List) -> List:
    """Merge two lists"""
    return a + b


def replace_value(a: Any, b: Any) -> Any:
    """Replace value - newer value wins"""
    return b if b is not None else a


class WorkflowState(TypedDict, total=False):
    """
    State object passed through the LangGraph workflow
    
    Each agent reads from and writes to this state.
    """
    
    # Workflow metadata
    workflow_id: str
    started_at: str
    current_phase: str
    status: str  # RUNNING, PAUSED, COMPLETED, FAILED
    
    # Policy generation
    policy_count: int
    policy_generation_complete: bool
    policy_domains: List[str]
    
    # Regulation input
    regulation_id: str
    regulation_name: str
    regulation_file: Optional[str]
    regulation_text: Optional[str]
    
    # Ingestion results
    ingestion_complete: bool
    clauses: Annotated[List[Dict[str, Any]], merge_lists]
    clause_count: int
    
    # Impact analysis
    analysis_complete: bool
    impact_analyses: Annotated[List[Dict[str, Any]], merge_lists]
    impacted_policy_count: int
    severity_breakdown: Dict[str, int]
    
    # Diff generation
    diff_complete: bool
    proposals: Annotated[List[Dict[str, Any]], merge_lists]
    proposal_count: int
    
    # Remediation
    remediation_complete: bool
    remediation_proposals: Annotated[List[Dict[str, Any]], merge_lists]
    
    # Human approval
    awaiting_approval: bool
    pending_count: int
    approved_count: int
    rejected_count: int
    
    # Audit
    audit_complete: bool
    report_path: Optional[str]
    compliance_metrics: Dict[str, Any]
    
    # Error handling
    error: Optional[str]
    error_phase: Optional[str]


def create_initial_state(
    regulation_id: str,
    regulation_name: str,
    regulation_file: Optional[str] = None,
    regulation_text: Optional[str] = None
) -> WorkflowState:
    """Create initial workflow state"""
    return WorkflowState(
        workflow_id=f"WF-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        started_at=datetime.utcnow().isoformat(),
        current_phase="INITIALIZATION",
        status="RUNNING",
        
        policy_count=0,
        policy_generation_complete=False,
        policy_domains=[],
        
        regulation_id=regulation_id,
        regulation_name=regulation_name,
        regulation_file=regulation_file,
        regulation_text=regulation_text,
        
        ingestion_complete=False,
        clauses=[],
        clause_count=0,
        
        analysis_complete=False,
        impact_analyses=[],
        impacted_policy_count=0,
        severity_breakdown={},
        
        diff_complete=False,
        proposals=[],
        proposal_count=0,
        
        remediation_complete=False,
        remediation_proposals=[],
        
        awaiting_approval=False,
        pending_count=0,
        approved_count=0,
        rejected_count=0,
        
        audit_complete=False,
        report_path=None,
        compliance_metrics={},
        
        error=None,
        error_phase=None
    )


def update_state(state: WorkflowState, updates: Dict[str, Any]) -> WorkflowState:
    """Update state with new values"""
    new_state = dict(state)
    new_state.update(updates)
    return WorkflowState(**new_state)
