"""
Simulated AgentRegistry Smart Contract
Manages AI agent identities and reputation on-chain
"""

from typing import Dict, Optional, List
from datetime import datetime


class AgentRegistry:
    """
    Simulated AgentRegistry.sol Smart Contract
    
    In production, this would be:
    - Deployed on Ethereum/L2
    - Use actual wallet signatures
    - Store data on-chain
    
    Functions:
    - registerAgent(wallet, agentHash) → agentId
    - updateReputation(agentId, score)
    - getAgent(agentId) → Agent data
    - verifyAgent(agentId) → bool
    """
    
    def __init__(self):
        self.agents: Dict[str, dict] = {}
        self.wallet_to_agent: Dict[str, str] = {}
        self.reputation_history: Dict[str, List[dict]] = {}
        self.nonce = 0
    
    def register_agent(self, wallet_address: str, agent_hash: str, name: str) -> str:
        """
        Register a new agent on-chain
        
        Emits: AgentRegistered(agentId, wallet, agentHash)
        """
        self.nonce += 1
        agent_id = f"agent_{self.nonce:06d}"
        
        self.agents[agent_id] = {
            "agent_id": agent_id,
            "wallet_address": wallet_address,
            "agent_hash": agent_hash,
            "name": name,
            "reputation_score": 50,  # Initial neutral score
            "registered_at": datetime.utcnow().isoformat(),
            "is_verified": True,
            "total_transactions": 0
        }
        
        self.wallet_to_agent[wallet_address] = agent_id
        self.reputation_history[agent_id] = [{
            "score": 50,
            "timestamp": datetime.utcnow().isoformat(),
            "reason": "Initial registration"
        }]
        
        return agent_id
    
    def update_reputation(self, agent_id: str, new_score: int, reason: str = "") -> bool:
        """
        Update agent's on-chain reputation score
        
        Emits: ReputationUpdated(agentId, oldScore, newScore)
        """
        if agent_id not in self.agents:
            return False
        
        old_score = self.agents[agent_id]["reputation_score"]
        self.agents[agent_id]["reputation_score"] = max(0, min(100, new_score))
        
        self.reputation_history[agent_id].append({
            "score": new_score,
            "old_score": old_score,
            "timestamp": datetime.utcnow().isoformat(),
            "reason": reason
        })
        
        return True
    
    def get_agent(self, agent_id: str) -> Optional[dict]:
        """Get agent data from registry"""
        return self.agents.get(agent_id)
    
    def get_agent_by_wallet(self, wallet_address: str) -> Optional[dict]:
        """Get agent by wallet address"""
        agent_id = self.wallet_to_agent.get(wallet_address)
        return self.agents.get(agent_id) if agent_id else None
    
    def verify_agent(self, agent_id: str) -> bool:
        """Verify if an agent exists and is valid"""
        agent = self.agents.get(agent_id)
        return agent is not None and agent.get("is_verified", False)
    
    def increment_transactions(self, agent_id: str) -> bool:
        """Increment agent's transaction count"""
        if agent_id not in self.agents:
            return False
        self.agents[agent_id]["total_transactions"] += 1
        return True
    
    def get_reputation_history(self, agent_id: str) -> List[dict]:
        """Get full reputation history for an agent"""
        return self.reputation_history.get(agent_id, [])
    
    def get_all_agents(self) -> List[dict]:
        """Get all registered agents"""
        return list(self.agents.values())
    
    def get_stats(self) -> dict:
        """Get registry statistics"""
        if not self.agents:
            return {
                "total_agents": 0,
                "average_reputation": 0,
                "total_transactions": 0
            }
        
        scores = [a["reputation_score"] for a in self.agents.values()]
        transactions = sum(a["total_transactions"] for a in self.agents.values())
        
        return {
            "total_agents": len(self.agents),
            "average_reputation": sum(scores) / len(scores),
            "total_transactions": transactions
        }
