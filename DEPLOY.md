# WFHP Platform — Railway Deployment Guide

## Prerequisites
- Node.js 18+ installed on your machine
- A Railway account at https://railway.app (free tier works)
- Git installed

## One-time setup (~8 minutes)

### Step 1 — Install the Railway CLI
```bash
npm install -g @railway/cli
railway login
```
This opens a browser to authenticate. Sign in with GitHub or email.

---

### Step 2 — Initialize the project
Navigate to the project folder and link it to Railway:
```bash
cd wfhp-platform
railway init
```
When prompted, name it: `wfhp-platform`

---

### Step 3 — Add a PostgreSQL database
```bash
railway add -d postgres
```
Railway provisions a Postgres instance and automatically sets `DATABASE_URL` as an environment variable. No configuration needed — the app reads it automatically.

---

### Step 4 — Deploy
```bash
railway up
```
Railway uploads your code, builds the Docker image, and deploys. Takes ~2 minutes on first run, ~45 seconds on subsequent deploys.

---

### Step 5 — Get your public URL
```bash
railway domain
```
This generates a URL like `https://wfhp-platform-production.up.railway.app`

That's your permanent app URL. Share it with your team.

---

## Subsequent deployments (after code changes)
```bash
cd wfhp-platform
railway up
```
That's it. Railway redeploys automatically.

---

## Environment variables (auto-set by Railway)
| Variable | Source |
|---|---|
| `DATABASE_URL` | Auto-injected by Railway Postgres plugin |
| `PORT` | Auto-injected by Railway (default 5000) |
| `NODE_ENV` | Set to `production` in Dockerfile |

No `.env` file needed for production.

---

## Custom domain (optional)
1. Go to your Railway project dashboard
2. Click on the service → Settings → Networking → Custom Domain
3. Add `app.wfhp.co` (or any subdomain you own)
4. Railway gives you a CNAME record — add it in your DNS registrar

---

## Default login
- **Email:** jasonstalbot@me.com
- **Password:** wfhp2026

To add team members: use the `+ Add User` button inside the app (coming in next session) or directly insert into the `users` table via Railway's database console.

---

## Troubleshooting
- **"DATABASE_URL not set"** — Run `railway add -d postgres` first
- **Build fails** — Run `railway logs` to see error details
- **App crashes on start** — Check `railway logs --tail` for database connection errors
