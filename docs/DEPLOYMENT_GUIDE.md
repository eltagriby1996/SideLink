# Vercel Deployment and Backend Setup Guide

This guide describes how to deploy the BitLoader Link Unlock verification gateway to **Vercel** and configure persistent database storage using **Supabase** or **Neon**.

---

## 1. Database Setup (Supabase or Neon PostgreSQL)

### Option A: Supabase
1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Paste and run the contents of [`bitloader-web/database/schema.sql`](file:///c:/Users/HD/Desktop/Bitloader/bitloader-web/database/schema.sql):
   ```sql
   CREATE TABLE IF NOT EXISTS verification_sessions (
       session_id VARCHAR(64) PRIMARY KEY,
       status VARCHAR(20) NOT NULL DEFAULT 'pending',
       created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
       expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
       verified_at TIMESTAMP WITH TIME ZONE,
       challenge_nonce VARCHAR(64) NOT NULL,
       client_ip VARCHAR(45)
   );
   ```
4. Copy your PostgreSQL connection string from **Project Settings -> Database -> Connection string (URI)**.

### Option B: Neon PostgreSQL
1. Create a project at [neon.tech](https://neon.tech).
2. Open the **SQL Console** and execute `schema.sql`.
3. Copy your database connection string.

---

## 2. Deploy to Vercel

### Step 1: Install Vercel CLI (or use GitHub Integration)
```bash
npm i -g vercel
```

### Step 2: Configure Environment Variables
In your Vercel Project Settings (or via Vercel CLI), configure the following environment variables:

| Variable Name | Example Value | Description |
|---|---|---|
| `VERIFICATION_BASE_URL` | `https://bitloader-web.vercel.app` | Public URL of your deployed verification website |
| `DATABASE_URL` | `postgres://...` | Connection URI for Supabase or Neon |
| `TOKEN_ISSUER` | `bitloader-verification` | JWT token issuer |
| `TOKEN_AUDIENCE` | `bitloader-client` | JWT token audience |
| `TOKEN_SIGNING_PRIVATE_KEY` | `YOUR_SECURE_RANDOM_KEY_AT_LEAST_32_BYTES` | Secret key used to sign authorization JWTs |

### Step 3: Deploy
From the `bitloader-web/` directory:
```bash
cd bitloader-web
vercel --prod
```

---

## 3. Configuring the Desktop Client

By default, BitLoader connects to the local development server `http://localhost:3000` or the configured production gateway.

To configure the Windows client to point to your live Vercel deployment:
1. Launch **BitLoader**.
2. Navigate to the **Settings** page in the left navigation sidebar.
3. In **Link Unlock Verification Gateway URL**, enter your Vercel URL (e.g. `https://your-bitloader.vercel.app`).
4. Alternatively, set the environment variable:
   ```powershell
   [Environment]::SetEnvironmentVariable("BITLOADER_BACKEND_URL", "https://your-bitloader.vercel.app", "User")
   ```
