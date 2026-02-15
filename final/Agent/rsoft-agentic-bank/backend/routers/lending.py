"""
Lending Router - API endpoints for loan operations
"""

from fastapi import APIRouter, HTTPException
from typing import List
from models.loan import LoanRequest, LoanRepayment, LoanStatus
from services.kya_protocol import kya_protocol
from services.risk_scoring import risk_engine
from contracts.lending_pool import LendingPool
from contracts.registry import AgentRegistry

router = APIRouter()

# Initialize contracts
agent_registry = AgentRegistry()
lending_pool = LendingPool(agent_registry)


@router.get("/pool/stats")
async def get_pool_stats():
    """Get lending pool statistics"""
    return lending_pool.get_pool_stats()


@router.post("/request")
async def request_loan(loan_request: LoanRequest):
    """
    Request a loan from the lending pool
    
    Process:
    1. Verify agent exists
    2. Run multi-agent risk evaluation
    3. Calculate interest rate based on risk
    4. Approve/reject based on score and amount
    """
    # Verify agent
    agent = kya_protocol.get_agent(loan_request.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Run risk evaluation
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
    
    risk_evaluation = risk_engine.evaluate_agent(agent_data, loan_request.amount)
    
    # Process loan request
    loan = lending_pool.request_loan(
        agent_id=loan_request.agent_id,
        amount=loan_request.amount,
        duration_days=loan_request.duration_days,
        risk_evaluation=risk_evaluation
    )
    
    # Update agent stats if approved
    if loan.status == LoanStatus.APPROVED:
        agent.total_borrowed += loan.amount
        agent.add_action("loan_requested", {
            "loan_id": loan.loan_id,
            "amount": loan.amount,
            "interest_rate": loan.interest_rate
        })
        
        # Update risk score based on new loan
        new_score = agent.risk_score - 2  # Slight decrease for taking on debt
        kya_protocol.update_risk_score(loan_request.agent_id, new_score)
    
    return {
        "loan_id": loan.loan_id,
        "status": loan.status.value,
        "amount": loan.amount,
        "interest_rate": loan.interest_rate,
        "total_due": loan.total_due,
        "collateral_required": loan.collateral_amount,
        "repayment_deadline": loan.repayment_deadline.isoformat() if loan.repayment_deadline else None,
        "risk_evaluation": {
            "final_score": risk_evaluation["final_score"],
            "recommendation": risk_evaluation["recommendation"],
            "scores": {
                "behavior": risk_evaluation["behavior_score"],
                "performance": risk_evaluation["performance_score"],
                "transaction": risk_evaluation["transaction_score"],
                "integrity": risk_evaluation["integrity_score"],
                "market": risk_evaluation["market_score"]
            }
        }
    }


@router.post("/repay")
async def repay_loan(repayment: LoanRepayment):
    """
    Repay a loan (full or partial)
    
    Updates:
    - Loan status and balance
    - Agent's total repaid
    - Agent's risk score (improves on repayment)
    """
    loan = lending_pool.get_loan(repayment.loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    agent = kya_protocol.get_agent(loan.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Process repayment
    result = lending_pool.repay_loan(repayment.loan_id, repayment.amount)
    
    if result["success"]:
        # Update agent stats
        agent.total_repaid += repayment.amount
        agent.add_action("loan_repayment", {
            "loan_id": repayment.loan_id,
            "amount": repayment.amount
        })
        
        # Improve risk score on successful repayment
        if result.get("loan_status") == "REPAID":
            agent.successful_loans += 1
            new_score = min(100, agent.risk_score + 5)  # Boost for full repayment
        else:
            new_score = min(100, agent.risk_score + 1)  # Small boost for partial
        
        kya_protocol.update_risk_score(loan.agent_id, new_score)
    
    return result


@router.get("/loans/{agent_id}")
async def get_agent_loans(agent_id: str):
    """Get all loans for an agent"""
    agent = kya_protocol.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    loans = lending_pool.get_agent_loans(agent_id)
    
    return [
        {
            "loan_id": l.loan_id,
            "amount": l.amount,
            "interest_rate": l.interest_rate,
            "status": l.status.value,
            "total_due": l.total_due,
            "amount_repaid": l.amount_repaid,
            "remaining": l.remaining_amount,
            "requested_at": l.requested_at.isoformat(),
            "repayment_deadline": l.repayment_deadline.isoformat() if l.repayment_deadline else None
        }
        for l in loans
    ]


@router.get("/loan/{loan_id}")
async def get_loan(loan_id: str):
    """Get loan details by ID"""
    loan = lending_pool.get_loan(loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    return {
        "loan_id": loan.loan_id,
        "agent_id": loan.agent_id,
        "amount": loan.amount,
        "interest_rate": loan.interest_rate,
        "status": loan.status.value,
        "risk_score_at_request": loan.risk_score_at_request,
        "total_due": loan.total_due,
        "amount_repaid": loan.amount_repaid,
        "remaining": loan.remaining_amount,
        "collateral_amount": loan.collateral_amount,
        "requested_at": loan.requested_at.isoformat(),
        "approved_at": loan.approved_at.isoformat() if loan.approved_at else None,
        "repayment_deadline": loan.repayment_deadline.isoformat() if loan.repayment_deadline else None,
        "risk_evaluation": loan.risk_evaluation
    }


@router.get("/active")
async def get_active_loans():
    """Get all active loans in the system"""
    loans = lending_pool.get_active_loans()
    
    return [
        {
            "loan_id": l.loan_id,
            "agent_id": l.agent_id,
            "amount": l.amount,
            "remaining": l.remaining_amount,
            "status": l.status.value,
            "is_overdue": l.is_overdue
        }
        for l in loans
    ]
