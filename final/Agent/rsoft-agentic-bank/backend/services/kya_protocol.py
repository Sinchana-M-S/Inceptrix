"""
Know Your Agent (KYA) Protocol Service
Creates verifiable, code-based financial identities for AI agents
"""

import hashlib
import uuid
import secrets
from datetime import datetime
from typing import Optional, Dict, List
from models.agent import Agent, AgentType, AgentRegistration, ReputationLevel


class KYAProtocol:
    """
    Know Your Agent Protocol - Financial Identity Layer for AI Agents
    
    Creates unique, verifiable identities that are:
    - Code-based, not human-based
    - Tamper-resistant and auditable
    - Tied to behavioral and transaction history
    """
    
    def __init__(self):
        self.agents: Dict[str, Agent] = {}
        self._wallet_index = 0
        
        # Create demo agents for testing
        self._create_demo_agents()
    
    def _create_demo_agents(self):
        """Create demo agents for testing"""
        demo_agents = [
            {
                "name": "AlphaTrader-001",
                "agent_type": AgentType.TRADER,
                "code_hash": "abc123def456",
                "risk_score": 85.0,
                "successful_loans": 12,
                "total_borrowed": 50000.0,
                "total_repaid": 52000.0
            },
            {
                "name": "LoanBot-Prime",
                "agent_type": AgentType.LENDER,
                "code_hash": "xyz789ghi012",
                "risk_score": 72.0,
                "successful_loans": 8,
                "total_borrowed": 25000.0,
                "total_repaid": 26500.0
            },
            {
                "name": "RiskAgent-Beta",
                "agent_type": AgentType.CUSTOMER,
                "code_hash": "mno345pqr678",
                "risk_score": 45.0,
                "successful_loans": 2,
                "failed_loans": 1,
                "total_borrowed": 10000.0,
                "total_repaid": 8000.0
            }
        ]
        
        for agent_data in demo_agents:
            agent = self.register_agent(AgentRegistration(
                name=agent_data["name"],
                agent_type=agent_data["agent_type"],
                code_hash=agent_data["code_hash"]
            ))
            agent.risk_score = agent_data["risk_score"]
            agent.successful_loans = agent_data.get("successful_loans", 0)
            agent.failed_loans = agent_data.get("failed_loans", 0)
            agent.total_borrowed = agent_data.get("total_borrowed", 0.0)
            agent.total_repaid = agent_data.get("total_repaid", 0.0)
            agent.update_reputation()
    
    def generate_wallet_address(self) -> str:
        """Generate a unique wallet address for an agent"""
        self._wallet_index += 1
        random_bytes = secrets.token_bytes(20)
        return "0x" + random_bytes.hex()
    
    def generate_api_key(self) -> str:
        """Generate a secure API key for agent authentication"""
        return secrets.token_urlsafe(32)
    
    def compute_identity_hash(self, code_hash: str, wallet_address: str) -> str:
        """Compute a unique identity hash combining code and wallet"""
        combined = f"{code_hash}:{wallet_address}:{datetime.utcnow().isoformat()}"
        return hashlib.sha256(combined.encode()).hexdigest()[:16]
    
    def register_agent(self, registration: AgentRegistration) -> Agent:
        """
        Register a new AI agent with KYA identity
        
        Returns the registered agent with:
        - Unique agent_id
        - Wallet address
        - API key for authentication
        - Initial risk score (50 - neutral)
        """
        # Generate wallet if not provided
        wallet_address = registration.wallet_address or self.generate_wallet_address()
        
        # Create the agent
        agent = Agent(
            name=registration.name,
            agent_type=registration.agent_type,
            wallet_address=wallet_address,
            code_hash=registration.code_hash,
            api_key=self.generate_api_key(),
            risk_score=50.0,  # Start neutral
            reputation_level=ReputationLevel.BRONZE
        )
        
        # Record the registration action
        agent.add_action("registration", {
            "code_hash": registration.code_hash,
            "wallet_address": wallet_address
        })
        
        # Store the agent
        self.agents[agent.agent_id] = agent
        
        return agent
    
    def get_agent(self, agent_id: str) -> Optional[Agent]:
        """Retrieve an agent by ID"""
        return self.agents.get(agent_id)
    
    def get_agent_by_wallet(self, wallet_address: str) -> Optional[Agent]:
        """Retrieve an agent by wallet address"""
        for agent in self.agents.values():
            if agent.wallet_address == wallet_address:
                return agent
        return None
    
    def authenticate_agent(self, agent_id: str, api_key: str) -> Optional[Agent]:
        """Authenticate an agent using their API key"""
        agent = self.agents.get(agent_id)
        if agent and agent.api_key == api_key and agent.is_active:
            agent.last_active = datetime.utcnow()
            return agent
        return None
    
    def update_risk_score(self, agent_id: str, new_score: float) -> bool:
        """Update an agent's risk score"""
        agent = self.agents.get(agent_id)
        if not agent:
            return False
        
        agent.risk_score = max(0, min(100, new_score))
        agent.update_reputation()
        agent.add_action("risk_score_update", {
            "new_score": agent.risk_score,
            "reputation_level": agent.reputation_level.value
        })
        
        return True
    
    def record_transaction(self, agent_id: str, transaction_type: str, 
                          amount: float, success: bool = True) -> bool:
        """Record a financial transaction for an agent"""
        agent = self.agents.get(agent_id)
        if not agent:
            return False
        
        agent.transaction_count += 1
        agent.add_action(f"transaction_{transaction_type}", {
            "amount": amount,
            "success": success
        }, success=success)
        
        return True
    
    def get_all_agents(self) -> List[Agent]:
        """Get all registered agents"""
        return list(self.agents.values())
    
    def get_agent_stats(self) -> dict:
        """Get aggregate statistics about all agents"""
        total_agents = len(self.agents)
        active_agents = sum(1 for a in self.agents.values() if a.is_active)
        avg_risk_score = sum(a.risk_score for a in self.agents.values()) / total_agents if total_agents > 0 else 0
        
        reputation_counts = {level: 0 for level in ReputationLevel}
        for agent in self.agents.values():
            reputation_counts[agent.reputation_level] += 1
        
        return {
            "total_agents": total_agents,
            "active_agents": active_agents,
            "average_risk_score": round(avg_risk_score, 2),
            "reputation_distribution": {k.value: v for k, v in reputation_counts.items()}
        }


# Global instance
kya_protocol = KYAProtocol()
