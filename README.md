# Intellirity - AI Security Platform

## Getting Started

1. Set `VITE_CLERK_PUBLISHABLE_KEY` (frontend `.env`) and `CLERK_SECRET_KEY` (backend `.env`) from your Clerk instance. Without them the app runs in open mode.
2. Run `docker-compose up --build`
3. Frontend: http://localhost:5173
4. Backend API: http://localhost:8000
5. API Docs: http://localhost:8000/docs

## Project Structure

```
intellirity/
├── backend/          # FastAPI backend
│   └── app/
│       ├── api/      # API routes
│       ├── core/     # Config, security, dependencies
│       ├── db/       # Database setup
│       ├── models/   # SQLAlchemy models
│       ├── schemas/  # Pydantic schemas
│       └── services/ # Business logic
├── frontend/         # React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── services/
└── docker-compose.yml
```
