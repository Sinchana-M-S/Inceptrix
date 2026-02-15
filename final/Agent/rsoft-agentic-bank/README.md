# RSoft Agentic Bank

> **Trustless Banking System for Autonomous AI Agents**

A production-ready MVP implementing a decentralized financial system where AI agents can autonomously manage banking operations through the **Know Your Agent (KYA)** protocol.

---

## 🎯 What This System Does

RSoft Agentic Bank enables **AI agents** to:

- **Register with KYA Protocol** - Code-based identity verification (no human credentials)
- **Undergo Multi-Agent Risk Scoring** - 5 specialized AI agents evaluate risk in real-time
- **Request & Manage Loans Autonomously** - Dynamic interest rates based on risk profile
- **Build Reputation Over Time** - Separate long-term reputation system

---

## ⚙️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      EVENT-DRIVEN ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐           │
│   │ Agent        │     │ Loan         │     │ Repayment    │           │
│   │ Registered   │     │ Requested    │     │ Made         │           │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘           │
│          │                    │                    │                    │
│          ▼                    ▼                    ▼                    │
│   ┌─────────────────────────────────────────────────────────────┐      │
│   │                      EVENT BUS                               │      │
│   │  Captures all system events and triggers appropriate handlers│      │
│   └────────────────────────────┬────────────────────────────────┘      │
│                                │                                        │
│                                ▼                                        │
│   ┌─────────────────────────────────────────────────────────────┐      │
│   │                  SYSTEM ORCHESTRATOR                         │      │
│   │  • Controls WHEN agents execute (not agents themselves)      │      │
│   │  • Agents are AUTONOMOUS in reasoning                        │      │
│   │  • But ORCHESTRATED in execution                             │      │
│   └────────────────────────────┬────────────────────────────────┘      │
│                                │                                        │
│          ┌────────────────────┬┴───────────────────┐                   │
│          ▼                    ▼                    ▼                    │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐              │
│   │ Risk Score  │     │ Reputation  │     │   Lending   │              │
│   │   Engine    │     │   Engine    │     │  Decision   │              │
│   │ (volatile)  │     │ (smoothed)  │     │             │              │
│   └─────────────┘     └─────────────┘     └─────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔔 Event-Driven Risk Scoring

Risk scoring is **NOT** "on-demand". It's **triggered by events**:

| Event | Trigger | Action |
|-------|---------|--------|
| `AGENT_REGISTERED` | New KYA identity | Initial risk assessment |
| `LOAN_REQUESTED` | Agent requests loan | Full multi-agent evaluation |
| `LOAN_REPAID` | Payment received | Update risk + reputation |
| `ABNORMAL_BEHAVIOR` | Anomaly detected | Immediate re-scoring |
| `MARKET_UPDATE` | External conditions | Background recalculation |

```python
# Event flow (not direct function calls)
Event → Event Bus → Orchestrator → Risk Agents → State Update → Decision
```

---

## 🤖 Who Controls the AI Agents?

**Critical architecture decision:** Agents are autonomous in reasoning, but orchestrated in execution.

```
┌────────────────────────────────────────────────────────────┐
│                    SYSTEM ORCHESTRATOR                      │
│                                                             │
│  1. TRIGGER  - Decides WHEN to invoke scoring agents        │
│  2. COORDINATE - Manages parallel agent execution           │
│  3. AGGREGATE - Combines outputs into final score           │
│  4. ENFORCE - Applies business rules and limits             │
│                                                             │
│  Agents CANNOT:                                             │
│  ✗ Modify state directly                                    │
│  ✗ Run without orchestrator permission                      │
│  ✗ Make final lending decisions alone                       │
│                                                             │
│  Agents CAN:                                                │
│  ✓ Analyze data autonomously                                │
│  ✓ Provide independent scores                               │
│  ✓ Explain their reasoning                                  │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 Risk Score vs Reputation (Decoupled!)

These are **NOT** the same thing:

| Aspect | Risk Score | Reputation |
|--------|------------|------------|
| **Nature** | Volatile, real-time | Stable, smoothed |
| **Time Horizon** | Current state | 90-day rolling average |
| **Recovery** | Instant with good data | Slow, requires time |
| **Formula** | Multi-agent weighted sum | Cumulative + penalties |
| **Use Case** | Loan approval | Interest rates, limits |

### Risk Score (0-100)
```
Recalculated on EVERY event
= (Behavior × 0.20) + (Performance × 0.25) + (Transaction × 0.30) 
  + (Integrity × 0.15) + (Market × 0.10)
```

### Reputation (Points → Tiers)
```
Accumulated over time with smoothing
= Previous Points + Event Impact × Penalty Multiplier

Tiers: UNVERIFIED → BRONZE → SILVER → GOLD → PLATINUM
```

---

## 🚫 No Hardcoded Values

**Everything is model-driven:**

### Agent Model (`models/agent.py`)
```python
class Agent(BaseModel):
    agent_id: str              # Auto-generated UUID
    wallet_address: str        # Auto-generated Ethereum address
    code_hash: str             # SHA-256 of agent code
    risk_score: float          # Calculated (0-100)
    reputation_level: Enum     # From ReputationEngine
```

### Dynamic Calculations
| Parameter | Formula |
|-----------|---------|
| Interest Rate | `25% - (risk_score × 0.2)` (min 5%) |
| Max Loan | `pool_balance × risk_score / 100` |
| Collateral | `loan_amount × (1.5 - risk_score / 100)` |
| Reputation Impact | `base_impact × penalty_multiplier` |

---

## 📦 Project Structure

```
rsoft-agentic-bank/
├── backend/
│   ├── main.py                 # FastAPI entry point
│   ├── models/
│   │   ├── agent.py            # Agent Pydantic models
│   │   └── loan.py             # Loan Pydantic models
│   ├── services/
│   │   ├── event_bus.py        # Event-driven architecture
│   │   ├── orchestrator.py     # System agent controller
│   │   ├── reputation.py       # Decoupled reputation engine
│   │   ├── kya_protocol.py     # KYA identity engine
│   │   └── risk_scoring.py     # Multi-agent risk scorer
│   ├── contracts/
│   │   ├── registry.py         # Simulated AgentRegistry
│   │   └── lending_pool.py     # Simulated LendingPool
│   └── routers/
│       ├── agents.py           # Agent API endpoints
│       └── lending.py          # Lending API endpoints
│
└── frontend/                   # Next.js React app
```

---

## 🚀 Quick Start

### Backend
```bash
cd rsoft-agentic-bank/backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd rsoft-agentic-bank/frontend
npm install
npm run dev
```

### API Documentation
Open http://localhost:8000/docs for Swagger UI

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/agents/` | List all registered agents |
| `POST` | `/api/agents/register` | Register new agent (KYA) |
| `GET` | `/api/agents/{id}` | Get agent details |
| `GET` | `/api/agents/{id}/risk-evaluation` | Trigger risk evaluation |
| `GET` | `/api/lending/pool/stats` | Get pool statistics |
| `POST` | `/api/lending/request` | Request a loan (triggers events) |
| `POST` | `/api/lending/repay` | Repay a loan (triggers events) |

---

## 🧠 Multi-Agent Risk Scoring

Five specialized agents evaluate each AI agent:

| Agent | Weight | Scores |
|-------|--------|--------|
| **BehaviorAgent** | 20% | Action patterns, anomalies |
| **PerformanceAgent** | 25% | Success/failure rates |
| **TransactionAgent** | 30% | Loan repayment history |
| **IntegrityAgent** | 15% | Code hash verification |
| **MarketRiskAgent** | 10% | External conditions |

---

## 📄 License

MIT License - Built for RSoft Innovation Lab
