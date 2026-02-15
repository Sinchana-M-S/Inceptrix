"""
Policy Diff Engine Agent (Agent 4)
Generates semantic diffs between current and proposed policy versions
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
from src.database.models import Policy, ImpactAnalysis, ChangeProposal, AuditLog
from src.database.schema import get_session
from src.services.diff_service import get_diff_service
from src.utils.prompts import DIFF_GENERATION_SYSTEM, DIFF_GENERATION_USER
from src.utils.constants import CHANGE_TYPES

# Try to import Gemini
try:
    import google.generativeai as genai
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


class DiffEngineAgent:
    """
    Agent 4: Policy Diff Engine
    
    🔥 CORE DIFFERENTIATOR
    
    Responsibilities:
    - Generate semantic before/after diffs
    - Highlight obligations added/removed
    - Cite regulation clauses for each change
    - Score confidence of proposed changes
    
    🚫 CANNOT apply changes
    🚫 CANNOT bypass human review
    """
    
    def __init__(self):
        self.diff_service = get_diff_service()
        self.use_llm = GENAI_AVAILABLE and bool(GOOGLE_API_KEY)
        
        if self.use_llm:
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        print("✓ DiffEngineAgent initialized")
    
    def run(
        self,
        regulation_id: str,
        impact_analyses: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Main execution: Generate policy diffs for impacted policies
        
        Args:
            regulation_id: ID of the regulation
            impact_analyses: List of impact analysis results (if not provided, fetched from DB)
        
        Returns:
            {
                "status": "SUCCESS" | "FAILED",
                "regulation_id": str,
                "proposals": List[Dict],
                "summary": {high: int, medium: int, low: int}
            }
        """
        print(f"\n{'='*60}")
        print("AGENT 4: POLICY DIFF ENGINE")
        print(f"{'='*60}")
        print(f"Regulation: {regulation_id}")
        
        session = get_session()
        
        try:
            # Get impact analyses if not provided
            if impact_analyses is None:
                db_impacts = session.query(ImpactAnalysis).filter_by(
                    regulation_id=regulation_id
                ).filter(
                    ImpactAnalysis.impact_level != "None"
                ).all()
                
                impact_analyses = []
                for impact in db_impacts:
                    policy = session.query(Policy).filter_by(
                        policy_id=impact.policy_id
                    ).first()
                    
                    if policy:
                        impact_analyses.append({
                            "policy_id": impact.policy_id,
                            "policy_name": policy.policy_name,
                            "policy_text": policy.policy_text,
                            "clause_id": impact.clause_id,
                            "impact_level": impact.impact_level,
                            "impact_score": impact.impact_score,
                            "reason": impact.reason
                        })
            
            if not impact_analyses:
                return {
                    "status": "SUCCESS",
                    "regulation_id": regulation_id,
                    "proposals": [],
                    "message": "No impacted policies require changes"
                }
            
            print(f"Generating diffs for {len(impact_analyses)} impacted policies...")
            
            proposals = []
            
            for impact in impact_analyses:
                # Get clause details
                from src.database.models import Clause
                clause = session.query(Clause).filter_by(
                    clause_id=impact["clause_id"]
                ).first()
                
                clause_text = clause.clause_text if clause else "Clause not found"
                clause_number = clause.clause_number if clause else impact["clause_id"]
                
                # Generate diff proposal
                proposal = self._generate_diff(
                    policy_id=impact["policy_id"],
                    policy_name=impact["policy_name"],
                    policy_text=impact["policy_text"],
                    clause_id=impact["clause_id"],
                    clause_number=clause_number,
                    clause_text=clause_text,
                    regulation_id=regulation_id,
                    impact_level=impact["impact_level"],
                    impact_reason=impact.get("reason", "")
                )
                
                if proposal:
                    # Store in database
                    change_proposal = ChangeProposal(
                        proposal_id=proposal["proposal_id"],
                        policy_id=proposal["policy_id"],
                        regulation_clause=proposal["regulation_clause"],
                        change_type=proposal["change_type"],
                        before_text=proposal["before_text"],
                        after_proposed_text=proposal["after_proposed_text"],
                        diff_summary=proposal["diff_summary"],
                        highlighted_changes=proposal["highlighted_changes"],
                        confidence=proposal["confidence"],
                        risk_level=proposal["risk_level"],
                        assumptions=proposal.get("assumptions", []),
                        status="PENDING",
                        created_at=datetime.utcnow()
                    )
                    session.add(change_proposal)
                    proposals.append(proposal)
            
            # Audit log
            audit = AuditLog(
                log_id=str(uuid.uuid4()),
                action_type="DIFF_GENERATED",
                entity_type="regulation",
                entity_id=regulation_id,
                performed_by="SYSTEM",
                details={
                    "proposals_generated": len(proposals),
                    "policies_affected": len(set(p["policy_id"] for p in proposals))
                }
            )
            session.add(audit)
            session.commit()
            
            # Summary
            summary = {"High": 0, "Medium": 0, "Low": 0}
            for p in proposals:
                level = p.get("risk_level", "Medium")
                if level in summary:
                    summary[level] += 1
            
            print(f"\n✓ Diff generation complete!")
            print(f"  Proposals generated: {len(proposals)}")
            print(f"  Risk breakdown: High={summary['High']}, Medium={summary['Medium']}, Low={summary['Low']}")
            
            return {
                "status": "SUCCESS",
                "regulation_id": regulation_id,
                "proposals": proposals,
                "summary": summary
            }
            
        except Exception as e:
            session.rollback()
            print(f"✗ Diff generation failed: {e}")
            import traceback
            traceback.print_exc()
            return {
                "status": "FAILED",
                "error": str(e),
                "regulation_id": regulation_id,
                "proposals": []
            }
        finally:
            session.close()
    
    def _generate_diff(
        self,
        policy_id: str,
        policy_name: str,
        policy_text: str,
        clause_id: str,
        clause_number: str,
        clause_text: str,
        regulation_id: str,
        impact_level: str,
        impact_reason: str
    ) -> Optional[Dict[str, Any]]:
        """Generate diff proposal for a single policy"""
        
        proposal_id = str(uuid.uuid4())
        
        if self.use_llm:
            result = self._generate_with_llm(
                policy_id, policy_name, policy_text,
                clause_id, clause_number, clause_text,
                regulation_id
            )
        else:
            result = self._generate_template_diff(
                policy_id, policy_name, policy_text,
                clause_id, clause_number, clause_text,
                regulation_id, impact_level
            )
        
        if result:
            result["proposal_id"] = proposal_id
            result["policy_id"] = policy_id
            result["policy_name"] = policy_name
            result["regulation_clause"] = f"{regulation_id} – {clause_number}"
            result["risk_level"] = impact_level
        
        return result
    
    def _generate_with_llm(
        self,
        policy_id: str,
        policy_name: str,
        policy_text: str,
        clause_id: str,
        clause_number: str,
        clause_text: str,
        regulation_id: str
    ) -> Optional[Dict[str, Any]]:
        """Use LLM to generate policy diff"""
        try:
            prompt = DIFF_GENERATION_USER.format(
                clause_id=clause_id,
                regulation_name=regulation_id,
                clause_text=clause_text[:2000],
                policy_id=policy_id,
                policy_name=policy_name,
                before_text=policy_text[:4000]
            )
            
            response = self.model.generate_content(
                f"{DIFF_GENERATION_SYSTEM}\n\n{prompt}",
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=4000,
                    temperature=0.5
                )
            )
            
            # Parse JSON response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response.text)
            if json_match:
                result = json.loads(json_match.group())
                
                # Calculate diff stats
                before = policy_text
                after = result.get("after_proposed_text", policy_text)
                highlighted = self.diff_service.highlight_changes(before, after)
                
                return {
                    "before_text": before[:5000],
                    "after_proposed_text": after[:5000],
                    "diff_summary": result.get("diff_summary", "Policy updated for compliance"),
                    "change_type": result.get("change_type", CHANGE_TYPES[0]),
                    "highlighted_changes": result.get("highlighted_changes", highlighted),
                    "confidence": float(result.get("confidence", 0.8)),
                    "assumptions": result.get("assumptions", [])
                }
                
        except Exception as e:
            print(f"  LLM diff failed for {policy_id}: {e}")
        
        return self._generate_template_diff(
            policy_id, policy_name, policy_text,
            clause_id, clause_number, clause_text,
            regulation_id, "Medium"
        )
    
    def _generate_template_diff(
        self,
        policy_id: str,
        policy_name: str,
        policy_text: str,
        clause_id: str,
        clause_number: str,
        clause_text: str,
        regulation_id: str,
        impact_level: str
    ) -> Dict[str, Any]:
        """Template-based diff generation"""
        
        # Find a good insertion point (after requirements section)
        insertion_point = policy_text.find("5. POLICY REQUIREMENTS")
        if insertion_point == -1:
            insertion_point = policy_text.find("REQUIREMENTS")
        if insertion_point == -1:
            insertion_point = len(policy_text) // 2
        
        # Generate compliance addition
        compliance_addition = f"""

### REGULATORY COMPLIANCE UPDATE
(Added per {regulation_id} - {clause_number})

{clause_text[:500]}

COMPLIANCE REQUIREMENT: The above regulatory clause must be adhered to. Specific controls:
- Periodic review and assessment as required by the regulation
- Documentation of compliance activities
- Reporting to designated compliance officer
- Training for relevant personnel

"""
        
        # Create after text
        after_text = (
            policy_text[:insertion_point] +
            compliance_addition +
            policy_text[insertion_point:]
        )
        
        highlighted = self.diff_service.highlight_changes(policy_text, after_text)
        
        return {
            "before_text": policy_text[:5000],
            "after_proposed_text": after_text[:5000],
            "diff_summary": f"Added compliance section for {regulation_id} - {clause_number}",
            "change_type": "New Mandatory Control",
            "highlighted_changes": highlighted,
            "confidence": 0.75,
            "assumptions": [
                "Existing policy structure is suitable for amendment",
                f"Regulation {regulation_id} applies to this policy domain"
            ]
        }


if __name__ == "__main__":
    agent = DiffEngineAgent()
    print("DiffEngineAgent ready for use")
