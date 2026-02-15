"""
Orchestrator Agent (Agent 0)
Controls LangGraph execution flow and enforces phase ordering
"""
import sys
from pathlib import Path
from typing import Dict, Any, Optional

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from config import MIN_POLICY_COUNT
from src.database.schema import get_policy_count


class OrchestratorAgent:
    """
    Agent 0: Graph Controller
    
    Responsibilities:
    - Control execution order
    - Enforce mandatory phases
    - Block unsafe transitions
    
    HARD RULE: Cannot proceed to regulatory analysis until policies >= 1000
    """
    
    def __init__(self):
        self.current_phase = None
        self.phases_completed = set()
        print("✓ OrchestratorAgent initialized")
    
    def check_prerequisites(self, phase: str) -> Dict[str, Any]:
        """
        Check if prerequisites for a phase are met
        
        Returns:
            {
                "can_proceed": bool,
                "phase": str,
                "message": str,
                "blocking_reason": str or None
            }
        """
        phase_checks = {
            "POLICY_GENERATION": self._check_policy_generation,
            "REGULATORY_INGESTION": self._check_regulatory_ingestion,
            "RAG_ANALYSIS": self._check_rag_analysis,
            "DIFF_GENERATION": self._check_diff_generation,
            "REMEDIATION": self._check_remediation,
            "HUMAN_APPROVAL": self._check_human_approval,
            "AUDIT": self._check_audit
        }
        
        if phase in phase_checks:
            return phase_checks[phase]()
        
        return {
            "can_proceed": True,
            "phase": phase,
            "message": "Phase not found in checklist, proceeding"
        }
    
    def _check_policy_generation(self) -> Dict[str, Any]:
        """Policy generation can always start"""
        return {
            "can_proceed": True,
            "phase": "POLICY_GENERATION",
            "message": "Policy generation can proceed"
        }
    
    def _check_regulatory_ingestion(self) -> Dict[str, Any]:
        """Regulatory ingestion requires minimum policies"""
        policy_count = get_policy_count()
        
        if policy_count < MIN_POLICY_COUNT:
            return {
                "can_proceed": False,
                "phase": "REGULATORY_INGESTION",
                "message": f"Blocking: Policy count ({policy_count}) < minimum ({MIN_POLICY_COUNT})",
                "blocking_reason": "INSUFFICIENT_POLICIES",
                "current_count": policy_count,
                "required_count": MIN_POLICY_COUNT
            }
        
        return {
            "can_proceed": True,
            "phase": "REGULATORY_INGESTION",
            "message": f"Policy count ({policy_count}) meets requirement"
        }
    
    def _check_rag_analysis(self) -> Dict[str, Any]:
        """RAG analysis requires regulatory ingestion"""
        prereq = self._check_regulatory_ingestion()
        if not prereq["can_proceed"]:
            return prereq
        
        return {
            "can_proceed": True,
            "phase": "RAG_ANALYSIS",
            "message": "RAG analysis can proceed"
        }
    
    def _check_diff_generation(self) -> Dict[str, Any]:
        """Diff generation requires RAG analysis"""
        prereq = self._check_rag_analysis()
        if not prereq["can_proceed"]:
            return prereq
        
        return {
            "can_proceed": True,
            "phase": "DIFF_GENERATION",
            "message": "Diff generation can proceed"
        }
    
    def _check_remediation(self) -> Dict[str, Any]:
        """Remediation requires diff generation"""
        prereq = self._check_diff_generation()
        if not prereq["can_proceed"]:
            return prereq
        
        return {
            "can_proceed": True,
            "phase": "REMEDIATION",
            "message": "Remediation can proceed"
        }
    
    def _check_human_approval(self) -> Dict[str, Any]:
        """Human approval requires remediation proposals"""
        prereq = self._check_remediation()
        if not prereq["can_proceed"]:
            return prereq
        
        return {
            "can_proceed": True,
            "phase": "HUMAN_APPROVAL",
            "message": "Human approval gate ready"
        }
    
    def _check_audit(self) -> Dict[str, Any]:
        """Audit can run at any time after human approval"""
        return {
            "can_proceed": True,
            "phase": "AUDIT",
            "message": "Audit can proceed"
        }
    
    def mark_phase_complete(self, phase: str):
        """Mark a phase as completed"""
        self.phases_completed.add(phase)
        self.current_phase = None
    
    def set_current_phase(self, phase: str):
        """Set the current active phase"""
        self.current_phase = phase
    
    def get_status(self) -> Dict[str, Any]:
        """Get orchestrator status"""
        return {
            "current_phase": self.current_phase,
            "completed_phases": list(self.phases_completed),
            "policy_count": get_policy_count(),
            "min_policy_requirement": MIN_POLICY_COUNT
        }


if __name__ == "__main__":
    orch = OrchestratorAgent()
    print(f"Status: {orch.get_status()}")
    
    # Check prerequisites for each phase
    for phase in ["POLICY_GENERATION", "REGULATORY_INGESTION", "RAG_ANALYSIS"]:
        result = orch.check_prerequisites(phase)
        print(f"{phase}: {result}")
