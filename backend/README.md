# TalentBridge Backend — Setup Guide

## Prerequisites
- Python 3.11+
- MySQL 8.0+

## Quick Start

### 1. Create MySQL Database
```sql
CREATE DATABASE job_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL` — your MySQL connection string
- `SECRET_KEY` — any long random string for JWT signing
- `GROQ_API_KEY` — your Groq API key from https://console.groq.com

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Tables are created automatically on first run via SQLAlchemy.

## AI Configuration
- **Provider:** Groq
- **Model:** `llama-3.3-70b-versatile` (fast, capable, free tier available)
- Streaming is enabled via SSE (Server-Sent Events)
- The env var MUST be `GROQ_API_KEY` (not `API_KEY`)

## API Docs
Visit http://localhost:8000/docs after starting the server.
