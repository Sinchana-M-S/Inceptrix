"""
Simulated LendingPool Smart Contract
Autonomous lending and borrowing for AI agents
"""

from typing import Dict, Optional, List
from datetime import datetime, timedelta
from models.loan import Loan, LoanStatus
from contracts.registry import AgentRegistry


class LendingPool:
    """
    Simulated LendingPool.sol Smart Contract
    
    Functions:
    - requestLoan(amount) → loanId
    - repayLoan(loanId, amount)
    - liquidate(loanId)
    - getInterestRate(agentId) → rate
    """
    
    def __init__(self, agent_registry: AgentRegistry = None):
        self.loans: Dict[str, Loan] = {}
        self.agent_loans: Dict[str, List[str]] = {}  # agent_id -> loan_ids
        self.registry = agent_registry or AgentRegistry()
        
        # Pool settings
        self.base_interest_rate = 5.0  # Base 5% annual
        self.max_interest_rate = 25.0  # Max 25% for high risk
        self.min_risk_score = 30  # Minimum score to get a loan
        self.pool_balance = 1_000_000.0  # Simulated pool liquidity
        self.total_borrowed = 0.0
        self.total_repaid = 0.0
    
    def calculate_interest_rate(self, risk_score: float) -> float:
        """
        Calculate interest rate based on agent's risk score
        Higher risk = higher interest rate
        
        Formula: base_rate + (max_rate - base_rate) * (1 - risk_score/100)
        """
        risk_factor = 1 - (risk_score / 100)
        rate = self.base_interest_rate + (self.max_interest_rate - self.base_interest_rate) * risk_factor
        return round(rate, 2)
    
    def calculate_max_loan(self, risk_score: float) -> float:
        """Calculate maximum loan amount based on risk score"""
        if risk_score >= 80:
            return 100_000.0
        elif risk_score >= 60:
            return 50_000.0
        elif risk_score >= 40:
            return 20_000.0
        else:
            return 5_000.0
    
    def calculate_collateral_requirement(self, risk_score: float, loan_amount: float) -> float:
        """Calculate required collateral based on risk"""
        if risk_score >= 80:
            return 0  # No collateral needed
        elif risk_score >= 60:
            return loan_amount * 0.1  # 10% collateral
        elif risk_score >= 40:
            return loan_amount * 0.25  # 25% collateral
        else:
            return loan_amount * 0.5  # 50% collateral
    
    def request_loan(
        self,
        agent_id: str,
        amount: float,
        duration_days: int = 30,
        risk_evaluation: dict = None
    ) -> Loan:
        """
        Process a loan request from an AI agent
        
        Emits: LoanRequested(loanId, agentId, amount)
        """
        risk_score = risk_evaluation.get("final_score", 50) if risk_evaluation else 50
        
        # Create loan object
        loan = Loan(
            agent_id=agent_id,
            amount=amount,
            interest_rate=self.calculate_interest_rate(risk_score),
            duration_days=duration_days,
            collateral_amount=self.calculate_collateral_requirement(risk_score, amount),
            risk_score_at_request=risk_score,
            risk_evaluation=risk_evaluation or {}
        )
        
        # Check if loan should be approved
        max_loan = self.calculate_max_loan(risk_score)
        
        if risk_score < self.min_risk_score:
            loan.status = LoanStatus.REJECTED
        elif amount > max_loan:
            loan.status = LoanStatus.REJECTED
        elif amount > self.pool_balance:
            loan.status = LoanStatus.REJECTED
        else:
            loan.status = LoanStatus.APPROVED
            loan.approved_at = datetime.utcnow()
            loan.repayment_deadline = datetime.utcnow() + timedelta(days=duration_days)
            
            # Update pool
            self.pool_balance -= amount
            self.total_borrowed += amount
        
        # Store loan
        self.loans[loan.loan_id] = loan
        
        if agent_id not in self.agent_loans:
            self.agent_loans[agent_id] = []
        self.agent_loans[agent_id].append(loan.loan_id)
        
        return loan
    
    def activate_loan(self, loan_id: str) -> bool:
        """Activate an approved loan (agent receives funds)"""
        loan = self.loans.get(loan_id)
        if not loan or loan.status != LoanStatus.APPROVED:
            return False
        
        loan.status = LoanStatus.ACTIVE
        return True
    
    def repay_loan(self, loan_id: str, amount: float) -> dict:
        """
        Process loan repayment
        
        Emits: LoanRepaid(loanId, amount, remaining)
        """
        loan = self.loans.get(loan_id)
        if not loan:
            return {"success": False, "error": "Loan not found"}
        
        if loan.status not in [LoanStatus.ACTIVE, LoanStatus.APPROVED]:
            return {"success": False, "error": f"Cannot repay loan in {loan.status.value} status"}
        
        # Activate if not already
        if loan.status == LoanStatus.APPROVED:
            loan.status = LoanStatus.ACTIVE
        
        # Process repayment
        loan.amount_repaid += amount
        self.total_repaid += amount
        self.pool_balance += amount
        
        # Check if fully repaid
        if loan.amount_repaid >= loan.total_due:
            loan.status = LoanStatus.REPAID
            loan.completed_at = datetime.utcnow()
            
            return {
                "success": True,
                "loan_status": "REPAID",
                "total_paid": loan.amount_repaid,
                "message": "Loan fully repaid!"
            }
        
        return {
            "success": True,
            "loan_status": "ACTIVE",
            "amount_paid": amount,
            "remaining": loan.remaining_amount
        }
    
    def liquidate(self, loan_id: str) -> bool:
        """
        Liquidate an overdue loan
        
        Emits: LoanLiquidated(loanId, agentId)
        """
        loan = self.loans.get(loan_id)
        if not loan or not loan.is_overdue:
            return False
        
        loan.status = LoanStatus.LIQUIDATED
        loan.completed_at = datetime.utcnow()
        
        # Seize collateral (simulated)
        self.pool_balance += loan.collateral_amount
        
        return True
    
    def get_loan(self, loan_id: str) -> Optional[Loan]:
        """Get loan by ID"""
        return self.loans.get(loan_id)
    
    def get_agent_loans(self, agent_id: str) -> List[Loan]:
        """Get all loans for an agent"""
        loan_ids = self.agent_loans.get(agent_id, [])
        return [self.loans[lid] for lid in loan_ids if lid in self.loans]
    
    def get_active_loans(self) -> List[Loan]:
        """Get all active loans"""
        return [l for l in self.loans.values() if l.status == LoanStatus.ACTIVE]
    
    def get_pool_stats(self) -> dict:
        """Get lending pool statistics"""
        active_loans = [l for l in self.loans.values() if l.status == LoanStatus.ACTIVE]
        
        return {
            "pool_balance": self.pool_balance,
            "total_borrowed": self.total_borrowed,
            "total_repaid": self.total_repaid,
            "active_loans": len(active_loans),
            "total_loans": len(self.loans),
            "utilization_rate": (self.total_borrowed - self.total_repaid) / 1_000_000 * 100
        }
