"""
System Orchestrator - Controls AI Agent Execution

This module answers the critical question: "Who controls the AI agents?"

Architecture:
- Agents are AUTONOMOUS in reasoning (they make their own decisions)
- But ORCHESTRATED in execution (the system controls when they run)

The Orchestrator:
1. Listens to events from the Event Bus
2. Triggers appropriate risk scoring agents
3. Aggregates results and updates state
4. Makes final lending decisions

This prevents "agents running wild" - all agent execution is controlled.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum


class OrchestratorMode(Enum):
    """Orchestrator execution modes"""
    SEQUENTIAL = "sequential"      # Run agents one after another
    PARALLEL = "parallel"          # Run all agents simultaneously
    WEIGHTED_PARALLEL = "weighted" # Run in parallel, weight by confidence


class SystemOrchestrator:
    """
    Central Orchestrator for the Multi-Agent Risk Scoring System.
    
    Key Responsibilities:
    1. TRIGGER - Decide when to invoke scoring agents
    2. COORDINATE - Manage parallel agent execution
    3. AGGREGATE - Combine agent outputs into final score
    4. ENFORCE - Apply business rules and limits
    
    The orchestrator ensures:
    - No agent can modify state directly
    - All decisions are auditable
    - System remains deterministic despite autonomous agents
    """
    
    def __init__(self):
        self.mode = OrchestratorMode.WEIGHTED_PARALLEL
        self.execution_log: List[Dict[str, Any]] = []
        self._agent_weights = {
            "BehaviorAgent": 0.20,
            "PerformanceAgent": 0.25,
            "TransactionAgent": 0.30,
            "IntegrityAgent": 0.15,
            "MarketRiskAgent": 0.10
        }
        self._is_running = False
    
    def trigger_risk_evaluation(
        self, 
        agent_id: str, 
        trigger_event: str,
        agent_data: dict,
        loan_amount: float = 0
    ) -> Dict[str, Any]:
        """
        Orchestrate a full risk evaluation cycle.
        
        This is the ONLY entry point for risk scoring.
        Agents cannot be called directly - everything goes through here.
        """
        self._is_running = True
        execution_id = f"exec_{datetime.utcnow().timestamp()}"
        
        # Log execution start
        execution_record = {
            "execution_id": execution_id,
            "agent_id": agent_id,
            "trigger_event": trigger_event,
            "started_at": datetime.utcnow().isoformat(),
            "mode": self.mode.value,
            "agent_results": {}
        }
        
        # Run agents based on mode
        agent_scores = self._execute_agents(agent_data, loan_amount)
        
        # Aggregate scores
        final_result = self._aggregate_results(agent_scores)
        
        # Record execution
        execution_record["agent_results"] = agent_scores
        execution_record["final_score"] = final_result["final_score"]
        execution_record["completed_at"] = datetime.utcnow().isoformat()
        self.execution_log.append(execution_record)
        
        self._is_running = False
        
        return {
            "execution_id": execution_id,
            "trigger_event": trigger_event,
            **final_result
        }
    
    def _execute_agents(self, agent_data: dict, loan_amount: float) -> Dict[str, Any]:
        """
        Execute all scoring agents.
        
        In production with real LangGraph:
        - Each agent would be a separate LLM call
        - They run in parallel for speed
        - Results are collected and validated
        
        For MVP, we simulate this with deterministic calculations.
        """
        from services.risk_scoring import risk_engine
        
        return {
            "BehaviorAgent": {
                "score": risk_engine.evaluate_behavior(agent_data)["score"],
                "confidence": 0.85,
                "reasoning": "Analyzed action patterns and frequency"
            },
            "PerformanceAgent": {
                "score": risk_engine.evaluate_performance(agent_data)["score"],
                "confidence": 0.90,
                "reasoning": "Evaluated loan success/failure ratio"
            },
            "TransactionAgent": {
                "score": risk_engine.evaluate_transaction_history(agent_data)["score"],
                "confidence": 0.88,
                "reasoning": "Assessed repayment history and amounts"
            },
            "IntegrityAgent": {
                "score": risk_engine.evaluate_integrity(agent_data)["score"],
                "confidence": 0.95,
                "reasoning": "Verified code hash and system compliance"
            },
            "MarketRiskAgent": {
                "score": risk_engine.evaluate_market_risk()["score"],
                "confidence": 0.75,
                "reasoning": "Assessed current market conditions"
            }
        }
    
    def _aggregate_results(self, agent_scores: Dict[str, Any]) -> Dict[str, Any]:
        """
        Aggregate individual agent scores into final score.
        
        Uses weighted average with confidence adjustment.
        """
        weighted_sum = 0
        confidence_sum = 0
        
        for agent_name, result in agent_scores.items():
            weight = self._agent_weights.get(agent_name, 0)
            confidence = result.get("confidence", 1.0)
            score = result.get("score", 50)
            
            weighted_sum += score * weight * confidence
            confidence_sum += weight * confidence
        
        final_score = weighted_sum / confidence_sum if confidence_sum > 0 else 50
        
        # Determine recommendation
        if final_score >= 70:
            recommendation = "APPROVED - Agent meets risk threshold for lending"
        elif final_score >= 50:
            recommendation = "CONDITIONAL - Additional verification recommended"
        else:
            recommendation = "REJECTED - Risk score below minimum threshold"
        
        return {
            "final_score": round(final_score, 2),
            "confidence": round(confidence_sum / len(agent_scores), 2),
            "recommendation": recommendation,
            "behavior_score": agent_scores["BehaviorAgent"]["score"],
            "performance_score": agent_scores["PerformanceAgent"]["score"],
            "transaction_score": agent_scores["TransactionAgent"]["score"],
            "integrity_score": agent_scores["IntegrityAgent"]["score"],
            "market_score": agent_scores["MarketRiskAgent"]["score"]
        }
    
    def get_execution_history(self, agent_id: Optional[str] = None) -> List[Dict]:
        """Get orchestrator execution history for audit"""
        if agent_id:
            return [e for e in self.execution_log if e["agent_id"] == agent_id]
        return self.execution_log
    
    @property
    def status(self) -> Dict[str, Any]:
        """Get orchestrator status"""
        return {
            "is_running": self._is_running,
            "mode": self.mode.value,
            "total_executions": len(self.execution_log),
            "agent_weights": self._agent_weights
        }


# Singleton orchestrator instance
orchestrator = SystemOrchestrator()
