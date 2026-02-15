"""
Database connection and initialization for NBFC Loan Foreclosure System.
"""
import sqlite3
import os
from pathlib import Path
from contextlib import contextmanager

# Database path
DB_DIR = Path(__file__).parent.parent / "database"
DB_PATH = DB_DIR / "nbfc.db"
SCHEMA_PATH = DB_DIR / "schema.sql"

def get_db_path():
    """Get the database file path."""
    return str(DB_PATH)

def init_db():
    """Initialize the database with schema."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    
    # Read and execute schema
    with open(SCHEMA_PATH, 'r') as f:
        schema = f.read()
    
    conn.executescript(schema)
    conn.commit()
    conn.close()
    
    print(f"Database initialized at {DB_PATH}")


def ensure_db():
    """Create DB and schema if missing or empty (no tables)."""
    if not DB_PATH.exists():
        init_db()
        return True
    conn = sqlite3.connect(str(DB_PATH))
    try:
        cur = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='employees' LIMIT 1"
        )
        if cur.fetchone() is None:
            conn.close()
            init_db()
            return True
    finally:
        conn.close()
    return False

def get_connection():
    """Get a database connection."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def execute_query(query: str, params: tuple = ()):
    """Execute a query and return results."""
    with get_db() as conn:
        cursor = conn.execute(query, params)
        return cursor.fetchall()

def execute_insert(query: str, params: tuple = ()):
    """Execute an insert and return the last row id."""
    with get_db() as conn:
        cursor = conn.execute(query, params)
        return cursor.lastrowid

def row_to_dict(row):
    """Convert a sqlite3.Row to a dictionary."""
    if row is None:
        return None
    return dict(row)

def rows_to_list(rows):
    """Convert sqlite3.Row objects to list of dictionaries."""
    return [dict(row) for row in rows]

if __name__ == "__main__":
    init_db()
