# TalentBridge Frontend — Setup Guide

## Prerequisites
- Node.js 18+
- Backend running on http://localhost:8000

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Dev Server
```bash
npm run dev
```

Opens at http://localhost:5173

All `/api` requests are proxied to `http://localhost:8000` (see vite.config.js).

## Build for Production
```bash
npm run build
```
Output goes to `dist/`. Serve with nginx or any static host.

## Notes
- AI chat uses SSE streaming via the `/api/chat/send` endpoint
- Auth token is stored in `localStorage` under the key `token`
