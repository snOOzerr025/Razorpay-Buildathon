"""
FastAPI application entrypoint for the Reconciliation Controller.
"""

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from src.db.engine import dispose_engines, healthcheck

logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Reconciliation Engine API",
    description="Three-way payment reconciliation engine.",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# Global Exception Handlers (docs/06 API Envelope)
# ---------------------------------------------------------------------------

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Format Pydantic validation errors strictly to the spec envelope."""
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation_error",
                "message": "Invalid request payload",
                "details": exc.errors()
            }
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Fallback handler for unhandled exceptions."""
    logger.error("Unhandled exception processing %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_server_error",
                "message": "An unexpected error occurred."
            }
        },
    )

# ---------------------------------------------------------------------------
# Core Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", tags=["System"])
def health_check() -> dict[str, Any]:
    """DB schema and connection verification."""
    try:
        return healthcheck()
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

@app.on_event("shutdown")
def shutdown_event():
    logger.info("Application shutting down, disposing DB pools.")
    dispose_engines()

# In subsequent commits, we will include the routers here:
# app.include_router(reconcile_router, prefix="/api/v1/reconcile", tags=["Reconciliation"])
# app.include_router(matches_router, prefix="/api/v1/matches", tags=["Matches"])
# app.include_router(exceptions_router, prefix="/api/v1/exceptions", tags=["Exceptions"])
# app.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["Dashboard"])
