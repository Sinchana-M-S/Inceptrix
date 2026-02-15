"""
FastAPI Main Application
Regulatory Sentinel API Server
"""
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from config import BASE_DIR, GENERATED_DIR
from src.database.schema import init_db, get_policy_count
from src.database.models import Policy, Regulation, ChangeProposal, AuditLog
from src.database.schema import get_session
from src.graph.workflow import run_workflow, RegulatoryWorkflow
from src.agents.policy_generator import PolicyGeneratorAgent
from src.agents.human_approval import HumanApprovalAgent
from src.agents.audit_governance import AuditGovernanceAgent
from src.api.schemas import (
    PolicyResponse, PolicyListResponse,
    RegulationIngest, RegulationResponse,
    ChangeProposalResponse, ApprovalRequest, RejectionRequest, 
    ModificationRequest, ApprovalResponse,
    WorkflowRequest, WorkflowResponse,
    AuditLogResponse, ComplianceDashboardResponse, StatsResponse
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    print("🚀 Starting Regulatory Sentinel API...")
    init_db()
    yield
    print("👋 Shutting down...")


app = FastAPI(
    title="Regulatory Sentinel API",
    description="Autonomous Regulatory Compliance Engine with Human-in-the-Loop Governance",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for frontend
frontend_path = BASE_DIR / "frontend"
if frontend_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")


# ============================================================================
# Root & Health
# ============================================================================

@app.get("/")
async def root():
    """API root"""
    return {
        "name": "Regulatory Sentinel API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "policy_count": get_policy_count()
    }


@app.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Get system statistics"""
    session = get_session()
    try:
        return StatsResponse(
            policy_count=session.query(Policy).count(),
            regulation_count=session.query(Regulation).count(),
            proposal_count=session.query(ChangeProposal).count(),
            pending_approvals=session.query(ChangeProposal).filter_by(status="PENDING").count(),
            approved_count=session.query(ChangeProposal).filter_by(status="APPROVED").count(),
            rejected_count=session.query(ChangeProposal).filter_by(status="REJECTED").count()
        )
    finally:
        session.close()


# ============================================================================
# Policies
# ============================================================================

@app.get("/policies", response_model=PolicyListResponse)
async def list_policies(
    domain: Optional[str] = None,
    risk_level: Optional[str] = None,
    limit: int = Query(default=50, le=500),
    offset: int = 0
):
    """List policies with optional filters"""
    session = get_session()
    try:
        query = session.query(Policy)
        
        if domain:
            query = query.filter(Policy.domain == domain)
        if risk_level:
            query = query.filter(Policy.risk_level == risk_level)
        
        total = query.count()
        policies = query.offset(offset).limit(limit).all()
        
        return PolicyListResponse(
            total=total,
            policies=[PolicyResponse(**p.to_dict()) for p in policies]
        )
    finally:
        session.close()


@app.get("/policies/{policy_id}", response_model=PolicyResponse)
async def get_policy(policy_id: str):
    """Get a specific policy"""
    session = get_session()
    try:
        policy = session.query(Policy).filter_by(policy_id=policy_id).first()
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        return PolicyResponse(**policy.to_dict())
    finally:
        session.close()


@app.post("/policies/generate")
async def generate_policies(count: int = Query(default=100, le=1000)):
    """Generate policies (for bootstrapping)"""
    agent = PolicyGeneratorAgent()
    result = agent.run(target_count=count)
    return result


# ============================================================================
# Regulations
# ============================================================================

@app.get("/regulations")
async def list_regulations():
    """List all ingested regulations"""
    session = get_session()
    try:
        regulations = session.query(Regulation).all()
        return [r.to_dict() for r in regulations]
    finally:
        session.close()


@app.get("/regulations/{regulation_id}", response_model=RegulationResponse)
async def get_regulation(regulation_id: str):
    """Get a specific regulation with clauses"""
    session = get_session()
    try:
        regulation = session.query(Regulation).filter_by(
            regulation_id=regulation_id
        ).first()
        if not regulation:
            raise HTTPException(status_code=404, detail="Regulation not found")
        
        return RegulationResponse(
            regulation_id=regulation.regulation_id,
            regulation_name=regulation.regulation_name,
            source_file=regulation.source_file,
            ingestion_date=regulation.ingestion_date,
            status=regulation.status,
            clause_count=len(regulation.clauses),
            clauses=[{
                "clause_id": c.clause_id,
                "clause_number": c.clause_number,
                "clause_text": c.clause_text,
                "risk_tags": c.risk_tags or []
            } for c in regulation.clauses]
        )
    finally:
        session.close()


@app.post("/regulations/ingest")
async def ingest_regulation(request: RegulationIngest):
    """Ingest a new regulation (text)"""
    from src.agents.regulatory_ingestion import RegulatoryIngestionAgent
    
    agent = RegulatoryIngestionAgent()
    result = agent.run(
        raw_text=request.regulation_text,
        regulation_name=request.regulation_name,
        regulation_id=request.regulation_id
    )
    return result


# ============================================================================
# Workflow
# ============================================================================

@app.post("/workflow/run", response_model=WorkflowResponse)
async def run_full_workflow(request: WorkflowRequest):
    """Run the full regulatory analysis workflow"""
    result = run_workflow(
        regulation_name=request.regulation_name,
        regulation_text=request.regulation_text,
        regulation_id=request.regulation_id
    )
    
    return WorkflowResponse(
        workflow_id=result.get("workflow_id", ""),
        status=result.get("status", "UNKNOWN"),
        regulation_id=result.get("regulation_id", ""),
        policy_count=result.get("policy_count", 0),
        clause_count=result.get("clause_count", 0),
        impacted_policy_count=result.get("impacted_policy_count", 0),
        proposal_count=result.get("proposal_count", 0),
        pending_count=result.get("pending_count", 0),
        error=result.get("error"),
        report_path=result.get("report_path")
    )


# ============================================================================
# Approvals
# ============================================================================

@app.get("/approvals/pending")
async def get_pending_approvals():
    """Get all pending change proposals"""
    agent = HumanApprovalAgent()
    return agent.get_pending_approvals()


@app.get("/approvals/{proposal_id}", response_model=ChangeProposalResponse)
async def get_proposal(proposal_id: str):
    """Get a specific proposal"""
    session = get_session()
    try:
        proposal = session.query(ChangeProposal).filter_by(
            proposal_id=proposal_id
        ).first()
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        # Get policy name while session is open
        policy_name = None
        if proposal.policy_id:
            policy = session.query(Policy).filter_by(policy_id=proposal.policy_id).first()
            policy_name = policy.policy_name if policy else None
        
        return ChangeProposalResponse(
            proposal_id=proposal.proposal_id,
            policy_id=proposal.policy_id,
            policy_name=policy_name,
            regulation_clause=proposal.regulation_clause or "",
            change_type=proposal.change_type or "AMENDMENT",
            diff_summary=proposal.diff_summary or "",
            before_text=proposal.before_text,
            after_proposed_text=proposal.after_proposed_text,
            highlighted_changes=proposal.highlighted_changes,
            confidence=proposal.confidence or 0.0,
            risk_level=proposal.risk_level or "MEDIUM",
            assumptions=proposal.assumptions or [],
            status=proposal.status or "PENDING",
            reviewer_id=proposal.reviewer_id,
            reviewed_at=proposal.reviewed_at,
            review_comments=proposal.review_comments,
            created_at=proposal.created_at
        )
    finally:
        session.close()


@app.post("/approvals/{proposal_id}/approve", response_model=ApprovalResponse)
async def approve_proposal(proposal_id: str, request: ApprovalRequest):
    """Approve a change proposal (human action)"""
    agent = HumanApprovalAgent()
    result = agent.approve(
        proposal_id=proposal_id,
        reviewer_id=request.reviewer_id,
        comments=request.comments
    )
    if result.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=result.get("error", "Approval failed"))
    return ApprovalResponse(**result)


@app.post("/approvals/{proposal_id}/reject", response_model=ApprovalResponse)
async def reject_proposal(proposal_id: str, request: RejectionRequest):
    """Reject a change proposal (human action)"""
    agent = HumanApprovalAgent()
    result = agent.reject(
        proposal_id=proposal_id,
        reviewer_id=request.reviewer_id,
        reason=request.reason
    )
    if result.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=result.get("error", "Rejection failed"))
    return ApprovalResponse(**result)


@app.post("/approvals/{proposal_id}/modify", response_model=ApprovalResponse)
async def request_modification(proposal_id: str, request: ModificationRequest):
    """Request modifications to a proposal (human action)"""
    agent = HumanApprovalAgent()
    result = agent.request_modification(
        proposal_id=proposal_id,
        reviewer_id=request.reviewer_id,
        modification_request=request.modification_request
    )
    if result.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=result.get("error", "Modification request failed"))
    return ApprovalResponse(**result)


# ============================================================================
# Audit
# ============================================================================

@app.get("/audit/trail")
async def get_audit_trail(
    entity_id: Optional[str] = None,
    action_type: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """Get audit trail"""
    agent = AuditGovernanceAgent()
    return agent.get_audit_trail(
        entity_id=entity_id,
        action_type=action_type,
        limit=limit
    )


@app.get("/audit/dashboard", response_model=ComplianceDashboardResponse)
async def get_dashboard():
    """Get compliance dashboard data"""
    agent = AuditGovernanceAgent()
    data = agent.get_compliance_dashboard()
    return ComplianceDashboardResponse(**data)


# ============================================================================
# Reports
# ============================================================================

@app.get("/reports")
async def list_reports():
    """List generated reports"""
    reports_dir = GENERATED_DIR / "reports"
    if not reports_dir.exists():
        return []
    
    reports = []
    for f in reports_dir.glob("*.json"):
        reports.append({
            "filename": f.name,
            "path": str(f),
            "size": f.stat().st_size,
            "created": f.stat().st_ctime
        })
    
    return sorted(reports, key=lambda x: x["created"], reverse=True)


# ============================================================================
# Frontend
# ============================================================================

@app.get("/dashboard")
async def serve_dashboard():
    """Serve the dashboard HTML"""
    index_path = frontend_path / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    raise HTTPException(status_code=404, detail="Dashboard not found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
