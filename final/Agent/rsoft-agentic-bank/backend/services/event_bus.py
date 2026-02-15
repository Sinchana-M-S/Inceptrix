"""
Event Bus - Event-Driven Architecture for RSoft Agentic Bank

Risk scoring is TRIGGERED by events, not called on-demand.
This ensures real-time, reactive risk evaluation.
"""

from enum import Enum
from typing import Callable, Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass, field
import asyncio


class EventType(Enum):
    """System events that trigger risk re-evaluation"""
    AGENT_REGISTERED = "agent_registered"
    LOAN_REQUESTED = "loan_requested"
    LOAN_APPROVED = "loan_approved"
    LOAN_REPAID = "loan_repaid"
    LOAN_DEFAULTED = "loan_defaulted"
    ABNORMAL_BEHAVIOR = "abnormal_behavior"
    REPUTATION_CHANGED = "reputation_changed"
    MARKET_UPDATE = "market_update"


@dataclass
class Event:
    """Immutable event record"""
    event_type: EventType
    agent_id: str
    payload: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.utcnow)
    source: str = "system"


class EventBus:
    """
    Central Event Bus for the Agentic Bank system.
    
    Events flow through here and trigger appropriate handlers:
    - Risk scoring engine subscribes to relevant events
    - Reputation system subscribes to behavior events
    - Audit log captures all events
    """
    
    def __init__(self):
        self._subscribers: Dict[EventType, List[Callable]] = {}
        self._event_log: List[Event] = []
        self._async_subscribers: Dict[EventType, List[Callable]] = {}
    
    def subscribe(self, event_type: EventType, handler: Callable):
        """Subscribe a handler to an event type"""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)
    
    def subscribe_async(self, event_type: EventType, handler: Callable):
        """Subscribe an async handler"""
        if event_type not in self._async_subscribers:
            self._async_subscribers[event_type] = []
        self._async_subscribers[event_type].append(handler)
    
    def emit(self, event: Event):
        """
        Emit an event - triggers all subscribed handlers.
        This is the core of event-driven architecture.
        """
        # Log the event
        self._event_log.append(event)
        
        # Notify sync subscribers
        handlers = self._subscribers.get(event.event_type, [])
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                print(f"Event handler error: {e}")
    
    async def emit_async(self, event: Event):
        """Emit event and await async handlers"""
        self._event_log.append(event)
        
        handlers = self._async_subscribers.get(event.event_type, [])
        for handler in handlers:
            try:
                await handler(event)
            except Exception as e:
                print(f"Async event handler error: {e}")
    
    def get_events(self, agent_id: Optional[str] = None, event_type: Optional[EventType] = None) -> List[Event]:
        """Query event log"""
        events = self._event_log
        if agent_id:
            events = [e for e in events if e.agent_id == agent_id]
        if event_type:
            events = [e for e in events if e.event_type == event_type]
        return events


# Singleton event bus instance
event_bus = EventBus()


# ==================== Event Emission Helpers ====================

def emit_agent_registered(agent_id: str, agent_data: dict):
    """Emit when a new agent completes KYA registration"""
    event_bus.emit(Event(
        event_type=EventType.AGENT_REGISTERED,
        agent_id=agent_id,
        payload={"agent_data": agent_data},
        source="kya_protocol"
    ))


def emit_loan_requested(agent_id: str, amount: float, loan_id: str):
    """Emit when an agent requests a loan"""
    event_bus.emit(Event(
        event_type=EventType.LOAN_REQUESTED,
        agent_id=agent_id,
        payload={"amount": amount, "loan_id": loan_id},
        source="lending_pool"
    ))


def emit_loan_repaid(agent_id: str, loan_id: str, amount: float, is_full: bool):
    """Emit when a loan repayment occurs"""
    event_bus.emit(Event(
        event_type=EventType.LOAN_REPAID,
        agent_id=agent_id,
        payload={"loan_id": loan_id, "amount": amount, "is_full_repayment": is_full},
        source="lending_pool"
    ))


def emit_abnormal_behavior(agent_id: str, behavior_type: str, severity: float):
    """Emit when abnormal behavior is detected"""
    event_bus.emit(Event(
        event_type=EventType.ABNORMAL_BEHAVIOR,
        agent_id=agent_id,
        payload={"behavior_type": behavior_type, "severity": severity},
        source="behavior_monitor"
    ))


def emit_market_update(market_condition: float):
    """Emit when market conditions change"""
    event_bus.emit(Event(
        event_type=EventType.MARKET_UPDATE,
        agent_id="system",
        payload={"market_condition": market_condition},
        source="market_oracle"
    ))
