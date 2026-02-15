"""
SQLAlchemy ORM Models for Regulatory Sentinel
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, String, Text, Float, DateTime, ForeignKey, 
    Boolean, JSON, create_engine, event
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.pool import StaticPool

Base = declarative_base()


class Policy(Base):
    """Internal bank policy record"""
    __tablename__ = "policies"
    
    policy_id = Column(String(20), primary_key=True)  # e.g., "POL-0001"
    policy_name = Column(String(500), nullable=False)
    policy_text = Column(Text, nullable=False)  # Long-form structured text
    domain = Column(String(100), nullable=False)  # AI, AML, Credit Risk, etc.
    mapped_regulations = Column(JSON)  # ["EU AI Act", "Basel III"]
    risk_level = Column(String(20))  # Low, Medium, High
    owner_team = Column(String(100))
    last_updated = Column(DateTime, default=datetime.utcnow)
    version = Column(String(20), default="v1.0")
    embedding_id = Column(String(100))  # Reference to vector store
    is_active = Column(Boolean, default=True)
    
    # Relationships
    versions = relationship("PolicyVersion", back_populates="policy")
    impact_analyses = relationship("ImpactAnalysis", back_populates="policy")
    change_proposals = relationship("ChangeProposal", back_populates="policy")
    
    def to_dict(self):
        return {
            "policy_id": self.policy_id,
            "policy_name": self.policy_name,
            "policy_text": self.policy_text,
            "domain": self.domain,
            "mapped_regulations": self.mapped_regulations,
            "risk_level": self.risk_level,
            "owner_team": self.owner_team,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
            "version": self.version
        }


class Regulation(Base):
    """Regulatory document"""
    __tablename__ = "regulations"
    
    regulation_id = Column(String(100), primary_key=True)
    regulation_name = Column(String(500), nullable=False)
    source_file = Column(String(500))
    raw_text = Column(Text)
    ingestion_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="PENDING")  # PENDING, PROCESSED, FAILED
    
    # Relationships
    clauses = relationship("Clause", back_populates="regulation")
    
    def to_dict(self):
        return {
            "regulation_id": self.regulation_id,
            "regulation_name": self.regulation_name,
            "source_file": self.source_file,
            "ingestion_date": self.ingestion_date.isoformat() if self.ingestion_date else None,
            "status": self.status,
            "clause_count": len(self.clauses) if self.clauses else 0
        }


class Clause(Base):
    """Regulatory clause extracted from document"""
    __tablename__ = "clauses"
    
    clause_id = Column(String(100), primary_key=True)  # e.g., "ART10_3"
    regulation_id = Column(String(100), ForeignKey("regulations.regulation_id"))
    clause_number = Column(String(50))
    clause_text = Column(Text, nullable=False)
    risk_tags = Column(JSON)  # ["AI", "Data Governance"]
    embedding_id = Column(String(100))
    
    # Relationships
    regulation = relationship("Regulation", back_populates="clauses")
    impact_analyses = relationship("ImpactAnalysis", back_populates="clause")
    
    def to_dict(self):
        return {
            "clause_id": self.clause_id,
            "regulation_id": self.regulation_id,
            "clause_number": self.clause_number,
            "clause_text": self.clause_text,
            "risk_tags": self.risk_tags
        }


class ImpactAnalysis(Base):
    """Policy impact analysis result"""
    __tablename__ = "impact_analyses"
    
    analysis_id = Column(String(100), primary_key=True)
    regulation_id = Column(String(100), ForeignKey("regulations.regulation_id"))
    policy_id = Column(String(20), ForeignKey("policies.policy_id"))
    clause_id = Column(String(100), ForeignKey("clauses.clause_id"))
    impact_score = Column(Float)  # 0.0 - 1.0
    impact_level = Column(String(20))  # Low, Medium, High
    reason = Column(Text)  # Explainability text
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    policy = relationship("Policy", back_populates="impact_analyses")
    clause = relationship("Clause", back_populates="impact_analyses")
    
    def to_dict(self):
        return {
            "analysis_id": self.analysis_id,
            "regulation_id": self.regulation_id,
            "policy_id": self.policy_id,
            "clause_id": self.clause_id,
            "impact_score": self.impact_score,
            "impact_level": self.impact_level,
            "reason": self.reason,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class ChangeProposal(Base):
    """Policy change proposal awaiting human approval"""
    __tablename__ = "change_proposals"
    
    proposal_id = Column(String(100), primary_key=True)
    policy_id = Column(String(20), ForeignKey("policies.policy_id"))
    regulation_clause = Column(String(200))  # e.g., "EU AI Act – Article 10(3)"
    change_type = Column(String(100))  # New Mandatory Control, Threshold Change, etc.
    before_text = Column(Text)
    after_proposed_text = Column(Text)
    diff_summary = Column(Text)
    highlighted_changes = Column(JSON)  # {added: [], removed: [], modified: []}
    confidence = Column(Float)  # 0.0 - 1.0
    risk_level = Column(String(20))
    assumptions = Column(JSON)  # List of assumptions made
    
    # Approval workflow
    status = Column(String(50), default="PENDING")  # PENDING, APPROVED, REJECTED, MODIFIED
    reviewer_id = Column(String(100))
    reviewed_at = Column(DateTime)
    review_comments = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    policy = relationship("Policy", back_populates="change_proposals")
    
    def to_dict(self):
        return {
            "proposal_id": self.proposal_id,
            "policy_id": self.policy_id,
            "policy_name": self.policy.policy_name if self.policy else None,
            "regulation_clause": self.regulation_clause,
            "change_type": self.change_type,
            "before_text": self.before_text,
            "after_proposed_text": self.after_proposed_text,
            "diff_summary": self.diff_summary,
            "highlighted_changes": self.highlighted_changes,
            "confidence": self.confidence,
            "risk_level": self.risk_level,
            "assumptions": self.assumptions,
            "status": self.status,
            "reviewer_id": self.reviewer_id,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "review_comments": self.review_comments,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class AuditLog(Base):
    """Comprehensive audit trail"""
    __tablename__ = "audit_logs"
    
    log_id = Column(String(100), primary_key=True)
    action_type = Column(String(100), nullable=False)  # POLICY_GENERATED, REGULATION_INGESTED, etc.
    entity_type = Column(String(50))  # policy, regulation, proposal
    entity_id = Column(String(100))
    performed_by = Column(String(100))  # SYSTEM, user_id
    performed_at = Column(DateTime, default=datetime.utcnow)
    details = Column(JSON)  # Full context as JSON
    model_reasoning = Column(Text)  # AI explanation
    human_decision = Column(String(50))  # APPROVE, REJECT, MODIFY
    input_prompt = Column(Text)  # LLM input for audit
    output_response = Column(Text)  # LLM output for audit
    
    def to_dict(self):
        return {
            "log_id": self.log_id,
            "action_type": self.action_type,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "performed_by": self.performed_by,
            "performed_at": self.performed_at.isoformat() if self.performed_at else None,
            "details": self.details,
            "model_reasoning": self.model_reasoning,
            "human_decision": self.human_decision
        }


class PolicyVersion(Base):
    """Version history for policies"""
    __tablename__ = "policy_versions"
    
    version_id = Column(String(100), primary_key=True)
    policy_id = Column(String(20), ForeignKey("policies.policy_id"))
    version_number = Column(String(20))
    policy_text = Column(Text)
    changed_by = Column(String(100))
    change_reason = Column(Text)
    proposal_id = Column(String(100))  # Link to approved proposal
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    policy = relationship("Policy", back_populates="versions")
    
    def to_dict(self):
        return {
            "version_id": self.version_id,
            "policy_id": self.policy_id,
            "version_number": self.version_number,
            "changed_by": self.changed_by,
            "change_reason": self.change_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class WorkflowState(Base):
    """Track LangGraph workflow execution state"""
    __tablename__ = "workflow_states"
    
    workflow_id = Column(String(100), primary_key=True)
    regulation_id = Column(String(100))
    current_phase = Column(String(50))  # INGESTION, ANALYSIS, DIFF, REMEDIATION, APPROVAL
    status = Column(String(50), default="RUNNING")  # RUNNING, PAUSED, COMPLETED, FAILED
    policy_count = Column(String(20), default="0")
    started_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    state_data = Column(JSON)  # Full state snapshot
    error_message = Column(Text)
    
    def to_dict(self):
        return {
            "workflow_id": self.workflow_id,
            "regulation_id": self.regulation_id,
            "current_phase": self.current_phase,
            "status": self.status,
            "policy_count": self.policy_count,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
