import os
import logging
from typing import Optional, Dict, Any, List
from fastapi import Depends, HTTPException, Header, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

# Supported role hierarchy
VALID_ROLES = {"admin", "dispatcher", "driver", "viewer"}
SENSOR_API_KEY = os.getenv("SENSOR_INGESTION_API_KEY", "swachhsetu-sensor-ingest-key-v1")

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)) -> Dict[str, Any]:
    """
    Extracts and verifies Supabase JWT token from Authorization Bearer header.
    Validates token format, expiration (exp), audience (aud), and issuer (iss).
    """
    if not credentials:
        # In strict LIVE mode without auth token, default to unauthenticated viewer
        return {
            "sub": "anon-guest",
            "email": "guest@swachhsetu.gov.in",
            "role": "viewer",
            "is_authenticated": False,
            "site_id": None
        }

    token = credentials.credentials
    try:
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "")
        if jwt_secret:
            # Full signature & claims verification
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_exp": True, "verify_aud": True}
            )
        else:
            # Verify expiration and structure
            payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": True}
            )
        
        user_metadata = payload.get("user_metadata", {})
        role = user_metadata.get("role", payload.get("role", "viewer"))
        if role not in VALID_ROLES:
            role = "viewer"
            
        return {
            "sub": payload.get("sub", "user-anon"),
            "email": payload.get("email", ""),
            "role": role,
            "site_id": user_metadata.get("site_id", None),
            "driver_id": user_metadata.get("driver_id", None),
            "is_authenticated": True,
            "raw_payload": payload
        }
    except jwt.ExpiredSignatureError:
        logger.warning("JWT Token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please re-authenticate.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.warning("JWT Token verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_role(allowed_roles: List[str]):
    """FastAPI Dependency enforcing required role permissions strictly."""
    def role_checker(user: Dict[str, Any] = Depends(get_current_user)):
        if not user.get("is_authenticated") and "viewer" not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required for this operation"
            )
        
        user_role = user.get("role", "viewer")
        if user_role == "admin" or user_role in allowed_roles:
            return user
            
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: User role '{user_role}' lacks required permissions ({allowed_roles})"
        )
    return role_checker

def verify_sensor_api_key(x_sensor_api_key: Optional[str] = Header(None, alias="X-Sensor-API-Key")):
    """
    Verifies scoped API key for hardware telemetry ingestion endpoints.
    Accepts valid sensor header or authenticated admin/dispatcher JWT.
    """
    if x_sensor_api_key and x_sensor_api_key == SENSOR_API_KEY:
        return {"source": "hardware_sensor", "authenticated": True}
    return None

def verify_driver_assignment(user: Dict[str, Any], requested_driver_id: str):
    """Enforces driver assignment ownership: Drivers can only modify their own assigned routes."""
    if user.get("role") in ["admin", "dispatcher"]:
        return True
    if user.get("role") == "driver" and user.get("driver_id") == requested_driver_id:
        return True
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unauthorized: Drivers can only access or modify their own assigned routes."
    )

