"""
RAG Impact Analysis Agent (Agent 3)
Identifies impacted policies using RAG-based retrieval
"""
import sys
import uuid
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from config import GOOGLE_API_KEY, RAG_TOP_K
from src.database.models import Policy, Clause, ImpactAnalysis, AuditLog
from src.database.schema import get_session
from src.database.vector_store import get_vector_store
from src.services.embedding_service import get_embedding_service
from src.utils.prompts import IMPACT_ANALYSIS_SYSTEM, IMPACT_ANALYSIS_USER

# Try to import Gemini
try:
    import google.generativeai as genai
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


class RAGImpactAgent:
    """
    Agent 3: RAG-Based Impact Analysis
    
    Responsibilities:
    - Embed regulatory clauses
    - Vector search against policy corpus
    - Score impact severity
    - Generate explainability reasoning
    
    Output:
    - Impacted policies ranked by severity
    - Clause-to-policy mapping
    - Reasoning for each impact
    """
    
    def __init__(self):
        self.embedding_service = get_embedding_service()
        self.vector_store = get_vector_store()
        self.use_llm = GENAI_AVAILABLE and bool(GOOGLE_API_KEY)
        
        if self.use_llm:
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        print("✓ RAGImpactAgent initialized")
    
    def run(
        self,
        regulation_id: str,
        clauses: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Main execution: Analyze impact of regulation on policies
        
        Args:
            regulation_id: ID of the ingested regulation
            clauses: Optional list of clauses (if not provided, fetched from DB)
        
        Returns:
            {
                "status": "SUCCESS" | "FAILED",
                "regulation_id": str,
                "total_policies_analyzed": int,
                "impacted_policies": int,
                "impact_analyses": List[Dict]
            }
        """
        print(f"\n{'='*60}")
        print("AGENT 3: RAG IMPACT ANALYSIS")
        print(f"{'='*60}")
        print(f"Regulation: {regulation_id}")
        
        session = get_session()
        
        try:
            # Get clauses if not provided
            if clauses is None:
                db_clauses = session.query(Clause).filter_by(
                    regulation_id=regulation_id
                ).all()
                clauses = [c.to_dict() for c in db_clauses]
            
            if not clauses:
                return {
                    "status": "FAILED",
                    "error": "No clauses found for regulation",
                    "regulation_id": regulation_id,
                    "impacted_policies": 0
                }
            
            print(f"Analyzing {len(clauses)} clauses against policy corpus...")
            
            # Get policy count
            policy_count = self.vector_store.get_policy_count()
            print(f"  Policy corpus size: {policy_count}")
            
            all_impacts = []
            impacted_policy_ids = set()
            
            for clause in clauses:
                clause_id = clause["clause_id"]
                clause_text = clause["clause_text"]
                
                # Generate query embedding
                query_embedding = self.embedding_service.generate_query_embedding(
                    clause_text
                )
                
                # Search similar policies
                matches = self.vector_store.search_policies(
                    query_embedding=query_embedding,
                    top_k=RAG_TOP_K
                )
                
                # Analyze each match
                for match in matches:
                    policy_id = match["policy_id"]
                    similarity = match["similarity_score"]
                    
                    # Get full policy from database
                    policy = session.query(Policy).filter_by(
                        policy_id=policy_id
                    ).first()
                    
                    if not policy:
                        continue
                    
                    # Generate detailed impact analysis
                    impact = self._analyze_impact(
                        clause=clause,
                        policy=policy.to_dict(),
                        similarity_score=similarity,
                        regulation_id=regulation_id
                    )
                    
                    if impact["impact_level"] != "None":
                        # Store in database
                        analysis = ImpactAnalysis(
                            analysis_id=str(uuid.uuid4()),
                            regulation_id=regulation_id,
                            policy_id=policy_id,
                            clause_id=clause_id,
                            impact_score=impact["impact_score"],
                            impact_level=impact["impact_level"],
                            reason=impact["reason"],
                            created_at=datetime.utcnow()
                        )
                        session.add(analysis)
                        
                        all_impacts.append(impact)
                        impacted_policy_ids.add(policy_id)
            
            # Audit log
            audit = AuditLog(
                log_id=str(uuid.uuid4()),
                action_type="IMPACT_ANALYZED",
                entity_type="regulation",
                entity_id=regulation_id,
                performed_by="SYSTEM",
                details={
                    "clauses_analyzed": len(clauses),
                    "policies_analyzed": policy_count,
                    "impacted_policies": len(impacted_policy_ids),
                    "total_impacts": len(all_impacts)
                }
            )
            session.add(audit)
            session.commit()
            
            # Sort impacts by score
            all_impacts.sort(key=lambda x: x["impact_score"], reverse=True)
            
            print(f"\n✓ Impact analysis complete!")
            print(f"  Policies impacted: {len(impacted_policy_ids)}")
            print(f"  Total impacts found: {len(all_impacts)}")
            
            # Severity breakdown
            severity_counts = {"High": 0, "Medium": 0, "Low": 0}
            for impact in all_impacts:
                level = impact["impact_level"]
                if level in severity_counts:
                    severity_counts[level] += 1
            print(f"  Severity: High={severity_counts['High']}, Medium={severity_counts['Medium']}, Low={severity_counts['Low']}")
            
            return {
                "status": "SUCCESS",
                "regulation_id": regulation_id,
                "total_policies_analyzed": policy_count,
                "impacted_policies": len(impacted_policy_ids),
                "impact_analyses": all_impacts,
                "severity_breakdown": severity_counts
            }
            
        except Exception as e:
            session.rollback()
            print(f"✗ Impact analysis failed: {e}")
            return {
                "status": "FAILED",
                "error": str(e),
                "regulation_id": regulation_id,
                "impacted_policies": 0
            }
        finally:
            session.close()
    
    def _analyze_impact(
        self,
        clause: Dict[str, Any],
        policy: Dict[str, Any],
        similarity_score: float,
        regulation_id: str
    ) -> Dict[str, Any]:
        """Analyze impact of a clause on a policy"""
        
        if self.use_llm:
            return self._analyze_with_llm(clause, policy, similarity_score, regulation_id)
        else:
            return self._analyze_heuristic(clause, policy, similarity_score, regulation_id)
    
    def _analyze_with_llm(
        self,
        clause: Dict[str, Any],
        policy: Dict[str, Any],
        similarity_score: float,
        regulation_id: str
    ) -> Dict[str, Any]:
        """Use LLM for detailed impact analysis"""
        try:
            prompt = IMPACT_ANALYSIS_USER.format(
                clause_id=clause["clause_id"],
                regulation_name=regulation_id,
                clause_text=clause["clause_text"][:2000],
                policy_id=policy["policy_id"],
                policy_name=policy["policy_name"],
                domain=policy["domain"],
                policy_text=policy["policy_text"][:3000]
            )
            
            response = self.model.generate_content(
                f"{IMPACT_ANALYSIS_SYSTEM}\n\n{prompt}",
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=1000,
                    temperature=0.3
                )
            )
            
            # Parse JSON response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response.text)
            if json_match:
                result = json.loads(json_match.group())
                return {
                    "policy_id": policy["policy_id"],
                    "policy_name": policy["policy_name"],
                    "clause_id": clause["clause_id"],
                    "clause_number": clause.get("clause_number", ""),
                    "impact_level": result.get("impact_level", "Medium"),
                    "impact_score": float(result.get("impact_score", similarity_score)),
                    "reason": result.get("reason", "Impact detected via semantic similarity"),
                    "affected_sections": result.get("affected_sections", []),
                    "gap_analysis": result.get("gap_analysis", "")
                }
        except Exception as e:
            print(f"  LLM analysis failed for {policy['policy_id']}: {e}")
        
        return self._analyze_heuristic(clause, policy, similarity_score, regulation_id)
    
    def _analyze_heuristic(
        self,
        clause: Dict[str, Any],
        policy: Dict[str, Any],
        similarity_score: float,
        regulation_id: str
    ) -> Dict[str, Any]:
        """Heuristic-based impact analysis"""
        
        # Determine impact level based on similarity and domain match
        clause_tags = clause.get("risk_tags", [])
        policy_domain = policy.get("domain", "")
        
        domain_match = any(
            tag.lower() in policy_domain.lower() or policy_domain.lower() in tag.lower()
            for tag in clause_tags
        ) if clause_tags else False
        
        # Adjust score based on domain match
        adjusted_score = similarity_score
        if domain_match:
            adjusted_score = min(1.0, similarity_score * 1.2)
        
        # Determine impact level
        if adjusted_score >= 0.85:
            impact_level = "High"
        elif adjusted_score >= 0.75:
            impact_level = "Medium"
        elif adjusted_score >= 0.65:
            impact_level = "Low"
        else:
            impact_level = "None"
        
        # Generate reason
        if impact_level != "None":
            reason = f"Policy '{policy['policy_name']}' shows {similarity_score:.0%} semantic similarity with regulatory clause. "
            if domain_match:
                reason += f"Domain match confirmed ({policy_domain}). "
            reason += "Review recommended to ensure compliance."
        else:
            reason = "No significant impact detected."
        
        return {
            "policy_id": policy["policy_id"],
            "policy_name": policy["policy_name"],
            "clause_id": clause["clause_id"],
            "clause_number": clause.get("clause_number", ""),
            "impact_level": impact_level,
            "impact_score": adjusted_score,
            "reason": reason,
            "affected_sections": [],
            "gap_analysis": ""
        }


if __name__ == "__main__":
    # Test requires policies and regulation to be ingested first
    agent = RAGImpactAgent()
    print("RAGImpactAgent ready for use")
