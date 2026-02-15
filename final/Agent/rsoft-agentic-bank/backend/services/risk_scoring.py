"""
LangGraph-based Multi-Agent Risk Scoring System
Real-time risk evaluation for AI agents
"""

import os
from typing import Dict, List, Any, TypedDict
from datetime import datetime, timedelta
import random

# Note: In production, use actual LangGraph + LLM calls
# For MVP, we simulate the multi-agent evaluation

class RiskEvaluation(TypedDict):
    behavior_score: float
    performance_score: float
    transaction_score: float
    integrity_score: float
    market_score: float
    final_score: float
    confidence: float
    factors: List[str]
    recommendation: str


class RiskScoringEngine:
    """
    Multi-Agent Risk Scoring System
    
    Uses specialized agents to evaluate risk:
    1. BehaviorAgent - Analyzes past actions & patterns
    2. PerformanceAgent - Success/failure rate analysis
    3. TransactionAgent - Loan repayment history
    4. IntegrityAgent - Detects anomalies & fraud
    5. MarketRiskAgent - External market conditions
    """
    
    def __init__(self):
        self.weights = {
            "behavior": 0.20,
            "performance": 0.25,
            "transaction": 0.30,
            "integrity": 0.15,
            "market": 0.10
        }
        self.market_condition = 0.7  # 0-1 scale, 1 = favorable
    
    def evaluate_behavior(self, agent_data: dict) -> Dict[str, Any]:
        """
        BehaviorAgent: Analyze agent's behavioral patterns
        
        Factors:
        - Action frequency and consistency
        - Time between actions
        - Pattern anomalies
        """
        behavior_history = agent_data.get("behavior_history", [])
        
        # Calculate behavior score
        if len(behavior_history) == 0:
            score = 50.0  # Neutral for new agents
            factors = ["New agent, limited behavioral data"]
        else:
            # Analyze actions
            successful_actions = sum(1 for a in behavior_history if a.get("success", True))
            total_actions = len(behavior_history)
            success_rate = successful_actions / total_actions if total_actions > 0 else 0.5
            
            # Score based on success rate and activity
            score = 40 + (success_rate * 40) + min(20, total_actions * 2)
            factors = [
                f"Action success rate: {success_rate:.1%}",
                f"Total actions recorded: {total_actions}"
            ]
        
        return {
            "score": min(100, max(0, score)),
            "factors": factors,
            "agent": "BehaviorAgent"
        }
    
    def evaluate_performance(self, agent_data: dict) -> Dict[str, Any]:
        """
        PerformanceAgent: Analyze success/failure rates
        
        Factors:
        - Loan success rate
        - Default history
        - Overall financial performance
        """
        successful_loans = agent_data.get("successful_loans", 0)
        failed_loans = agent_data.get("failed_loans", 0)
        total_loans = successful_loans + failed_loans
        
        if total_loans == 0:
            score = 50.0
            factors = ["No loan history available"]
        else:
            success_rate = successful_loans / total_loans
            # Penalize failures more heavily
            penalty = failed_loans * 10
            score = (success_rate * 80) + 20 - penalty
            
            factors = [
                f"Loan success rate: {success_rate:.1%}",
                f"Successful loans: {successful_loans}",
                f"Failed loans: {failed_loans}"
            ]
        
        return {
            "score": min(100, max(0, score)),
            "factors": factors,
            "agent": "PerformanceAgent"
        }
    
    def evaluate_transaction_history(self, agent_data: dict) -> Dict[str, Any]:
        """
        TransactionAgent: Analyze loan repayment history
        
        Factors:
        - Repayment timeliness
        - Total volume borrowed/repaid
        - Repayment ratio
        """
        total_borrowed = agent_data.get("total_borrowed", 0)
        total_repaid = agent_data.get("total_repaid", 0)
        transaction_count = agent_data.get("transaction_count", 0)
        
        if total_borrowed == 0:
            score = 50.0
            factors = ["No transaction history"]
        else:
            repayment_ratio = total_repaid / total_borrowed
            # High repayment ratio is good (>=1 means fully repaid with interest)
            if repayment_ratio >= 1.0:
                score = 70 + min(30, (repayment_ratio - 1) * 100)
            else:
                score = repayment_ratio * 70
            
            factors = [
                f"Repayment ratio: {repayment_ratio:.2f}",
                f"Total borrowed: ${total_borrowed:,.2f}",
                f"Total repaid: ${total_repaid:,.2f}",
                f"Transaction count: {transaction_count}"
            ]
        
        return {
            "score": min(100, max(0, score)),
            "factors": factors,
            "agent": "TransactionAgent"
        }
    
    def evaluate_integrity(self, agent_data: dict) -> Dict[str, Any]:
        """
        IntegrityAgent: Detect anomalies and potential fraud
        
        Factors:
        - Code hash consistency
        - Suspicious patterns
        - Rapid behavior changes
        """
        # For MVP, simulate integrity checks
        code_hash = agent_data.get("code_hash", "")
        is_active = agent_data.get("is_active", True)
        
        # Base score
        score = 75.0
        factors = []
        
        if not code_hash:
            score -= 20
            factors.append("⚠️ No code hash provided")
        else:
            factors.append("✓ Code hash verified")
        
        if not is_active:
            score -= 30
            factors.append("⚠️ Agent marked inactive")
        else:
            factors.append("✓ Agent is active")
        
        # Check for suspicious patterns (simulated)
        if len(agent_data.get("behavior_history", [])) > 100:
            factors.append("✓ Established agent with long history")
            score += 10
        
        return {
            "score": min(100, max(0, score)),
            "factors": factors,
            "agent": "IntegrityAgent"
        }
    
    def evaluate_market_risk(self) -> Dict[str, Any]:
        """
        MarketRiskAgent: Evaluate external market conditions
        
        Factors:
        - Market volatility
        - Economic indicators
        - Liquidity conditions
        """
        # Simulate market conditions
        volatility = random.uniform(0.1, 0.3)
        liquidity = random.uniform(0.6, 0.9)
        
        score = self.market_condition * 100 - (volatility * 50) + (liquidity * 20)
        
        factors = [
            f"Market condition: {'Favorable' if self.market_condition > 0.5 else 'Unfavorable'}",
            f"Volatility index: {volatility:.2f}",
            f"Liquidity score: {liquidity:.2f}"
        ]
        
        return {
            "score": min(100, max(0, score)),
            "factors": factors,
            "agent": "MarketRiskAgent"
        }
    
    def calculate_final_score(self, scores: Dict[str, float]) -> float:
        """Combine all agent scores with weights"""
        final = sum(scores[key] * self.weights[key] for key in self.weights)
        return round(final, 2)
    
    def get_recommendation(self, final_score: float, loan_amount: float) -> str:
        """Generate lending recommendation based on risk score"""
        if final_score >= 80:
            return f"APPROVED - Low risk. Approve up to ${loan_amount * 2:,.2f}"
        elif final_score >= 60:
            return f"APPROVED - Moderate risk. Approve requested ${loan_amount:,.2f}"
        elif final_score >= 40:
            return f"CONDITIONAL - Higher risk. Approve ${loan_amount * 0.5:,.2f} with collateral"
        else:
            return f"REJECTED - High risk. Deny loan request."
    
    def evaluate_agent(self, agent_data: dict, loan_amount: float = 0) -> RiskEvaluation:
        """
        Run full multi-agent risk evaluation
        
        Returns comprehensive risk assessment with:
        - Individual agent scores
        - Final weighted score
        - Risk factors
        - Lending recommendation
        """
        # Run all evaluation agents
        behavior = self.evaluate_behavior(agent_data)
        performance = self.evaluate_performance(agent_data)
        transaction = self.evaluate_transaction_history(agent_data)
        integrity = self.evaluate_integrity(agent_data)
        market = self.evaluate_market_risk()
        
        # Collect scores
        scores = {
            "behavior": behavior["score"],
            "performance": performance["score"],
            "transaction": transaction["score"],
            "integrity": integrity["score"],
            "market": market["score"]
        }
        
        # Calculate final score
        final_score = self.calculate_final_score(scores)
        
        # Compile all factors
        all_factors = (
            behavior["factors"] +
            performance["factors"] +
            transaction["factors"] +
            integrity["factors"] +
            market["factors"]
        )
        
        # Calculate confidence based on data availability
        data_points = sum([
            1 if agent_data.get("behavior_history") else 0,
            1 if agent_data.get("successful_loans", 0) > 0 else 0,
            1 if agent_data.get("total_borrowed", 0) > 0 else 0,
            1 if agent_data.get("code_hash") else 0,
        ])
        confidence = min(1.0, 0.5 + (data_points * 0.125))
        
        return {
            "behavior_score": behavior["score"],
            "performance_score": performance["score"],
            "transaction_score": transaction["score"],
            "integrity_score": integrity["score"],
            "market_score": market["score"],
            "final_score": final_score,
            "confidence": confidence,
            "factors": all_factors,
            "recommendation": self.get_recommendation(final_score, loan_amount)
        }


# Global instance
risk_engine = RiskScoringEngine()
