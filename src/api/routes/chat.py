import logging
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

class ChatResponse(BaseModel):
    reply: str

_client = None
from src.db.engine import _load_env

def get_genai_client():
    global _client
    if _client is None:
        _load_env()
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            _client = genai.Client(api_key=api_key)
    return _client

SYSTEM_PROMPT = """
You are the Parity Assistant, an AI expert for the Parity reconciliation engine.
Parity is a three-way payment reconciliation engine (gateway <-> bank settlement <-> merchant ledger).
It uses a deterministic matching engine with 5 passes (Pass 1: Exact, Pass 2: Tolerance, Pass 3: Refund, Pass 4: Split/Roll-up, Pass 5: AI & Semantic).
If the engine can't resolve a match deterministically, it creates an Exception that goes to the Exception Queue for Human-in-the-Loop (HITL) review.
Your goal is to answer user questions about how Parity works, what the different passes mean, what a compensating entry is, and what they can do on this website.
You are helpful, concise, and professional.
"""

from src.api.dependencies import verify_token

@router.post("", response_model=ChatResponse, dependencies=[Depends(verify_token)])
def chat_endpoint(request: ChatRequest):
    client = get_genai_client()
    if not client:
        raise HTTPException(
            status_code=503, 
            detail="GEMINI_API_KEY is not configured in the backend. Please add it to your .env file."
        )

    try:
        contents = []
        for msg in request.messages:
            # Map OpenAI roles to Gemini roles
            role = "model" if msg.role == "assistant" else "user"
            contents.append(
                types.Content(role=role, parts=[types.Part.from_text(text=msg.content)])
            )

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT.strip(),
                temperature=0.7,
                max_output_tokens=400,
            )
        )

        return ChatResponse(reply=response.text)
    except Exception as e:
        logger.error(f"Chat completion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat request via AI: {e}")

