# Autonomous Regulatory Sentinel (Reg-GenAI)

**Enterprise-Grade Cognitive Compliance Engine with Human-in-the-Loop Governance**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![Status](https://img.shields.io/badge/status-production--ready-green.svg)

## 🎯 Overview

Autonomous Regulatory Sentinel is a LangGraph-powered, multi-agent RegTech system that:

- **Ingests** regulatory updates (PDFs, legal text)
- **Generates** 1000+ realistic internal bank policies autonomously
- **Maps** regulation clauses → impacted policies using RAG
- **Produces** explainable, line-by-line policy diffs
- **Proposes** remediations with risk scoring
- **Enforces** mandatory human approval (non-bypassable)
- **Logs** complete audit trail for regulators

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     REGULATORY SENTINEL                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Agent 0  │  │ Agent 1  │  │ Agent 2  │  │ Agent 3  │        │
│  │Orchestrator│→│ Policy   │→│Regulation│→│RAG Impact│        │
│  │          │  │Generator │  │Ingestion │  │ Analysis │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                      ↓                           ↓              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Agent 7  │←─│ Agent 6  │←─│ Agent 5  │←─│ Agent 4  │        │
│  │  Audit   │  │  Human   │  │Remediation│  │  Diff   │        │
│  │Governance│  │ Approval │  │ Proposal │  │ Engine  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                      ↑                                          │
│               ⚠️ NON-BYPASSABLE GATE                            │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

```bash
# Clone repository
cd regulatory-sentinel

# Install dependencies
pip install -r requirements.txt

# Set up environment (optional - enables LLM features)
cp .env.example .env
# Edit .env to add your GOOGLE_API_KEY

# Run the system
python run.py
```

Then open:
- **Dashboard**: http://localhost:8000/dashboard
- **API Docs**: http://localhost:8000/docs

## 📋 Features

### 8 Specialized Agents

| Agent | Role | Key Responsibility |
|-------|------|-------------------|
| **Agent 0** | Orchestrator | Phase ordering, prerequisite checking |
| **Agent 1** | Policy Generator | Bootstrap 1000+ realistic bank policies |
| **Agent 2** | Regulatory Ingestion | PDF/text parsing, clause extraction |
| **Agent 3** | RAG Impact | Vector search, policy-clause matching |
| **Agent 4** | Diff Engine | Semantic diffs, obligation tracking |
| **Agent 5** | Remediation | Draft compliant policy updates |
| **Agent 6** | Human Approval | Non-bypassable governance gate |
| **Agent 7** | Audit | Logging, compliance reporting |

### Human-in-the-Loop Governance

🚫 **NO AUTO-DEPLOYMENT** - Every change requires explicit human approval:
- Approve
- Request Modification
- Reject

All decisions are logged with full audit trail.

### Policy Domains Covered

- AI Governance & Model Risk
- Anti-Money Laundering (AML)
- Credit Risk Management
- Data Privacy & GDPR
- Cybersecurity
- Lending & Consumer Protection
- KYC (Know Your Customer)
- Payments & Fraud
- Audit & Compliance

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | System health check |
| `/stats` | GET | Dashboard statistics |
| `/policies` | GET | List all policies |
| `/regulations` | GET | List ingested regulations |
| `/workflow/run` | POST | Run full analysis workflow |
| `/approvals/pending` | GET | Get pending proposals |
| `/approvals/{id}/approve` | POST | Approve a change |
| `/approvals/{id}/reject` | POST | Reject a change |
| `/audit/trail` | GET | View audit logs |
| `/audit/dashboard` | GET | Compliance dashboard data |

## 📊 Sample Output

### Policy Diff Example

```json
{
  "policy_id": "POL-0421",
  "regulation_clause": "EU AI Act – Article 10(3)",
  "impact_level": "High",
  "change_type": "New Mandatory Control",
  "diff_summary": "Introduces dataset bias monitoring requirement",
  "confidence": 0.93,
  "status": "PENDING"
}
```

### Impact Analysis Report

```json
{
  "total_policies_analyzed": 1000,
  "policies_impacted": 47,
  "risk_breakdown": {
    "High": 12,
    "Medium": 23,
    "Low": 12
  }
}
```

## 🛡️ Governance & Safety

- ✅ **Explainable AI** - All decisions include reasoning
- ✅ **Audit Trail** - Every action logged
- ✅ **Version Control** - Policy history preserved
- ✅ **Fail-Safe Defaults** - No silent failures
- ✅ **Regulator-Ready** - Complete compliance evidence

## 📁 Project Structure

```
regulatory-sentinel/
├── config.py              # Configuration
├── run.py                 # Quick start script
├── requirements.txt       # Dependencies
├── src/
│   ├── agents/           # 8 specialized agents
│   ├── api/              # FastAPI backend
│   ├── database/         # SQLAlchemy models
│   ├── graph/            # LangGraph workflow
│   ├── services/         # Diff service
│   └── utils/            # Prompts & utilities
├── frontend/             # Dashboard UI
└── data/
    ├── regulations/      # Sample regulations
    └── generated/        # Reports & outputs
```

## 🎯 Target Users

- **Tier-1 Banks** - Compliance automation
- **Financial Regulators** - Audit & oversight
- **RegTech Startups** - Foundation for products
- **Compliance Teams** - Efficiency tools

## 📜 License

MIT License - See LICENSE file for details.

---

**Built with ❤️ for the future of regulatory compliance**
