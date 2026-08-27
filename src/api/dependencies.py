"""
FastAPI Dependencies for the Recon API.

Handles database session injection and static token authentication
for the buildathon scope.
"""

import os
from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from src.db.engine import _get_session_factory

security = HTTPBearer()

def get_db_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a SQLAlchemy session.
    
    Uses the underlying factory directly rather than the `get_session()`
    context manager so FastAPI can handle the yield/teardown lifecycle.
    Commit/rollback is handled explicitly in the routes or via this generator.
    """
    factory = _get_session_factory()
    session = factory()
    try:
        yield session
        # Do NOT auto-commit here. Endpoints should explicitly commit
        # if they succeed, giving them control over transaction boundaries.
    finally:
        session.close()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Verify the static bearer token.
    For buildathon scope, we check against an API_KEY environment variable.
    """
    expected_token = os.environ.get("API_KEY", "dev_token_123")
    if credentials.credentials != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Return the 'user' or system that authenticated
    return "api_user"
