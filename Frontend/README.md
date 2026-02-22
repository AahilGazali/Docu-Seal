# DocuSeal Frontend

React + TypeScript frontend for DocuSeal document signature SaaS.

## Setup

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
2. Set `VITE_API_URL` in `.env`:
   - Use `VITE_API_URL=` (empty) when using the Vite proxy to the backend.
   - Or set `VITE_API_URL=http://localhost:5000` to call the backend directly.

## Run

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`. Ensure the backend is running (e.g. in `Backend/` with `npm run dev`) for API calls.

## Build

```bash
npm run build
npm run preview
```
