"""
RSoft Agentic Bank - Backend API
Trustless Banking System for AI Agents
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

from routers import agents, lending
from services.kya_protocol import KYAProtocol
from contracts.registry import AgentRegistry
from contracts.lending_pool import LendingPool

load_dotenv()

# Initialize core services
kya_protocol = KYAProtocol()
agent_registry = AgentRegistry()
lending_pool = LendingPool(agent_registry)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("RSoft Agentic Bank - Starting...")
    print("KYA Protocol initialized")
    print("Risk scoring engine ready")
    yield
    # Shutdown
    print("RSoft Agentic Bank - Shutting down...")


app = FastAPI(
    title="RSoft Agentic Bank",
    description="Trustless Banking System for AI Agents with KYA Protocol",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware (3000 = Next.js dev; 5000 = integrated foreclosure/agent UI)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5000", "http://127.0.0.1:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(lending.router, prefix="/api/lending", tags=["Lending"])


@app.get("/")
async def root():
    return {
        "name": "RSoft Agentic Bank",
        "version": "1.0.0",
        "status": "operational",
        "protocol": "Know Your Agent (KYA)",
        "features": [
            "AI Agent Registration",
            "KYA Identity Protocol",
            "Real-time Risk Scoring",
            "Autonomous Lending/Borrowing"
        ]
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "services": {
        "kya_protocol": "active",
        "risk_engine": "active",
        "lending_pool": "active"
    }}


# Stub for external requests to /docs/doc-N/clauses (e.g. browser extensions) - avoids 404 noise in logs
@app.get("/docs/{doc_id}/clauses")
async def docs_clauses_stub(doc_id: str):
    return []


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
