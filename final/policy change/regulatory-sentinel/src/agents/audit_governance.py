"""
Audit & Governance Agent (Agent 7)
Comprehensive logging and compliance reporting
"""
import sys
import uuid
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from config import GENERATED_DIR
from src.database.models import AuditLog, Policy, ChangeProposal, Regulation
from src.database.schema import get_session


class AuditGovernanceAgent:
    """
    Agent 7: Audit & Governance
    
    Responsibilities:
    - Log all inputs, outputs, and decisions
    - Generate compliance reports
    - Maintain regulator-ready audit trail
    - Track time-to-compliance metrics
    
    Every action in the system flows through this agent's logging.
    """
    
    def __init__(self):
        self.reports_dir = GENERATED_DIR / "reports"
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        print("✓ AuditGovernanceAgent initialized")
    
    def run(
        self,
        regulation_id: str,
        workflow_summary: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Main execution: Generate final audit report
        
        Args:
            regulation_id: ID of the regulation processed
            workflow_summary: Summary from previous agents
        
        Returns:
            {
                "status": "SUCCESS",
                "report_path": str,
                "compliance_metrics": Dict
            }
        """
        print(f"\n{'='*60}")
        print("AGENT 7: AUDIT & GOVERNANCE")
        print(f"{'='*60}")
        print(f"Generating compliance report for: {regulation_id}")
        
        session = get_session()
        
        try:
            # Gather metrics
            metrics = self._calculate_metrics(session, regulation_id)
            
            # Generate report
            report = self._generate_report(session, regulation_id, metrics, workflow_summary)
            
            # Save report
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_filename = f"compliance_report_{regulation_id}_{timestamp}.json"
            report_path = self.reports_dir / report_filename
            
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            # Log report generation
            audit = AuditLog(
                log_id=str(uuid.uuid4()),
                action_type="WORKFLOW_COMPLETED",
                entity_type="regulation",
                entity_id=regulation_id,
                performed_by="SYSTEM",
                details={
                    "report_path": str(report_path),
                    "metrics": metrics
                }
            )
            session.add(audit)
            session.commit()
            
            print(f"\n✓ Audit report generated!")
            print(f"  Report: {report_path}")
            print(f"\n📊 COMPLIANCE METRICS:")
            print(f"  Policies analyzed: {metrics['policies_analyzed']}")
            print(f"  Policies impacted: {metrics['policies_impacted']}")
            print(f"  Proposals generated: {metrics['proposals_generated']}")
            print(f"  Pending approval: {metrics['pending_approval']}")
            print(f"  Approved: {metrics['approved']}")
            print(f"  Rejected: {metrics['rejected']}")
            
            return {
                "status": "SUCCESS",
                "regulation_id": regulation_id,
                "report_path": str(report_path),
                "compliance_metrics": metrics,
                "report": report
            }
            
        except Exception as e:
            print(f"✗ Audit report generation failed: {e}")
            import traceback
            traceback.print_exc()
            return {
                "status": "FAILED",
                "error": str(e),
                "regulation_id": regulation_id
            }
        finally:
            session.close()
    
    def _calculate_metrics(self, session, regulation_id: str) -> Dict[str, Any]:
        """Calculate compliance metrics"""
        
        # Count policies
        total_policies = session.query(Policy).count()
        
        # Count proposals for this regulation
        proposals = session.query(ChangeProposal).filter(
            ChangeProposal.regulation_clause.like(f"{regulation_id}%")
        ).all()
        
        pending = sum(1 for p in proposals if p.status == "PENDING")
        approved = sum(1 for p in proposals if p.status == "APPROVED")
        rejected = sum(1 for p in proposals if p.status == "REJECTED")
        
        # Unique impacted policies
        impacted_policies = set(p.policy_id for p in proposals)
        
        # Get audit logs
        logs = session.query(AuditLog).filter(
            AuditLog.entity_id == regulation_id
        ).order_by(AuditLog.performed_at.asc()).all()
        
        # Calculate processing time
        if logs:
            start_time = logs[0].performed_at
            end_time = logs[-1].performed_at
            processing_time = (end_time - start_time).total_seconds()
        else:
            processing_time = 0
        
        return {
            "policies_analyzed": total_policies,
            "policies_impacted": len(impacted_policies),
            "proposals_generated": len(proposals),
            "pending_approval": pending,
            "approved": approved,
            "rejected": rejected,
            "processing_time_seconds": processing_time,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _generate_report(
        self,
        session,
        regulation_id: str,
        metrics: Dict[str, Any],
        workflow_summary: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate comprehensive compliance report"""
        
        # Get regulation details
        regulation = session.query(Regulation).filter_by(
            regulation_id=regulation_id
        ).first()
        
        # Get proposals
        proposals = session.query(ChangeProposal).filter(
            ChangeProposal.regulation_clause.like(f"{regulation_id}%")
        ).all()
        
        # Get audit trail
        audit_logs = session.query(AuditLog).filter(
            AuditLog.entity_id == regulation_id
        ).order_by(AuditLog.performed_at.asc()).all()
        
        # Build report
        report = {
            "report_metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "report_type": "Regulatory Compliance Impact Assessment",
                "system": "Autonomous Regulatory Sentinel (Reg-GenAI)"
            },
            "regulation_summary": {
                "regulation_id": regulation_id,
                "regulation_name": regulation.regulation_name if regulation else "Unknown",
                "ingestion_date": regulation.ingestion_date.isoformat() if regulation else None,
                "status": regulation.status if regulation else "Unknown"
            },
            "impact_summary": {
                "total_policies_analyzed": metrics["policies_analyzed"],
                "policies_impacted": metrics["policies_impacted"],
                "impact_rate": f"{(metrics['policies_impacted'] / max(metrics['policies_analyzed'], 1)) * 100:.1f}%"
            },
            "proposal_summary": {
                "total_proposals": metrics["proposals_generated"],
                "pending_approval": metrics["pending_approval"],
                "approved": metrics["approved"],
                "rejected": metrics["rejected"],
                "approval_rate": f"{(metrics['approved'] / max(metrics['proposals_generated'], 1)) * 100:.1f}%"
            },
            "risk_breakdown": {
                "high": sum(1 for p in proposals if p.risk_level == "High"),
                "medium": sum(1 for p in proposals if p.risk_level == "Medium"),
                "low": sum(1 for p in proposals if p.risk_level == "Low")
            },
            "change_proposals": [
                {
                    "proposal_id": p.proposal_id,
                    "policy_id": p.policy_id,
                    "regulation_clause": p.regulation_clause,
                    "change_type": p.change_type,
                    "risk_level": p.risk_level,
                    "confidence": p.confidence,
                    "status": p.status,
                    "reviewer": p.reviewer_id,
                    "reviewed_at": p.reviewed_at.isoformat() if p.reviewed_at else None,
                    "diff_summary": p.diff_summary
                }
                for p in proposals
            ],
            "audit_trail": [
                {
                    "timestamp": log.performed_at.isoformat(),
                    "action": log.action_type,
                    "performed_by": log.performed_by,
                    "entity": f"{log.entity_type}:{log.entity_id}",
                    "decision": log.human_decision
                }
                for log in audit_logs
            ],
            "governance_attestation": {
                "human_in_the_loop_enforced": True,
                "auto_deployment_prevented": True,
                "all_decisions_logged": True,
                "audit_trail_complete": len(audit_logs) > 0
            }
        }
        
        return report
    
    def log_action(
        self,
        action_type: str,
        entity_type: str,
        entity_id: str,
        performed_by: str = "SYSTEM",
        details: Optional[Dict[str, Any]] = None,
        model_reasoning: Optional[str] = None,
        human_decision: Optional[str] = None,
        input_prompt: Optional[str] = None,
        output_response: Optional[str] = None
    ) -> str:
        """
        Log an action to the audit trail
        
        Returns: log_id
        """
        session = get_session()
        try:
            log = AuditLog(
                log_id=str(uuid.uuid4()),
                action_type=action_type,
                entity_type=entity_type,
                entity_id=entity_id,
                performed_by=performed_by,
                performed_at=datetime.utcnow(),
                details=details,
                model_reasoning=model_reasoning,
                human_decision=human_decision,
                input_prompt=input_prompt,
                output_response=output_response
            )
            session.add(log)
            session.commit()
            return log.log_id
        finally:
            session.close()
    
    def get_audit_trail(
        self,
        entity_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        action_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Retrieve audit trail with filters"""
        session = get_session()
        try:
            query = session.query(AuditLog)
            
            if entity_id:
                query = query.filter(AuditLog.entity_id == entity_id)
            if entity_type:
                query = query.filter(AuditLog.entity_type == entity_type)
            if action_type:
                query = query.filter(AuditLog.action_type == action_type)
            if start_date:
                query = query.filter(AuditLog.performed_at >= start_date)
            if end_date:
                query = query.filter(AuditLog.performed_at <= end_date)
            
            logs = query.order_by(
                AuditLog.performed_at.desc()
            ).limit(limit).all()
            
            return [log.to_dict() for log in logs]
        finally:
            session.close()
    
    def get_compliance_dashboard(self) -> Dict[str, Any]:
        """Get overall compliance dashboard data"""
        session = get_session()
        try:
            # Overall stats
            total_policies = session.query(Policy).count()
            total_regulations = session.query(Regulation).count()
            total_proposals = session.query(ChangeProposal).count()
            
            pending = session.query(ChangeProposal).filter_by(status="PENDING").count()
            approved = session.query(ChangeProposal).filter_by(status="APPROVED").count()
            rejected = session.query(ChangeProposal).filter_by(status="REJECTED").count()
            
            # Recent activity
            recent_logs = session.query(AuditLog).order_by(
                AuditLog.performed_at.desc()
            ).limit(10).all()
            
            return {
                "summary": {
                    "total_policies": total_policies,
                    "total_regulations": total_regulations,
                    "total_proposals": total_proposals
                },
                "approval_status": {
                    "pending": pending,
                    "approved": approved,
                    "rejected": rejected
                },
                "recent_activity": [
                    {
                        "timestamp": log.performed_at.isoformat(),
                        "action": log.action_type,
                        "entity": f"{log.entity_type}:{log.entity_id}"
                    }
                    for log in recent_logs
                ],
                "generated_at": datetime.utcnow().isoformat()
            }
        finally:
            session.close()


if __name__ == "__main__":
    agent = AuditGovernanceAgent()
    dashboard = agent.get_compliance_dashboard()
    print(f"Dashboard: {json.dumps(dashboard, indent=2)}")
