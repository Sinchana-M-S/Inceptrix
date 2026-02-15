import os
import json
import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    create_engine, Column, String, Text, Integer, Float, Boolean, DateTime
)
from sqlalchemy.dialects.sqlite import JSON as SQLITE_JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Engine/session will be created lazily in init_db to support env changes during tests
DATABASE_URL = None
engine = None
SessionLocal = None
Base = declarative_base()


def _ensure_engine():
    global DATABASE_URL, engine, SessionLocal
    url = os.getenv('DATABASE_URL', 'sqlite:///data/reggenai.db')
    if DATABASE_URL == url and engine is not None and SessionLocal is not None:
        return
    DATABASE_URL = url
    # recreate engine
    connect_args = {"check_same_thread": False} if DATABASE_URL.startswith('sqlite') else {}
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    SessionLocal = sessionmaker(bind=engine)


class Patch(Base):
    __tablename__ = 'patches'
    id = Column(String, primary_key=True, index=True)
    patch_id = Column(String, index=True)
    doc_id = Column(String, index=True)
    clause_id = Column(String, index=True)
    agent = Column(String, index=True)
    target = Column(String)
    field = Column(String, nullable=True)
    op = Column(String)
    value = Column(SQLITE_JSON)
    proposed_text = Column(Text, nullable=True)
    rationale = Column(Text, nullable=True)
    remediation = Column(SQLITE_JSON, nullable=True)
    normalized_values = Column(SQLITE_JSON, nullable=True)
    confidence = Column(Float, default=0.0)
    round = Column(Integer, default=0)
    status = Column(String, default='proposed', index=True)
    accepted_by = Column(String, nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    human_override = Column(Boolean, default=False)
    unified_diff = Column(Text, nullable=True)
    span_highlights = Column(SQLITE_JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class AuditEvent(Base):
    __tablename__ = 'audit_events'
    id = Column(String, primary_key=True, index=True)
    patch_id = Column(String, index=True)
    event_type = Column(String)
    payload = Column(SQLITE_JSON)
    actor = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


def init_db():
    _ensure_engine()
    Base.metadata.create_all(bind=engine)


def persist_proposal(patch: Dict[str, Any]):
    init_db()
    s = SessionLocal()
    try:
        p = Patch(
            id=patch.get('patch_id') or patch.get('id') or patch.get('patch_id'),
            patch_id=patch.get('patch_id'),
            doc_id=patch.get('doc_id'),
            clause_id=patch.get('clause_id'),
            agent=patch.get('agent'),
            target=patch.get('target'),
            field=patch.get('field'),
            op=patch.get('op'),
            value=patch.get('value'),
            proposed_text=patch.get('proposed_text'),
            rationale=patch.get('rationale'),
            remediation=patch.get('remediation'),
            normalized_values=patch.get('normalized_values'),
            confidence=float(patch.get('confidence', 0.0)),
            round=int(patch.get('round', 0)),
            status='proposed',
            created_at=datetime.datetime.utcnow(),
            updated_at=datetime.datetime.utcnow(),
        )
        s.add(p)
        # also create an audit event
        ev = AuditEvent(
            id=str(p.patch_id) + ':' + datetime.datetime.utcnow().isoformat(),
            patch_id=p.patch_id,
            event_type='proposal',
            payload=patch,
            actor=patch.get('agent'),
            timestamp=datetime.datetime.utcnow(),
        )
        s.add(ev)
        s.commit()
    except Exception:
        s.rollback()
        raise
    finally:
        s.close()


def persist_acceptance(chosen_patch: Dict[str, Any], before: Any, after: Any, unified: str, spans: List[Dict[str, Any]], reviewer: Optional[Dict[str, Any]] = None):
    init_db()
    s = SessionLocal()
    try:
        patch_id = chosen_patch.get('patch_id')
        p = s.query(Patch).filter(Patch.patch_id == patch_id).one_or_none()
        if not p:
            # create a new patch record if missing
            p = Patch(
                id=patch_id,
                patch_id=patch_id,
                doc_id=chosen_patch.get('doc_id'),
                clause_id=chosen_patch.get('clause_id'),
                agent=chosen_patch.get('agent'),
                target=chosen_patch.get('target'),
                field=chosen_patch.get('field'),
                op=chosen_patch.get('op'),
                value=chosen_patch.get('value'),
                proposed_text=chosen_patch.get('proposed_text'),
                rationale=chosen_patch.get('rationale'),
                remediation=chosen_patch.get('remediation'),
                normalized_values=chosen_patch.get('normalized_values'),
                confidence=float(chosen_patch.get('confidence', 0.0)),
                round=int(chosen_patch.get('round', 0)),
                status='accepted',
                accepted_by=(reviewer.get('reviewer_id') if reviewer else None),
                accepted_at=datetime.datetime.utcnow(),
                human_override=(reviewer.get('human_override') if reviewer else False),
                unified_diff=unified,
                span_highlights=spans,
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow(),
            )
            s.add(p)
        else:
            p.status = 'accepted'
            p.accepted_by = (reviewer.get('reviewer_id') if reviewer else None)
            p.accepted_at = datetime.datetime.utcnow()
            p.human_override = (reviewer.get('human_override') if reviewer else False)
            p.unified_diff = unified
            p.span_highlights = spans
            p.updated_at = datetime.datetime.utcnow()
        ev = AuditEvent(
            id=str(p.patch_id) + ':' + datetime.datetime.utcnow().isoformat(),
            patch_id=p.patch_id,
            event_type='accepted',
            payload={'before': before, 'after': after, 'chosen': chosen_patch},
            actor=(reviewer.get('reviewer_id') if reviewer else chosen_patch.get('agent')),
            timestamp=datetime.datetime.utcnow(),
        )
        s.add(ev)
        s.commit()
    except Exception:
        s.rollback()
        raise
    finally:
        s.close()


def get_patches_by_doc(doc_id: str, status: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    init_db()
    s = SessionLocal()
    try:
        q = s.query(Patch).filter(Patch.doc_id == doc_id)
        if status:
            q = q.filter(Patch.status == status)
        rows = q.order_by(Patch.created_at.desc()).limit(limit).offset(offset).all()
        out = []
        for r in rows:
            out.append({
                'patch_id': r.patch_id,
                'doc_id': r.doc_id,
                'clause_id': r.clause_id,
                'agent': r.agent,
                'target': r.target,
                'field': r.field,
                'op': r.op,
                'value': r.value,
                'proposed_text': r.proposed_text,
                'rationale': r.rationale,
                'remediation': r.remediation,
                'confidence': r.confidence,
                'round': r.round,
                'status': r.status,
                'accepted_by': r.accepted_by,
                'accepted_at': r.accepted_at.isoformat() if r.accepted_at else None,
                'human_override': r.human_override,
                'unified_diff': r.unified_diff,
                'span_highlights': r.span_highlights,
                'created_at': r.created_at.isoformat() if r.created_at else None,
            })
        return out
    finally:
        s.close()


def review_patch(patch_id: str, review_action: str, reviewer_id: str, review_comments: Optional[str] = None, human_override: bool = False):
    init_db()
    s = SessionLocal()
    try:
        p = s.query(Patch).filter(Patch.patch_id == patch_id).one_or_none()
        if not p:
            return None
        if review_action == 'accept':
            p.status = 'accepted'
            p.accepted_by = reviewer_id
            p.accepted_at = datetime.datetime.utcnow()
            p.human_override = human_override
        elif review_action == 'reject':
            p.status = 'rejected'
            p.updated_at = datetime.datetime.utcnow()
        else:
            # request_changes or other actions
            p.status = 'proposed'
            p.updated_at = datetime.datetime.utcnow()
        ev = AuditEvent(
            id=str(p.patch_id) + ':' + datetime.datetime.utcnow().isoformat(),
            patch_id=p.patch_id,
            event_type='review',
            payload={'action': review_action, 'comments': review_comments},
            actor=reviewer_id,
            timestamp=datetime.datetime.utcnow(),
        )
        s.add(ev)
        s.commit()
        return {
            'patch_id': p.patch_id,
            'status': p.status,
            'accepted_by': p.accepted_by,
            'accepted_at': p.accepted_at.isoformat() if p.accepted_at else None,
        }
    finally:
        s.close()


# ----------------------
# Policy store and apply helpers
# ----------------------
import uuid


class Policy(Base):
    __tablename__ = 'policies'
    id = Column(String, primary_key=True, index=True)
    policy_id = Column(String, unique=True, index=True)
    policy_text = Column(Text)
    meta = Column(SQLITE_JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class PolicyVersion(Base):
    __tablename__ = 'policy_versions'
    id = Column(String, primary_key=True, index=True)
    policy_id = Column(String, index=True)
    policy_text = Column(Text)
    meta = Column(SQLITE_JSON, nullable=True)
    changed_at = Column(DateTime, default=datetime.datetime.utcnow)
    changed_by = Column(String, nullable=True)


def create_or_update_policy(policy_id: str, policy_text: str, metadata: Optional[Dict[str, Any]] = None, author: Optional[str] = None):
    _ensure_engine()
    s = SessionLocal()
    try:
        existing = s.query(Policy).filter(Policy.policy_id == policy_id).one_or_none()
        if existing:
            # record previous version
            pv = PolicyVersion(
                id=str(uuid.uuid4()),
                policy_id=policy_id,
                policy_text=existing.policy_text,
                metadata=existing.metadata,
                changed_at=datetime.datetime.utcnow(),
                changed_by=author,
            )
            s.add(pv)
            existing.policy_text = policy_text
            existing.metadata = metadata or existing.metadata
            existing.updated_at = datetime.datetime.utcnow()
        else:
            p = Policy(
                id=str(uuid.uuid4()),
                policy_id=policy_id,
                policy_text=policy_text,
                metadata=metadata or {},
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow(),
            )
            s.add(p)
        s.commit()
    except Exception:
        s.rollback()
        raise
    finally:
        s.close()


def get_policy(policy_id: str) -> Optional[Dict[str, Any]]:
    _ensure_engine()
    s = SessionLocal()
    try:
        p = s.query(Policy).filter(Policy.policy_id == policy_id).one_or_none()
        if not p:
            return None
        return {
            'policy_id': p.policy_id,
            'policy_text': p.policy_text,
            'metadata': p.metadata,
            'updated_at': p.updated_at.isoformat() if p.updated_at else None,
        }
    finally:
        s.close()


def apply_patch(patch_id: str, reviewer_id: str, human_override: bool = False):
    """Apply a patch by patch_id to the policy store. Returns dict or None on failure."""
    init_db()
    s = SessionLocal()
    try:
        p = s.query(Patch).filter(Patch.patch_id == patch_id).one_or_none()
        if not p:
            return None
        # Extract value and interpret first element as policy update
        val = p.value
        if isinstance(val, list) and len(val) > 0 and isinstance(val[0], dict):
            target = val[0]
            policy_id = target.get('policy_id') or str(uuid.uuid4())
            policy_text = target.get('policy_text') or ''
            create_or_update_policy(policy_id, policy_text, metadata=target.get('metadata'), author=reviewer_id)
            # mark patch as applied
            p.status = 'applied'
            p.accepted_by = reviewer_id
            p.accepted_at = datetime.datetime.utcnow()
            p.human_override = human_override
            ev = AuditEvent(
                id=str(p.patch_id) + ':apply:' + datetime.datetime.utcnow().isoformat(),
                patch_id=p.patch_id,
                event_type='applied',
                payload={'policy_id': policy_id, 'policy_text': policy_text},
                actor=reviewer_id,
                timestamp=datetime.datetime.utcnow(),
            )
            s.add(ev)
            s.commit()
            return {'status': 'applied', 'policy_id': policy_id}
        else:
            return None
    except Exception:
        s.rollback()
        raise
    finally:
        s.close()
