# Melody Continuer

A web app that takes a seed melody and uses a transformer to generate a continuation.
Built on top of a pretrained music transformer, with a custom inference loop, custom BPE
tokenizer for music analysis, and live visualizations of attention and token probabilities.

## Stack
- **Backend:** FastAPI + PyTorch + Hugging Face Transformers
- **Frontend:** React (Vite) + Tone.js for MIDI playback

## Quick start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate    # on Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
Backend runs at http://localhost:8000. Open http://localhost:8000/docs for Swagger.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at http://localhost:5173.

## Project structure
```
backend/        FastAPI app + ML pipeline
frontend/       React UI
```

## The pipeline
```
seed melody
  -> tokenize (pretrained model's tokenizer for model I/O)
  -> custom inference loop (manual generation, not model.generate())
  -> generated tokens
  -> midi conversion
  -> base64 sent to frontend
  -> Tone.js plays it
```

Our BPE (week 1) runs as a parallel analysis layer on the output, showing learned musical
patterns. Our embedding work (week 2) informs style conditioning.

by Mihai and Ayla
