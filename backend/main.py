from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Literal

from inference import generate_continuation

app = FastAPI(title="Melody Continuer API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TokenCandidate(BaseModel):
    token: str
    prob: float


class GenerationStep(BaseModel):
    step: int
    chosen_token: str
    top_candidates: List[TokenCandidate]
    attention: List[List[float]]


class GenerateResponse(BaseModel):
    midi_base64: str
    input_tokens: List[str]
    generated_tokens: List[str]
    steps: List[GenerationStep]


MAX_UPLOAD_BYTES = 1 * 1024 * 1024
ALLOWED_MIDI_MIMES = {
    "audio/midi",
    "audio/x-midi",
    "application/x-midi",
    "application/octet-stream",
}


@app.post("/generate", response_model=GenerateResponse)
async def generate(
    file: UploadFile = File(...),
    temperature: float = Form(0.8),
    max_new_tokens: int = Form(50),
    sampling: Literal["greedy", "top_k", "top_p"] = Form("top_p"),
    top_k: int = Form(40),
    top_p: float = Form(0.9),
):
    name = (file.filename or "").lower()
    mime = (file.content_type or "").lower()
    ext_ok = name.endswith(".mid") or name.endswith(".midi")
    if mime not in ALLOWED_MIDI_MIMES and not ext_ok:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {mime!r} / {name!r}. Upload a .mid or .midi file.",
        )

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(contents)} bytes). Max is {MAX_UPLOAD_BYTES}.",
        )

    if not (0.1 <= temperature <= 2.0):
        raise HTTPException(status_code=422, detail="temperature must be in [0.1, 2.0]")
    if not (1 <= max_new_tokens <= 200):
        raise HTTPException(status_code=422, detail="max_new_tokens must be in [1, 200]")
    if not (1 <= top_k <= 200):
        raise HTTPException(status_code=422, detail="top_k must be in [1, 200]")
    if not (0.1 <= top_p <= 1.0):
        raise HTTPException(status_code=422, detail="top_p must be in [0.1, 1.0]")

    try:
        result = generate_continuation(
            midi_bytes=contents,
            temperature=temperature,
            max_new_tokens=max_new_tokens,
            sampling=sampling,
            top_k=top_k,
            top_p=top_p,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")

    return GenerateResponse(**result)


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}
