"""
Configuration management for Regulatory Sentinel
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Base paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
GENERATED_DIR = DATA_DIR / "generated"

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/regulatory_sentinel.db")
CHROMA_PERSIST_DIR = str(BASE_DIR / "chroma_db")

# API Keys
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

# Model Configuration
EMBEDDING_MODEL = "models/embedding-001"
LLM_MODEL = "gemini-1.5-flash"

# Policy Generation
MIN_POLICY_COUNT = 1000
POLICY_DOMAINS = [
    "AI",
    "AML",
    "Credit Risk", 
    "Data Privacy",
    "Cybersecurity",
    "Lending",
    "Audit",
    "Model Risk",
    "Payments",
    "KYC"
]

# Regulations
SUPPORTED_REGULATIONS = [
    "EU AI Act",
    "Basel III",
    "RBI Circular",
    "GDPR",
    "SEC",
    "FINRA",
    "PCI DSS",
    "SOX",
    "DORA",
    "MiFID II"
]

# Risk Levels
RISK_LEVELS = ["Low", "Medium", "High"]

# Owner Teams
OWNER_TEAMS = [
    "Compliance",
    "Legal",
    "Risk",
    "IT",
    "Data Science",
    "Operations",
    "Internal Audit",
    "Information Security"
]

# RAG Configuration
RAG_TOP_K = 10
SIMILARITY_THRESHOLD = 0.7

# Approval Statuses
APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "MODIFIED"]

# Ensure directories exist
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
