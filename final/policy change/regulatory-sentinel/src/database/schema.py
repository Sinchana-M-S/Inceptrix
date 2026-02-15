"""
Database initialization and session management
"""
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from config import DATABASE_URL, BASE_DIR
from src.database.models import Base, PolicyVersion  # PolicyVersion ensures table is created

# Create engine with proper settings for SQLite
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
    print(f"✓ Database initialized at {DATABASE_URL}")
    return True


def get_db() -> Session:
    """Get database session (dependency injection for FastAPI)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_session() -> Session:
    """Get a new database session (for standalone use)"""
    return SessionLocal()


def get_policy_count() -> int:
    """Get current policy count in database"""
    with SessionLocal() as session:
        result = session.execute(text("SELECT COUNT(*) FROM policies"))
        return result.scalar() or 0


def reset_db():
    """Drop and recreate all tables (for testing)"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("✓ Database reset complete")


if __name__ == "__main__":
    init_db()
    print(f"Policy count: {get_policy_count()}")
