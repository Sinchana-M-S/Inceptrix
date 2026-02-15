# Shadow-Labor Ledger

> **Alternative Credit Scoring for Unpaid Caregivers**  
> *"We turn invisible caregiving work into a verifiable economic identity that banks can trust."*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## 🎯 Problem Statement

Millions of unpaid caregivers (primarily women) perform economically valuable but invisible labor:
- **Childcare** - Looking after children's daily needs
- **Elder care** - Caring for elderly family members
- **Housework** - Managing household duties
- **Community support** - Helping neighbors and community

Because this labor is unpaid, these individuals have:
- ❌ No economic identity
- ❌ No formal income records
- ❌ No access to loans or credit

**Traditional credit scoring fails them entirely.**

## 💡 Solution

Shadow-Labor Ledger converts unpaid caregiving work into a **Validated Contribution Score (VCS)** that:
- Captures daily activity logs and community testimony
- Uses NLP + AI validation
- Maps labor to local economic benchmarks
- Produces an explainable alternative credit score
- Enables micro-lending with VCS as collateral

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd shadow

# Install all dependencies
npm run install:all

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and secrets

# Seed demo data
cd server/seeds
node seedData.js
cd ../..

# Start development
npm run dev
```

This starts:
- Backend API: http://localhost:5000
- Frontend: http://localhost:3000

### Demo Accounts

| Role | Phone | Password |
|------|-------|----------|
| Caregiver | 9876543210 | password123 |
| Verifier | 9876543220 | password123 |
| Lender | 9876543230 | password123 |
| Admin | 9876543240 | admin123 |

---

## 🏗️ Architecture

```
shadow/
├── server/                    # Express.js Backend
│   ├── config/               # Database & VCS configuration
│   ├── models/               # MongoDB schemas
│   ├── routes/               # API endpoints
│   ├── services/             # VCS Engine, NLP, Fraud Detection
│   ├── middleware/           # Auth & RBAC
│   └── seeds/                # Demo data
│
├── client/                    # React Frontend
│   ├── src/
│   │   ├── context/          # Auth context
│   │   ├── pages/            # Role-based dashboards
│   │   └── services/         # API client
│   └── public/
│
└── package.json              # Root scripts
```

---

## 🧮 VCS Scoring Formula

**VCS = BaseScore × 10 - Penalties (0-1000 scale)**

### Score Components

| Component | Max Points | Weight |
|-----------|-----------|--------|
| Care Labor | 26 | Care hours, type, validation, continuity |
| Behavioral Finance | 23 | Payment patterns, utility bills, consistency |
| Social Trust | 19 | Community validations, verifier trust |
| Economic Proxies | 17 | Income signal, coop score, stability |
| Identity & Stability | 15 | SIM tenure, location, land verification |

### Risk Bands

| Band | Score Range | Loan Eligibility |
|------|-------------|------------------|
| None | 0-299 | Not eligible |
| Emerging | 300-499 | ₹5,000 |
| Credit Eligible | 500-699 | ₹15,000 |
| Low Risk | 700-849 | ₹30,000 |
| Prime | 850-1000 | ₹50,000 |

### Sample Output

```json
{
  "totalVCS": 742,
  "riskBand": "lowRisk",
  "humanExplanation": "This score reflects ~120 hrs/month of verified elder care equivalent to ₹9,600 in local market value.",
  "loanEligibility": {
    "eligible": true,
    "maxLoanAmount": 30000,
    "suggestedInterestBand": "low"
  }
}
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Caregiver
- `POST /api/activities` - Log activity
- `GET /api/activities` - Get my activities
- `GET /api/vcs/score` - Get VCS score
- `GET /api/vcs/breakdown` - Get detailed breakdown

### Verifier
- `POST /api/testimonies` - Submit testimony
- `GET /api/testimonies/pending` - Get pending verifications

### Lender (Credit Interface)
- `GET /api/lender/vcs-score/:id` - Get caregiver VCS
- `GET /api/lender/score-breakdown/:id` - Detailed breakdown
- `GET /api/lender/risk-bands` - Risk band definitions
- `GET /api/lender/credit-limit/:id` - Suggested credit limit

### Admin
- `GET /api/admin/bias-audit` - Bias analysis report
- `GET /api/admin/fraud-alerts` - Fraud detection alerts
- `GET /api/admin/model-drift` - Model drift monitoring

---

## 🔐 Security & Ethics

### Privacy First
- ✅ Coarse geo-location only
- ✅ PII minimization
- ✅ Encrypted data at rest & transit
- ✅ GDPR-like consent flows

### Ethical AI
- ✅ Fully explainable scores
- ✅ No punitive scoring for inactivity
- ✅ Bias auditing built-in
- ✅ Anti-collusion fraud detection

### Hard Constraints
- ❌ No black-box scoring
- ❌ No surveillance
- ❌ No cultural insensitivity

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Tailwind CSS, Recharts, Lucide Icons |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + Role-based access |
| AI/ML | Google Gemini API, Statistical ML Models |
| NLP | Keyword extraction, sentiment analysis, natural.js |
| Build | Vite |

---

## 🤖 AI/ML Integration

### AI Services

| Service | Description | Technology |
|---------|-------------|------------|
| `geminiAI.js` | NLP classification, loan prediction, explainability | Google Gemini API |
| `loanPredictionModel.js` | ML-based loan eligibility prediction | Weighted feature model |
| `statisticalFraudDetector.js` | Anomaly detection | Z-score analysis |
| `riskPredictionEngine.js` | Comprehensive risk assessment | Multi-factor analysis |

### AI API Endpoints

```
POST /api/ai/classify-activity     # AI-powered activity classification
GET  /api/ai/loan-prediction       # ML loan eligibility prediction
GET  /api/ai/loan-prediction/:id   # Prediction for specific caregiver
POST /api/ai/fraud-analysis        # Statistical fraud detection
GET  /api/ai/risk-assessment/:id   # Full risk assessment
GET  /api/ai/score-explanation     # AI-generated explanation
GET  /api/ai/status                # AI service health check
```

### Configuration

Add to `.env`:
```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

> **Note:** The system works in **fallback mode** without an API key using rule-based algorithms.

---

## 📊 Dashboards

### Caregiver Dashboard
- VCS score display with loan eligibility
- Activity logging with AI classification
- Community validation tracking
- Score trend visualization
- Improvement recommendations

### Verifier Dashboard
- Pending verifications queue
- Star rating system
- Validation history

### Lender Dashboard
- Caregiver search with filters
- Credit assessment modal
- Risk band visualization
- Score breakdown analysis

### Admin Dashboard
- System health monitoring
- Bias audit reports
- Fraud detection alerts
- Model drift tracking

---

## 🧪 Testing

```bash
# Run API tests
npm run test

# Seed fresh demo data
cd server/seeds && node seedData.js
```

---

## 📈 Evaluation Metrics

- **Fraud false-positive rate** - Minimize incorrect fraud flags
- **Gender bias score** - Monitor for demographic disparities
- **Loan repayment correlation** - Validate score predictiveness
- **Community trust score** - Measure verifier engagement

---

## 🚦 Future Roadmap

1. **Voice-to-text** - Multilingual activity logging
2. **Offline mode** - Low-connectivity support
3. **Blockchain proofs** - Tamper-proof contribution records
4. **Enhanced LLM integration** - Deeper AI insights
5. **Mobile app** - React Native version

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines before submitting PRs.

---

**Built with ❤️ for economic inclusion**

*Shadow-Labor Ledger - Turning invisible labor into visible opportunity*
