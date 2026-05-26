"""
FastAPI entry point. Defines:
  - Pydantic schemas (the API contract, in code)
  - CORS for the React dev server
  - Three routes: GET /seeds, POST /generate, GET /bpe-patterns

The actual model work lives in inference.py. This file is thin on purpose.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Literal

from seeds import SEEDS, get_seed_by_id
from inference import generate_continuation, get_bpe_patterns

app = FastAPI(title="Melody Continuer API")

# CORS for the React dev server. Add deployment URLs here later if needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Schemas (the API contract) ----------

class SeedInfo(BaseModel):
    id: str
    name: str
    preview: str  # short human-readable preview of the melody


class SeedsResponse(BaseModel):
    seeds: List[SeedInfo]


class GenerateRequest(BaseModel):
    seed_id: str
    temperature: float = Field(0.8, ge=0.1, le=2.0)
    max_new_tokens: int = Field(50, ge=1, le=200)
    sampling: Literal["greedy", "top_k", "top_p"] = "top_p"
    top_k: int = Field(40, ge=1, le=200)
    top_p: float = Field(0.9, ge=0.1, le=1.0)


class TokenCandidate(BaseModel):
    token: str
    prob: float


class GenerationStep(BaseModel):
    step: int
    chosen_token: str
    top_candidates: List[TokenCandidate]
    attention: List[List[float]]  # 2D matrix per step (kept small)


class GenerateResponse(BaseModel):
    midi_base64: str
    seed_tokens: List[str]
    generated_tokens: List[str]
    steps: List[GenerationStep]


class BpePattern(BaseModel):
    token: str
    description: str
    frequency: int


class BpePatternsResponse(BaseModel):
    patterns: List[BpePattern]


# ---------- Routes ----------

@app.get("/seeds", response_model=SeedsResponse)
def list_seeds():
    return SeedsResponse(seeds=[SeedInfo(**s) for s in SEEDS])


@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    seed = get_seed_by_id(req.seed_id)
    if seed is None:
        raise HTTPException(status_code=404, detail=f"Unknown seed_id: {req.seed_id}")

    result = generate_continuation(
        seed_abc=seed["abc"],
        temperature=req.temperature,
        max_new_tokens=req.max_new_tokens,
        sampling=req.sampling,
        top_k=req.top_k,
        top_p=req.top_p,
    )
    return GenerateResponse(**result)


@app.get("/bpe-patterns", response_model=BpePatternsResponse)
def bpe_patterns():
    return BpePatternsResponse(patterns=get_bpe_patterns())


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}
