"""
Authentication and RBAC middleware for NBFC Loan Foreclosure System.
Uses JWT for token-based authentication. Requires PyJWT (pip install PyJWT).
Do not install the 'jwt' package - it is a different library; use PyJWT.
"""
import hashlib
import secrets
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, g

from database import get_db, row_to_dict

# Secret key for JWT (in production, use environment variable)
JWT_SECRET = secrets.token_hex(32)
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 24

def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt."""
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{password_hash}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against stored hash."""
    try:
        salt, password_hash = stored_hash.split(':')
        return hashlib.sha256((salt + password).encode()).hexdigest() == password_hash
    except ValueError:
        return False

def generate_token(employee_id: str, role: str, branch_id: str) -> str:
    """Generate a JWT token for authenticated user."""
    payload = {
        'employee_id': employee_id,
        'role': role,
        'branch_id': branch_id,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def authenticate(email: str, password: str) -> dict:
    """Authenticate user and return token if successful."""
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT * FROM employees WHERE email = ?",
            (email,)
        )
        employee = row_to_dict(cursor.fetchone())
    
    if not employee:
        return {'success': False, 'error': 'Invalid credentials'}
    
    if not verify_password(password, employee['password_hash']):
        return {'success': False, 'error': 'Invalid credentials'}
    
    token = generate_token(
        employee['employee_id'],
        employee['role'],
        employee['branch_id']
    )
    
    return {
        'success': True,
        'token': token,
        'employee': {
            'employee_id': employee['employee_id'],
            'name': employee['name'],
            'role': employee['role'],
            'branch_id': employee['branch_id']
        }
    }

def token_required(f):
    """Decorator to require a valid JWT token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'success': False, 'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'success': False, 'error': 'Token is missing'}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({'success': False, 'error': 'Invalid or expired token'}), 401
        
        # Store user info in flask g object
        g.employee_id = payload['employee_id']
        g.role = payload['role']
        g.branch_id = payload['branch_id']
        
        return f(*args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    """Decorator to require specific role(s)."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if g.role not in allowed_roles:
                return jsonify({
                    'success': False,
                    'error': f'Access denied. Required roles: {allowed_roles}'
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

def log_audit(employee_id: str, action: str, entity_type: str = None, 
              entity_id: str = None, details: str = None):
    """Log an action to the audit trail."""
    with get_db() as conn:
        conn.execute(
            """INSERT INTO audit_log (employee_id, action, entity_type, entity_id, details)
               VALUES (?, ?, ?, ?, ?)""",
            (employee_id, action, entity_type, entity_id, details)
        )

def get_current_employee():
    """Get current authenticated employee info."""
    return {
        'employee_id': g.employee_id,
        'role': g.role,
        'branch_id': g.branch_id
    }
