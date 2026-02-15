# RetainAI - NBFC Loan Foreclosure Prediction System

An AI-powered early warning system for predicting loan foreclosures and enabling proactive customer retention for Non-Banking Financial Companies (NBFCs).

![Dashboard Preview](https://via.placeholder.com/800x400?text=RetainAI+Dashboard)

## 🎯 What It Does

RetainAI predicts which loan customers are likely to foreclose/exit and recommends targeted retention actions:

| Feature | Description |
|---------|-------------|
| **Foreclosure Prediction** | ML model predicts exit probability (0-100%) for each customer |
| **Time-to-Foreclosure** | Estimates days until likely exit using survival analysis |
| **Revenue at Risk** | Calculates potential revenue loss per customer |
| **Exit Reason Analysis** | Identifies WHY customers may leave (BT intent, rate sensitivity, etc.) |
| **Behavioral Signals** | Tracks payment delays, competitor inquiries, prepayments |
| **AI Action Engine** | Recommends retention actions with expected success rates |

## 🧠 How the ML Model Works

**Nothing is hardcoded.** All predictions are calculated dynamically:

### 1. Feature Engineering (`ml/feature_engineering.py`)
Extracts 15+ signals from customer data:
- Payment behavior (delay counts, average delays)
- Balance transfer inquiry activity
- Prepayment patterns
- Tenure remaining vs. total
- Outstanding principal ratios
- Credit score changes

### 2. Risk Scoring (`ml/predict.py`)
```python
# Weighted risk calculation (not hardcoded!)
risk_score = (
    bt_inquiry_signal * 0.35 +      # Balance transfer intent
    payment_delay_signal * 0.25 +    # Payment behavior
    tenure_risk_signal * 0.15 +      # Remaining tenure risk
    principal_ratio_signal * 0.15 +  # Outstanding amount
    credit_deterioration * 0.10      # Credit score changes
)
```

### 3. Time-to-Foreclosure
Uses survival analysis concepts to estimate days until exit based on:
- Current risk score
- Historical exit patterns
- Customer segment behavior

### 4. Revenue at Risk
```python
revenue_at_risk = outstanding_principal * remaining_tenure_months * (interest_rate / 12)
```

### 5. AI Action Recommendations
Dynamically generated based on:
- Customer's specific risk factors
- Competitor offers detected
- Outstanding loan value
- Historical success rates of interventions

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (HTML/CSS/JS)                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │ Stats   │  │ Trend   │  │ Customer│  │ Action Engine   │ │
│  │ Cards   │  │ Chart   │  │ Table   │  │ (AI Recommend)  │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘ │
└───────┼────────────┼────────────┼────────────────┼──────────┘
        │            │            │                │
        ▼            ▼            ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                   Flask REST API Backend                     │
│  /dashboard/stats  /foreclosure-trend  /recommended-actions │
└─────────────────────────────┬───────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│   SQLite DB  │    │  ML Pipeline │    │ Feature Engineer │
│  - customers │    │  - predict   │    │  - extract       │
│  - loans     │    │  - score     │    │  - transform     │
│  - payments  │    │  - explain   │    │  - encode        │
└──────────────┘    └──────────────┘    └──────────────────┘
```

## 📊 API Endpoints

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login with email/password, returns JWT |
| `/api/auth/me` | GET | Get current user info |

### Dashboard (Dynamic Data)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/stats` | GET | KPIs with % change from previous period |
| `/api/dashboard/foreclosure-trend` | GET | 30-day projection by risk level |
| `/api/customers` | GET | Customer list sorted by risk |

### Customer Profile (All Calculated)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/customers/<id>` | GET | Full customer + loan + prediction data |
| `/api/customers/<id>/exit-reasons` | GET | Dynamic exit probability breakdown |
| `/api/customers/<id>/behavioral-signals` | GET | Payment/BT/prepayment timeline |
| `/api/customers/<id>/recommended-actions` | GET | AI actions with retention lift % |

### Actions
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/actions` | POST | Log retention action |
| `/api/predict/<loan_id>` | POST | Trigger fresh prediction |

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip

### Installation

```bash
# Clone/navigate to project
cd fore

# Install dependencies
pip install -r requirements.txt

# Start server (auto-initializes DB with seed data)
python backend/app.py
```

### Access
Open http://localhost:5000

**Test Credentials:**
- RM Login: `rm1@nbfc.com` / `password123`
- Manager Login: `manager@nbfc.com` / `password123`

## 📁 Project Structure

```
fore/
├── backend/
│   ├── app.py          # Flask API (27 endpoints)
│   ├── database.py     # SQLite connection utilities
│   ├── auth.py         # JWT auth + RBAC
│   └── models.py       # Data classes
├── ml/
│   ├── feature_engineering.py  # Feature extraction pipeline
│   └── predict.py              # Risk scoring + recommendations
├── database/
│   ├── schema.sql      # Table definitions
│   ├── seed_data.py    # 150 customers, 3000+ payments
│   └── nbfc.db         # SQLite database
├── frontend/
│   ├── index.html      # Dashboard UI
│   ├── styles.css      # Light theme CSS
│   └── app.js          # Chart.js + API integration
└── requirements.txt
```

## 🔐 Security Features

- **JWT Authentication** - Token-based API security
- **Role-Based Access Control** - RM, Manager, Admin roles
- **PII Masking** - Phone numbers masked in responses
- **Audit Logging** - All actions logged with timestamps
- **Password Hashing** - SHA-256 hashed passwords

## 📈 Key Metrics Tracked

| Metric | Calculation |
|--------|-------------|
| Revenue Saved | Sum of revenue_at_risk for RETAINED customers |
| Intervention Success | Retained ÷ Total completed actions |
| Avg Early Detection | Mean time_to_foreclosure at action date |
| Loans at Risk | Count of HIGH risk category loans |

## 🛠️ Tech Stack

- **Backend:** Python Flask
- **Database:** SQLite
- **ML:** NumPy, Pandas, Scikit-learn, XGBoost
- **Frontend:** Vanilla JS, Chart.js
- **Auth:** PyJWT

## 📝 License

MIT License - Built for NBFC hackathon demonstration.

---

**Built with ❤️ for proactive customer retention**
