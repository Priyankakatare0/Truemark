# TrueMark

AI-powered digital ownership and authenticity platform. Upload images, generate tamper-proof fingerprints (SHA-256 + pHash + CLIP embeddings), detect similarity, and download PDF proof reports.

## Architecture

```
Frontend (React + Vite)  →  Backend (FastAPI)  →  Supabase (PostgreSQL + pgvector + Storage)
                                    ↓
                          CLIP / pHash fingerprint engine
```

## Quick Start

### 1. Database (Supabase)

Run migrations in order in the Supabase SQL Editor:

1. `backend/db/migrations/001_init.sql` — tables, pgvector index, RPC
2. `backend/db/migrations/002_rls_policies.sql` — RLS policies for anon role

Create a private storage bucket named `reports` (or run the INSERT in `001_init.sql`).

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env         # fill in Supabase credentials
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open http://localhost:5173

## Workflow

1. **Upload** — `POST /upload` generates fingerprint and stores record
2. **Analyze** — `POST /check` runs vector similarity search and originality scoring
3. **Report** — `GET /report/{id}` generates and downloads PDF proof
4. **Dashboard** — view fingerprint metadata, score, and matches

## Deployment

| Component | Target |
|-----------|--------|
| Frontend | Vercel (`frontend/`, set `VITE_API_BASE_URL`) |
| Backend | Render (`backend/Dockerfile`, set env vars from `.env.example`) |
| Database | Supabase |

## Testing

```bash
cd backend
pytest tests/ -v

cd frontend
npm run lint
npm run build
```

## Environment Variables

See `backend/.env.example` and `frontend/.env.example`.
