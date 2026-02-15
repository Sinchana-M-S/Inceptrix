"""
LangGraph Workflow Definition
Multi-agent regulatory compliance processing pipeline
"""
import sys
import uuid
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Literal

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from config import MIN_POLICY_COUNT
from src.graph.state import WorkflowState, create_initial_state, update_state
from src.database.schema import get_policy_count, init_db

# Import all agents
from src.agents.orchestrator import OrchestratorAgent
from src.agents.policy_generator import PolicyGeneratorAgent
from src.agents.regulatory_ingestion import RegulatoryIngestionAgent
from src.agents.rag_impact import RAGImpactAgent
from src.agents.diff_engine import DiffEngineAgent
from src.agents.remediation import RemediationAgent
from src.agents.human_approval import HumanApprovalAgent
from src.agents.audit_governance import AuditGovernanceAgent


class RegulatoryWorkflow:
    """
    LangGraph-style workflow for regulatory compliance processing
    
    Flow:
    START → Policy Generator → Regulatory Ingestion → RAG Analysis → 
    Diff Engine → Remediation → Human Approval Gate → Audit → END
    
    Conditional edges:
    - Policy Generator → loops until count >= 1000
    - Human Approval Gate → blocks until all reviewed
    """
    
    def __init__(self):
        # Initialize all agents
        self.orchestrator = OrchestratorAgent()
        self.policy_generator = PolicyGeneratorAgent()
        self.regulatory_ingestion = RegulatoryIngestionAgent()
        self.rag_impact = RAGImpactAgent()
        self.diff_engine = DiffEngineAgent()
        self.remediation = RemediationAgent()
        self.human_approval = HumanApprovalAgent()
        self.audit_governance = AuditGovernanceAgent()
        
        print("\n" + "="*60)
        print("REGULATORY SENTINEL WORKFLOW INITIALIZED")
        print("="*60)
    
    def run(
        self,
        regulation_id: str,
        regulation_name: str,
        regulation_file: str = None,
        regulation_text: str = None,
        skip_policy_generation: bool = False
    ) -> WorkflowState:
        """
        Execute the full workflow
        
        Args:
            regulation_id: ID for the regulation
            regulation_name: Human-readable name
            regulation_file: Path to PDF/text file (optional)
            regulation_text: Raw regulation text (optional)
            skip_policy_generation: Skip if policies already exist
        
        Returns:
            Final workflow state
        """
        # Initialize database
        init_db()
        
        # Create initial state
        state = create_initial_state(
            regulation_id=regulation_id,
            regulation_name=regulation_name,
            regulation_file=regulation_file,
            regulation_text=regulation_text
        )
        
        print(f"\nWorkflow ID: {state['workflow_id']}")
        print(f"Regulation: {regulation_name}")
        
        try:
            # Phase 1: Policy Generation
            if not skip_policy_generation:
                state = self._run_policy_generation(state)
                if state.get("error"):
                    return state
            else:
                policy_count = get_policy_count()
                state = update_state(state, {
                    "policy_count": policy_count,
                    "policy_generation_complete": policy_count >= MIN_POLICY_COUNT
                })
            
            # Check policy requirement
            check = self.orchestrator.check_prerequisites("REGULATORY_INGESTION")
            if not check["can_proceed"]:
                return update_state(state, {
                    "status": "BLOCKED",
                    "error": check["message"],
                    "error_phase": "POLICY_GENERATION"
                })
            
            # Phase 2: Regulatory Ingestion
            state = self._run_regulatory_ingestion(state)
            if state.get("error"):
                return state
            
            # Phase 3: RAG Impact Analysis
            state = self._run_rag_analysis(state)
            if state.get("error"):
                return state
            
            # Phase 4: Diff Generation
            state = self._run_diff_generation(state)
            if state.get("error"):
                return state
            
            # Phase 5: Remediation
            state = self._run_remediation(state)
            if state.get("error"):
                return state
            
            # Phase 6: Human Approval Gate
            state = self._run_human_approval(state)
            # Note: This phase flags proposals for review, doesn't auto-approve
            
            # Phase 7: Audit
            state = self._run_audit(state)
            
            # Mark complete
            state = update_state(state, {
                "status": "AWAITING_HUMAN_REVIEW",
                "current_phase": "HUMAN_APPROVAL"
            })
            
            return state
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return update_state(state, {
                "status": "FAILED",
                "error": str(e),
                "error_phase": state.get("current_phase", "UNKNOWN")
            })
    
    def _run_policy_generation(self, state: WorkflowState) -> WorkflowState:
        """Run policy generation phase"""
        state = update_state(state, {"current_phase": "POLICY_GENERATION"})
        self.orchestrator.set_current_phase("POLICY_GENERATION")
        
        result = self.policy_generator.run(target_count=MIN_POLICY_COUNT)
        
        if result["status"] == "FAILED":
            return update_state(state, {
                "error": result.get("error", "Policy generation failed"),
                "error_phase": "POLICY_GENERATION"
            })
        
        self.orchestrator.mark_phase_complete("POLICY_GENERATION")
        
        return update_state(state, {
            "policy_count": result["record_count"],
            "policy_generation_complete": True,
            "policy_domains": result.get("domains_covered", [])
        })
    
    def _run_regulatory_ingestion(self, state: WorkflowState) -> WorkflowState:
        """Run regulatory ingestion phase"""
        state = update_state(state, {"current_phase": "REGULATORY_INGESTION"})
        self.orchestrator.set_current_phase("REGULATORY_INGESTION")
        
        result = self.regulatory_ingestion.run(
            file_path=state.get("regulation_file"),
            raw_text=state.get("regulation_text"),
            regulation_name=state["regulation_name"],
            regulation_id=state["regulation_id"]
        )
        
        if result["status"] == "FAILED":
            return update_state(state, {
                "error": result.get("error", "Regulatory ingestion failed"),
                "error_phase": "REGULATORY_INGESTION"
            })
        
        self.orchestrator.mark_phase_complete("REGULATORY_INGESTION")
        
        return update_state(state, {
            "ingestion_complete": True,
            "clauses": result.get("clauses", []),
            "clause_count": result.get("clause_count", 0)
        })
    
    def _run_rag_analysis(self, state: WorkflowState) -> WorkflowState:
        """Run RAG impact analysis phase"""
        state = update_state(state, {"current_phase": "RAG_ANALYSIS"})
        self.orchestrator.set_current_phase("RAG_ANALYSIS")
        
        result = self.rag_impact.run(
            regulation_id=state["regulation_id"],
            clauses=state.get("clauses")
        )
        
        if result["status"] == "FAILED":
            return update_state(state, {
                "error": result.get("error", "RAG analysis failed"),
                "error_phase": "RAG_ANALYSIS"
            })
        
        self.orchestrator.mark_phase_complete("RAG_ANALYSIS")
        
        return update_state(state, {
            "analysis_complete": True,
            "impact_analyses": result.get("impact_analyses", []),
            "impacted_policy_count": result.get("impacted_policies", 0),
            "severity_breakdown": result.get("severity_breakdown", {})
        })
    
    def _run_diff_generation(self, state: WorkflowState) -> WorkflowState:
        """Run diff generation phase"""
        state = update_state(state, {"current_phase": "DIFF_GENERATION"})
        self.orchestrator.set_current_phase("DIFF_GENERATION")
        
        result = self.diff_engine.run(
            regulation_id=state["regulation_id"],
            impact_analyses=state.get("impact_analyses")
        )
        
        if result["status"] == "FAILED":
            return update_state(state, {
                "error": result.get("error", "Diff generation failed"),
                "error_phase": "DIFF_GENERATION"
            })
        
        self.orchestrator.mark_phase_complete("DIFF_GENERATION")
        
        return update_state(state, {
            "diff_complete": True,
            "proposals": result.get("proposals", []),
            "proposal_count": len(result.get("proposals", []))
        })
    
    def _run_remediation(self, state: WorkflowState) -> WorkflowState:
        """Run remediation phase"""
        state = update_state(state, {"current_phase": "REMEDIATION"})
        self.orchestrator.set_current_phase("REMEDIATION")
        
        result = self.remediation.run(
            regulation_id=state["regulation_id"],
            proposals=state.get("proposals")
        )
        
        if result["status"] == "FAILED":
            return update_state(state, {
                "error": result.get("error", "Remediation failed"),
                "error_phase": "REMEDIATION"
            })
        
        self.orchestrator.mark_phase_complete("REMEDIATION")
        
        return update_state(state, {
            "remediation_complete": True,
            "remediation_proposals": result.get("remediation_proposals", [])
        })
    
    def _run_human_approval(self, state: WorkflowState) -> WorkflowState:
        """Run human approval gate (queues for review, does NOT auto-approve)"""
        state = update_state(state, {"current_phase": "HUMAN_APPROVAL"})
        self.orchestrator.set_current_phase("HUMAN_APPROVAL")
        
        result = self.human_approval.run(
            regulation_id=state["regulation_id"],
            proposals=state.get("remediation_proposals")
        )
        
        return update_state(state, {
            "awaiting_approval": True,
            "pending_count": result.get("pending_count", 0)
        })
    
    def _run_audit(self, state: WorkflowState) -> WorkflowState:
        """Run audit phase"""
        state = update_state(state, {"current_phase": "AUDIT"})
        self.orchestrator.set_current_phase("AUDIT")
        
        result = self.audit_governance.run(
            regulation_id=state["regulation_id"],
            workflow_summary={
                "policy_count": state.get("policy_count"),
                "clause_count": state.get("clause_count"),
                "impacted_policies": state.get("impacted_policy_count"),
                "proposals": state.get("proposal_count")
            }
        )
        
        self.orchestrator.mark_phase_complete("AUDIT")
        
        return update_state(state, {
            "audit_complete": True,
            "report_path": result.get("report_path"),
            "compliance_metrics": result.get("compliance_metrics", {})
        })


def run_workflow(
    regulation_name: str,
    regulation_text: str = None,
    regulation_file: str = None,
    regulation_id: str = None
) -> Dict[str, Any]:
    """
    Convenience function to run the full workflow
    
    Returns state dict with results
    """
    if not regulation_id:
        regulation_id = f"REG_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    workflow = RegulatoryWorkflow()
    state = workflow.run(
        regulation_id=regulation_id,
        regulation_name=regulation_name,
        regulation_file=regulation_file,
        regulation_text=regulation_text
    )
    
    return dict(state)


if __name__ == "__main__":
    # Test workflow with sample regulation
    sample_text = """
    EU AI ACT - Article 10: Data and data governance
    
    1. High-risk AI systems which make use of techniques involving the training 
    of models with data shall be developed on the basis of training, validation 
    and testing data sets that meet the quality criteria.
    
    2. Training, validation and testing data sets shall be subject to appropriate 
    data governance and management practices including examination in view of 
    possible biases.
    
    3. Training, validation and testing data sets shall be relevant, representative, 
    free of errors and complete.
    """
    
    result = run_workflow(
        regulation_name="EU AI Act - Data Governance (Test)",
        regulation_text=sample_text.strip()
    )
    
    print("\n" + "="*60)
    print("WORKFLOW COMPLETE")
    print("="*60)
    print(f"Status: {result['status']}")
    print(f"Policies: {result['policy_count']}")
    print(f"Clauses: {result['clause_count']}")
    print(f"Impacted: {result['impacted_policy_count']}")
    print(f"Proposals: {result['proposal_count']}")
    print(f"Pending review: {result['pending_count']}")
