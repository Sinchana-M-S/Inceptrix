"""
Reputation System - Decoupled from Risk Score

Key Insight:
- Risk Score = SHORT-TERM, volatile, changes per transaction
- Reputation = LONG-TERM, smoothed, builds over time

Reputation is NOT derived from risk score directly.
It's a rolling average with penalty/bonus modifiers.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field


class ReputationTier(Enum):
    """Reputation tiers - earned over time, not instant"""
    UNVERIFIED = "unverified"  # New agent, no history
    BRONZE = "bronze"          # Starting tier after initial period
    SILVER = "silver"          # Consistent good behavior
    GOLD = "gold"              # Excellent track record
    PLATINUM = "platinum"      # Top-tier, premium rates


@dataclass
class ReputationEvent:
    """Event that affects reputation"""
    event_type: str
    impact: float  # Positive or negative
    timestamp: datetime = field(default_factory=datetime.utcnow)
    reason: str = ""


class ReputationEngine:
    """
    Manages agent reputation independently from risk scoring.
    
    Key Differences from Risk Score:
    
    | Aspect        | Risk Score              | Reputation              |
    |---------------|-------------------------|-------------------------|
    | Volatility    | High (real-time)        | Low (smoothed)          |
    | Time Horizon  | Current state           | Historical average      |
    | Recovery      | Instant with good data  | Slow, requires time     |
    | Impact        | Loan approval           | Interest rates, limits  |
    
    Reputation is computed using:
    1. Rolling average of past N interactions
    2. Penalty multipliers for defaults
    3. Bonus for consistent behavior
    4. Time-decay for old events
    """
    
    # Tier thresholds (reputation points)
    TIER_THRESHOLDS = {
        ReputationTier.UNVERIFIED: 0,
        ReputationTier.BRONZE: 100,
        ReputationTier.SILVER: 300,
        ReputationTier.GOLD: 600,
        ReputationTier.PLATINUM: 1000
    }
    
    # Event impact values
    EVENT_IMPACTS = {
        "registration": 50,           # Initial reputation points
        "loan_approved": 10,          # Applied for and got approved
        "loan_repaid_full": 50,       # Full repayment on time
        "loan_repaid_partial": 20,    # Partial repayment
        "loan_repaid_early": 75,      # Early repayment bonus
        "loan_late_payment": -30,     # Late payment penalty
        "loan_defaulted": -200,       # Default - major penalty
        "consistent_behavior": 25,    # Bonus for consistency
        "abnormal_behavior": -50,     # Penalty for anomalies
        "code_update_verified": 15,   # Code integrity maintained
    }
    
    def __init__(self):
        self._agent_reputation: Dict[str, Dict[str, Any]] = {}
        self._reputation_history: Dict[str, List[ReputationEvent]] = {}
        self._rolling_window_days = 90  # 90-day rolling average
    
    def initialize_agent(self, agent_id: str):
        """Initialize reputation for a new agent"""
        self._agent_reputation[agent_id] = {
            "total_points": 50,  # Starting points
            "tier": ReputationTier.UNVERIFIED,
            "created_at": datetime.utcnow(),
            "last_updated": datetime.utcnow(),
            "consecutive_good_actions": 0,
            "penalty_multiplier": 1.0
        }
        self._reputation_history[agent_id] = [
            ReputationEvent("registration", 50, reason="Initial KYA registration")
        ]
    
    def record_event(self, agent_id: str, event_type: str, custom_impact: Optional[float] = None):
        """
        Record an event that affects reputation.
        
        Unlike risk score (which recalculates entirely each time),
        reputation ACCUMULATES and SMOOTHS over time.
        """
        if agent_id not in self._agent_reputation:
            self.initialize_agent(agent_id)
        
        # Get impact value
        impact = custom_impact if custom_impact is not None else self.EVENT_IMPACTS.get(event_type, 0)
        
        # Apply penalty multiplier for repeated bad behavior
        rep_data = self._agent_reputation[agent_id]
        if impact < 0:
            impact *= rep_data["penalty_multiplier"]
            # Increase penalty multiplier for next bad event
            rep_data["penalty_multiplier"] = min(3.0, rep_data["penalty_multiplier"] + 0.2)
            rep_data["consecutive_good_actions"] = 0
        else:
            # Good behavior reduces penalty multiplier
            rep_data["penalty_multiplier"] = max(1.0, rep_data["penalty_multiplier"] - 0.1)
            rep_data["consecutive_good_actions"] += 1
            
            # Consistency bonus
            if rep_data["consecutive_good_actions"] >= 5:
                impact += self.EVENT_IMPACTS["consistent_behavior"]
                rep_data["consecutive_good_actions"] = 0  # Reset counter
        
        # Record event
        event = ReputationEvent(event_type, impact, reason=f"Event: {event_type}")
        self._reputation_history[agent_id].append(event)
        
        # Update total points
        rep_data["total_points"] = max(0, rep_data["total_points"] + impact)
        rep_data["last_updated"] = datetime.utcnow()
        
        # Update tier
        rep_data["tier"] = self._calculate_tier(rep_data["total_points"])
        
        return {
            "event_type": event_type,
            "impact": impact,
            "new_total": rep_data["total_points"],
            "tier": rep_data["tier"].value
        }
    
    def get_reputation(self, agent_id: str) -> Dict[str, Any]:
        """Get current reputation (smoothed, long-term view)"""
        if agent_id not in self._agent_reputation:
            return {
                "total_points": 0,
                "tier": ReputationTier.UNVERIFIED.value,
                "rolling_average": 0,
                "trend": "neutral"
            }
        
        rep_data = self._agent_reputation[agent_id]
        rolling_avg = self._calculate_rolling_average(agent_id)
        trend = self._calculate_trend(agent_id)
        
        return {
            "total_points": rep_data["total_points"],
            "tier": rep_data["tier"].value,
            "rolling_average": rolling_avg,
            "trend": trend,
            "penalty_multiplier": rep_data["penalty_multiplier"],
            "consecutive_good_actions": rep_data["consecutive_good_actions"],
            "days_active": (datetime.utcnow() - rep_data["created_at"]).days
        }
    
    def _calculate_tier(self, points: float) -> ReputationTier:
        """Determine tier from points"""
        tier = ReputationTier.UNVERIFIED
        for t, threshold in self.TIER_THRESHOLDS.items():
            if points >= threshold:
                tier = t
        return tier
    
    def _calculate_rolling_average(self, agent_id: str) -> float:
        """Calculate 90-day rolling average of reputation changes"""
        cutoff = datetime.utcnow() - timedelta(days=self._rolling_window_days)
        history = self._reputation_history.get(agent_id, [])
        
        recent_events = [e for e in history if e.timestamp >= cutoff]
        if not recent_events:
            return self._agent_reputation[agent_id]["total_points"]
        
        return sum(e.impact for e in recent_events) / len(recent_events)
    
    def _calculate_trend(self, agent_id: str) -> str:
        """Calculate if reputation is improving, declining, or stable"""
        history = self._reputation_history.get(agent_id, [])
        if len(history) < 3:
            return "neutral"
        
        recent = list(history[-5:]) if len(history) >= 5 else list(history)
        avg_impact = sum(e.impact for e in recent) / len(recent) if recent else 0
        
        if avg_impact > 10:
            return "improving"
        elif avg_impact < -10:
            return "declining"
        return "stable"
    
    def get_tier_benefits(self, tier: ReputationTier) -> Dict[str, Any]:
        """Get benefits for each reputation tier"""
        benefits = {
            ReputationTier.UNVERIFIED: {
                "max_loan_multiplier": 0.5,
                "interest_discount": 0,
                "collateral_reduction": 0
            },
            ReputationTier.BRONZE: {
                "max_loan_multiplier": 1.0,
                "interest_discount": 0,
                "collateral_reduction": 0
            },
            ReputationTier.SILVER: {
                "max_loan_multiplier": 1.5,
                "interest_discount": 0.05,  # 5% off interest
                "collateral_reduction": 0.10  # 10% less collateral
            },
            ReputationTier.GOLD: {
                "max_loan_multiplier": 2.0,
                "interest_discount": 0.10,
                "collateral_reduction": 0.20
            },
            ReputationTier.PLATINUM: {
                "max_loan_multiplier": 3.0,
                "interest_discount": 0.15,
                "collateral_reduction": 0.30
            }
        }
        return benefits.get(tier, benefits[ReputationTier.BRONZE])


# Singleton instance
reputation_engine = ReputationEngine()
