# DocuSeal – Document Management & E-Signatures

DocuSeal is a document signing and management application built with React, Express, and Supabase.

## Features

- **Upload PDFs** – Upload documents and add signature fields
- **Place Signatures** – Drag-and-drop signature and initial fields onto documents
- **Multi-Signer** – Add multiple signers, send email invitations, track signing status
- **Audit Trail** – View who signed and when for each document
- **Trash** – Restore or permanently delete documents
- **Settings** – Update profile, language, and preferences

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, React Router, React-PDF
- **Backend**: Node.js, Express, Supabase (PostgreSQL, Auth, Storage)
- **Email**: Nodemailer (Gmail App Password)

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase project
- Gmail account (for email invitations)

### 1. Clone & Install

```bash
# Backend
cd Backend
npm install

# Frontend
cd ../Frontend
npm install
```

### 2. Configure Environment

- **Backend**: Copy `Backend/.env.example` to `Backend/.env`
- **Frontend**: Copy `Frontend/.env.example` to `Frontend/.env`
- Add your Supabase URL, service role key, JWT secrets, and (for multi-signer) email credentials

### 3. Run Database Migrations

Run the SQL in `Backend/migrations/` in your Supabase SQL Editor.

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed steps including the multi-signer migration.

### 4. Start Servers

```bash
# Terminal 1 – Backend
cd Backend
npm start

# Terminal 2 – Frontend
cd Frontend
npm run dev
```

Open `http://localhost:3000`.

## Documentation

- [SETUP_GUIDE.md](SETUP_GUIDE.md) – Full setup including multi-signer email
- [MULTI_SIGNER_SETUP.md](MULTI_SIGNER_SETUP.md) – Multi-signer feature details
- [EMAIL_SETUP.md](Backend/EMAIL_SETUP.md) – Email configuration

## License

Private / All rights reserved.
