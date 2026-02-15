"""
Agent Router - API endpoints for AI agent management
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models.agent import Agent, AgentRegistration, AgentResponse, AgentType
from services.kya_protocol import kya_protocol
from services.risk_scoring import risk_engine

router = APIRouter()


@router.get("/", response_model=List[dict])
async def list_agents():
    """Get all registered AI agents"""
    agents = kya_protocol.get_all_agents()
    return [
        {
            "agent_id": a.agent_id,
            "name": a.name,
            "agent_type": a.agent_type.value,
            "wallet_address": a.wallet_address,
            "risk_score": a.risk_score,
            "reputation_level": a.reputation_level.value,
            "successful_loans": a.successful_loans,
            "transaction_count": a.transaction_count,
            "created_at": a.created_at.isoformat(),
            "is_active": a.is_active
        }
        for a in agents
    ]


@router.post("/register")
async def register_agent(registration: AgentRegistration):
    """
    Register a new AI agent with KYA identity
    
    Creates:
    - Unique agent_id
    - Wallet address
    - API key for authentication
    - Initial risk score (50)
    """
    agent = kya_protocol.register_agent(registration)
    
    return {
        "success": True,
        "message": "Agent registered successfully with KYA identity",
        "agent": {
            "agent_id": agent.agent_id,
            "name": agent.name,
            "agent_type": agent.agent_type.value,
            "wallet_address": agent.wallet_address,
            "api_key": agent.api_key,  # Only shown once at registration
            "risk_score": agent.risk_score,
            "reputation_level": agent.reputation_level.value
        }
    }


@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    """Get agent details by ID"""
    agent = kya_protocol.get_agent(agent_id)
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {
        "agent_id": agent.agent_id,
        "name": agent.name,
        "agent_type": agent.agent_type.value,
        "wallet_address": agent.wallet_address,
        "code_hash": agent.code_hash,
        "risk_score": agent.risk_score,
        "reputation_level": agent.reputation_level.value,
        "successful_loans": agent.successful_loans,
        "failed_loans": agent.failed_loans,
        "total_borrowed": agent.total_borrowed,
        "total_repaid": agent.total_repaid,
        "transaction_count": agent.transaction_count,
        "created_at": agent.created_at.isoformat(),
        "last_active": agent.last_active.isoformat(),
        "is_active": agent.is_active
    }


@router.get("/{agent_id}/risk-evaluation")
async def evaluate_agent_risk(agent_id: str, loan_amount: float = 10000):
    """
    Run full multi-agent risk evaluation for an agent
    
    Returns scores from:
    - BehaviorAgent
    - PerformanceAgent
    - TransactionAgent
    - IntegrityAgent
    - MarketRiskAgent
    """
    agent = kya_protocol.get_agent(agent_id)
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Convert agent to dict for evaluation
    agent_data = {
        "behavior_history": [a.model_dump() for a in agent.behavior_history],
        "successful_loans": agent.successful_loans,
        "failed_loans": agent.failed_loans,
        "total_borrowed": agent.total_borrowed,
        "total_repaid": agent.total_repaid,
        "transaction_count": agent.transaction_count,
        "code_hash": agent.code_hash,
        "is_active": agent.is_active
    }
    
    evaluation = risk_engine.evaluate_agent(agent_data, loan_amount)
    
    return {
        "agent_id": agent_id,
        "agent_name": agent.name,
        "evaluation": evaluation
    }


@router.post("/{agent_id}/login")
async def login_agent(agent_id: str, api_key: str):
    """Authenticate an agent using their API key"""
    agent = kya_protocol.authenticate_agent(agent_id, api_key)
    
    if not agent:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "success": True,
        "message": "Agent authenticated successfully",
        "agent": {
            "agent_id": agent.agent_id,
            "name": agent.name,
            "agent_type": agent.agent_type.value,
            "risk_score": agent.risk_score,
            "reputation_level": agent.reputation_level.value
        }
    }


@router.get("/stats/overview")
async def get_stats():
    """Get aggregate statistics about all agents"""
    return kya_protocol.get_agent_stats()
