# Coaching Analyzer Web App

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL running locally
- ffmpeg installed and in PATH

## Setup

### 1. Create the database

```bash
psql -U postgres -c "CREATE DATABASE coaching_analyzer;"
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend reads environment variables from `backend/.env`. Tables are created automatically on startup.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on http://localhost:3000 and calls the backend at http://localhost:8000.

## Environment Variables

### backend/.env
```
ASSEMBLYAI_API_KEY=...
ANTHROPIC_API_KEY=...
SECRET_KEY=your-secret-key-change-in-production
DATABASE_URL=postgresql://postgres:postgres@localhost/coaching_analyzer
```

### frontend/.env.local
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Credit System

| Action | Credits |
|--------|---------|
| Register | +3 (bonus) |
| Run analysis | -1 |
| Submit feedback | +1 |
| Share on X | +1 |

## API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/analyze` - Upload audio and run analysis (multipart)
- `GET /api/sessions` - List sessions
- `GET /api/sessions/{id}` - Get session detail
- `GET /api/sessions/{id}/pdf` - Download PDF report
- `POST /api/feedback/{session_id}` - Submit feedback
- `POST /api/sessions/{session_id}/share` - Confirm X share
- `GET /api/credits` - Get credit history
