"""
Remediation Proposal Agent (Agent 5)
Generates compliant policy update proposals
"""
import sys
import uuid
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from config import GOOGLE_API_KEY
from src.database.models import ChangeProposal, AuditLog
from src.database.schema import get_session
from src.utils.prompts import REMEDIATION_SYSTEM, REMEDIATION_USER

# Try to import Gemini
try:
    import google.generativeai as genai
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


class RemediationAgent:
    """
    Agent 5: Remediation Proposal Generator
    
    Responsibilities:
    - Draft remediation language
    - Assign risk & confidence scores
    - State assumptions explicitly
    - Cite regulatory requirements
    
    Outputs: PROPOSALS ONLY, never final changes
    """
    
    def __init__(self):
        self.use_llm = GENAI_AVAILABLE and bool(GOOGLE_API_KEY)
        
        if self.use_llm:
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        print("✓ RemediationAgent initialized")
    
    def run(
        self,
        regulation_id: str,
        proposals: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Main execution: Enhance proposals with remediation details
        
        Args:
            regulation_id: ID of the regulation
            proposals: List of diff proposals to enhance
        
        Returns:
            {
                "status": "SUCCESS" | "FAILED",
                "regulation_id": str,
                "remediation_proposals": List[Dict],
                "pending_human_review": int
            }
        """
        print(f"\n{'='*60}")
        print("AGENT 5: REMEDIATION PROPOSAL")
        print(f"{'='*60}")
        print(f"Regulation: {regulation_id}")
        
        session = get_session()
        
        try:
            # Get proposals if not provided
            if proposals is None:
                db_proposals = session.query(ChangeProposal).filter_by(
                    status="PENDING"
                ).filter(
                    ChangeProposal.regulation_clause.like(f"{regulation_id}%")
                ).all()
                
                proposals = [p.to_dict() for p in db_proposals]
            
            if not proposals:
                return {
                    "status": "SUCCESS",
                    "regulation_id": regulation_id,
                    "remediation_proposals": [],
                    "message": "No proposals pending remediation"
                }
            
            print(f"Generating remediation details for {len(proposals)} proposals...")
            
            enhanced_proposals = []
            
            for proposal in proposals:
                # Generate remediation details
                remediation = self._generate_remediation(proposal)
                
                # Update proposal in database
                if proposal.get("proposal_id"):
                    db_proposal = session.query(ChangeProposal).filter_by(
                        proposal_id=proposal["proposal_id"]
                    ).first()
                    
                    if db_proposal:
                        db_proposal.assumptions = remediation.get("assumptions", [])
                        db_proposal.risk_level = remediation.get("risk_level", db_proposal.risk_level)
                        db_proposal.confidence = remediation.get("confidence", db_proposal.confidence)
                
                enhanced_proposal = {
                    **proposal,
                    **remediation
                }
                enhanced_proposals.append(enhanced_proposal)
            
            # Audit log
            audit = AuditLog(
                log_id=str(uuid.uuid4()),
                action_type="REMEDIATION_PROPOSED",
                entity_type="regulation",
                entity_id=regulation_id,
                performed_by="SYSTEM",
                details={
                    "proposals_enhanced": len(enhanced_proposals),
                    "pending_review": len([p for p in enhanced_proposals if p.get("status") == "PENDING"])
                }
            )
            session.add(audit)
            session.commit()
            
            print(f"\n✓ Remediation proposals generated!")
            print(f"  Proposals enhanced: {len(enhanced_proposals)}")
            print(f"  Pending human review: {len(enhanced_proposals)}")
            
            return {
                "status": "SUCCESS",
                "regulation_id": regulation_id,
                "remediation_proposals": enhanced_proposals,
                "pending_human_review": len(enhanced_proposals)
            }
            
        except Exception as e:
            session.rollback()
            print(f"✗ Remediation generation failed: {e}")
            return {
                "status": "FAILED",
                "error": str(e),
                "regulation_id": regulation_id,
                "remediation_proposals": []
            }
        finally:
            session.close()
    
    def _generate_remediation(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """Generate remediation details for a proposal"""
        
        if self.use_llm:
            return self._generate_with_llm(proposal)
        else:
            return self._generate_template_remediation(proposal)
    
    def _generate_with_llm(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """Use LLM to generate detailed remediation"""
        try:
            prompt = REMEDIATION_USER.format(
                policy_id=proposal.get("policy_id", "Unknown"),
                policy_name=proposal.get("policy_name", "Unknown Policy"),
                regulation_name=proposal.get("regulation_clause", "").split(" – ")[0],
                clause_id=proposal.get("regulation_clause", ""),
                gap_description=proposal.get("diff_summary", "Compliance gap identified"),
                proposed_diff=proposal.get("after_proposed_text", "")[:2000]
            )
            
            response = self.model.generate_content(
                f"{REMEDIATION_SYSTEM}\n\n{prompt}",
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=1500,
                    temperature=0.4
                )
            )
            
            # Parse JSON
            import re
            json_match = re.search(r'\{[\s\S]*\}', response.text)
            if json_match:
                result = json.loads(json_match.group())
                return {
                    "recommended_action": result.get("recommended_action", proposal.get("diff_summary")),
                    "risk_level": result.get("risk_level", proposal.get("risk_level", "Medium")),
                    "confidence": float(result.get("confidence", proposal.get("confidence", 0.8))),
                    "assumptions": result.get("assumptions", []),
                    "implementation_notes": result.get("implementation_notes", ""),
                    "alternative_approaches": result.get("alternative_approaches", []),
                    "estimated_effort": result.get("estimated_effort", "Medium"),
                    "status": "PENDING"
                }
                
        except Exception as e:
            print(f"  LLM remediation failed: {e}")
        
        return self._generate_template_remediation(proposal)
    
    def _generate_template_remediation(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """Template-based remediation details"""
        
        risk_level = proposal.get("risk_level", "Medium")
        
        # Generate assumptions based on context
        assumptions = [
            f"Policy {proposal.get('policy_id', 'Unknown')} is currently in effect and active",
            "Existing policy structure is suitable for amendment without major restructuring",
            f"The regulation {proposal.get('regulation_clause', 'Unknown')} is applicable to this business unit",
            "Stakeholders have been identified for review and approval"
        ]
        
        # Generate implementation notes
        if risk_level == "High":
            implementation = "Immediate review recommended. Consider expedited approval process."
            effort = "High"
        elif risk_level == "Medium":
            implementation = "Standard review cycle. Include in next compliance update batch."
            effort = "Medium"
        else:
            implementation = "Low priority. Can be addressed in regular policy refresh."
            effort = "Low"
        
        return {
            "recommended_action": proposal.get("diff_summary", "Update policy for regulatory compliance"),
            "risk_level": risk_level,
            "confidence": proposal.get("confidence", 0.75),
            "assumptions": assumptions,
            "implementation_notes": implementation,
            "alternative_approaches": [
                "Create new standalone policy addressing the regulation",
                "Merge requirements into existing related policy",
                "Develop exception process with compensating controls"
            ],
            "estimated_effort": effort,
            "status": "PENDING"
        }


if __name__ == "__main__":
    agent = RemediationAgent()
    print("RemediationAgent ready for use")
