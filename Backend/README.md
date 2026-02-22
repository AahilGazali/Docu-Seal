# DocuSeal Backend

Production-ready Express.js backend for a Document Signature SaaS using Supabase (PostgreSQL + Storage).

## Setup

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and set:
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (strong random strings)
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project
3. Ensure Supabase has the required tables and a storage bucket named `documents`.

## Run

```bash
npm install
npm run dev
```

Server runs at `http://localhost:5000` (or `PORT` from `.env`).

## API Overview

- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- **Documents:** `POST /api/docs/upload`, `GET /api/docs`, `GET /api/docs/:id`
- **Signatures:** `POST /api/signatures`, `GET /api/signatures/:documentId`, `POST /api/signatures/finalize`
- **Audit:** `GET /api/audit/:documentId`

Protected routes require `Authorization: Bearer <accessToken>`.
