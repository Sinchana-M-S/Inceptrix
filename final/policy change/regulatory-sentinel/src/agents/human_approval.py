"""
Human Approval Gate Agent (Agent 6)
NON-BYPASSABLE approval workflow for policy changes
"""
import sys
import uuid
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from config import APPROVAL_STATUSES
from src.database.models import ChangeProposal, Policy, PolicyVersion, AuditLog
from src.database.schema import get_session


class HumanApprovalAgent:
    """
    Agent 6: Human Approval Gate
    
    🚫 NON-BYPASSABLE NODE
    🚫 No graph edge exists that skips this agent
    
    Responsibilities:
    - Route proposals to human reviewers
    - Capture decisions (Approve/Request Change/Reject)
    - Log audit trail for every action
    - Apply approved changes (only after human approval)
    
    This agent does NOT auto-approve anything.
    """
    
    def __init__(self):
        print("✓ HumanApprovalAgent initialized")
        print("  ⚠ All changes require explicit human approval")
    
    def run(
        self,
        regulation_id: str,
        proposals: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Main execution: Queue proposals for human review
        
        NOTE: This method only QUEUES proposals. It does NOT auto-approve.
        
        Returns:
            {
                "status": "AWAITING_APPROVAL",
                "pending_count": int,
                "proposals": List[Dict]
            }
        """
        print(f"\n{'='*60}")
        print("AGENT 6: HUMAN APPROVAL GATE")
        print(f"{'='*60}")
        print("⚠ NO AUTO-APPROVAL - ALL CHANGES REQUIRE HUMAN REVIEW")
        
        session = get_session()
        
        try:
            if proposals is None:
                proposals = session.query(ChangeProposal).filter_by(
                    status="PENDING"
                ).all()
                proposals = [p.to_dict() for p in proposals]
            
            print(f"\nPending proposals for review: {len(proposals)}")
            
            if not proposals:
                return {
                    "status": "NO_PENDING_APPROVALS",
                    "pending_count": 0,
                    "message": "No proposals awaiting human review"
                }
            
            # Group by risk level for prioritization
            by_risk = {"High": [], "Medium": [], "Low": []}
            for p in proposals:
                risk = p.get("risk_level", "Medium")
                if risk in by_risk:
                    by_risk[risk].append(p)
                else:
                    by_risk["Medium"].append(p)
            
            print("\n📋 APPROVAL QUEUE:")
            print(f"  🔴 High Risk: {len(by_risk['High'])} proposals")
            print(f"  🟡 Medium Risk: {len(by_risk['Medium'])} proposals")
            print(f"  🟢 Low Risk: {len(by_risk['Low'])} proposals")
            
            # Audit - log that proposals are awaiting review
            audit = AuditLog(
                log_id=str(uuid.uuid4()),
                action_type="HUMAN_REVIEW_REQUESTED",
                entity_type="regulation",
                entity_id=regulation_id,
                performed_by="SYSTEM",
                details={
                    "total_pending": len(proposals),
                    "high_risk": len(by_risk["High"]),
                    "medium_risk": len(by_risk["Medium"]),
                    "low_risk": len(by_risk["Low"])
                }
            )
            session.add(audit)
            session.commit()
            
            return {
                "status": "AWAITING_APPROVAL",
                "pending_count": len(proposals),
                "proposals_by_risk": {
                    "high": len(by_risk["High"]),
                    "medium": len(by_risk["Medium"]),
                    "low": len(by_risk["Low"])
                },
                "proposals": proposals,
                "message": "Proposals queued for human review. Use approve/reject methods to process."
            }
            
        finally:
            session.close()
    
    def approve(
        self,
        proposal_id: str,
        reviewer_id: str,
        comments: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Approve a proposal and apply changes
        
        ONLY CALLED BY HUMAN ACTION (API endpoint)
        """
        session = get_session()
        
        try:
            proposal = session.query(ChangeProposal).filter_by(
                proposal_id=proposal_id
            ).first()
            
            if not proposal:
                return {"status": "ERROR", "error": "Proposal not found"}
            
            if proposal.status != "PENDING":
                return {"status": "ERROR", "error": f"Proposal already {proposal.status}"}
            
            # Update proposal status
            proposal.status = "APPROVED"
            proposal.reviewer_id = reviewer_id
            proposal.reviewed_at = datetime.utcnow()
            proposal.review_comments = comments
            
            # Apply changes to policy
            policy = session.query(Policy).filter_by(
                policy_id=proposal.policy_id
            ).first()
            
            if policy:
                new_text = (
                    proposal.after_proposed_text
                    or proposal.before_text
                    or policy.policy_text
                    or ""
                )
                version_number = self._increment_version(policy.version)
                version = PolicyVersion(
                    version_id=str(uuid.uuid4()),
                    policy_id=policy.policy_id,
                    version_number=version_number,
                    policy_text=policy.policy_text or "",
                    changed_by=reviewer_id,
                    change_reason=f"Approved: {proposal.regulation_clause}",
                    proposal_id=proposal_id,
                    created_at=datetime.utcnow()
                )
                session.add(version)
                policy.policy_text = new_text
                policy.version = version_number
                policy.last_updated = datetime.utcnow()
            
            # Audit log
            audit = AuditLog(
                log_id=str(uuid.uuid4()),
                action_type="PROPOSAL_APPROVED",
                entity_type="proposal",
                entity_id=proposal_id,
                performed_by=reviewer_id,
                details={
                    "policy_id": proposal.policy_id,
                    "regulation_clause": proposal.regulation_clause,
                    "comments": comments
                },
                human_decision="APPROVE"
            )
            session.add(audit)
            session.commit()
            
            return {
                "status": "APPROVED",
                "proposal_id": proposal_id,
                "policy_id": proposal.policy_id,
                "reviewer": reviewer_id,
                "message": "Policy updated successfully"
            }
            
        except Exception as e:
            session.rollback()
            return {"status": "ERROR", "error": str(e)}
        finally:
            session.close()
    
    def reject(
        self,
        proposal_id: str,
        reviewer_id: str,
        reason: str
    ) -> Dict[str, Any]:
        """
        Reject a proposal
        
        ONLY CALLED BY HUMAN ACTION (API endpoint)
        """
        session = get_session()
        
        try:
            proposal = session.query(ChangeProposal).filter_by(
                proposal_id=proposal_id
            ).first()
            
            if not proposal:
                return {"status": "ERROR", "error": "Proposal not found"}
            
            if proposal.status != "PENDING":
                return {"status": "ERROR", "error": f"Proposal already {proposal.status}"}
            
            # Update status
            proposal.status = "REJECTED"
            proposal.reviewer_id = reviewer_id
            proposal.reviewed_at = datetime.utcnow()
            proposal.review_comments = reason
            
            # Audit log
            audit = AuditLog(
                log_id=str(uuid.uuid4()),
                action_type="PROPOSAL_REJECTED",
                entity_type="proposal",
                entity_id=proposal_id,
                performed_by=reviewer_id,
                details={
                    "policy_id": proposal.policy_id,
                    "regulation_clause": proposal.regulation_clause,
                    "rejection_reason": reason
                },
                human_decision="REJECT"
            )
            session.add(audit)
            session.commit()
            
            return {
                "status": "REJECTED",
                "proposal_id": proposal_id,
                "policy_id": proposal.policy_id,
                "reviewer": reviewer_id,
                "reason": reason
            }
            
        except Exception as e:
            session.rollback()
            return {"status": "ERROR", "error": str(e)}
        finally:
            session.close()
    
    def request_modification(
        self,
        proposal_id: str,
        reviewer_id: str,
        modification_request: str
    ) -> Dict[str, Any]:
        """
        Request modifications to a proposal
        
        ONLY CALLED BY HUMAN ACTION (API endpoint)
        """
        session = get_session()
        
        try:
            proposal = session.query(ChangeProposal).filter_by(
                proposal_id=proposal_id
            ).first()
            
            if not proposal:
                return {"status": "ERROR", "error": "Proposal not found"}
            
            # Update status
            proposal.status = "MODIFIED"
            proposal.reviewer_id = reviewer_id
            proposal.reviewed_at = datetime.utcnow()
            proposal.review_comments = modification_request
            
            # Audit log
            audit = AuditLog(
                log_id=str(uuid.uuid4()),
                action_type="PROPOSAL_MODIFIED",
                entity_type="proposal",
                entity_id=proposal_id,
                performed_by=reviewer_id,
                details={
                    "policy_id": proposal.policy_id,
                    "modification_request": modification_request
                },
                human_decision="MODIFY"
            )
            session.add(audit)
            session.commit()
            
            return {
                "status": "MODIFICATION_REQUESTED",
                "proposal_id": proposal_id,
                "policy_id": proposal.policy_id,
                "reviewer": reviewer_id,
                "modification_request": modification_request
            }
            
        except Exception as e:
            session.rollback()
            return {"status": "ERROR", "error": str(e)}
        finally:
            session.close()
    
    def get_pending_approvals(self) -> List[Dict[str, Any]]:
        """Get all pending approvals"""
        session = get_session()
        try:
            proposals = session.query(ChangeProposal).filter_by(
                status="PENDING"
            ).order_by(
                ChangeProposal.created_at.desc()
            ).all()
            return [p.to_dict() for p in proposals]
        finally:
            session.close()
    
    def _increment_version(self, current: str) -> str:
        """Increment version number"""
        try:
            if current.startswith("v"):
                parts = current[1:].split(".")
                major = int(parts[0])
                minor = int(parts[1]) if len(parts) > 1 else 0
                return f"v{major}.{minor + 1}"
        except:
            pass
        return "v1.0"


if __name__ == "__main__":
    agent = HumanApprovalAgent()
    print("HumanApprovalAgent ready - all changes require human review")
