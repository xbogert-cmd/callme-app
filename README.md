# CallMe — AI Reminder Calling App

An app where you set reminders and get an actual phone call from an AI. The AI checks whether you completed your task, handles snoozing or rescheduling, and logs everything to a dashboard.

## How it works

1. You create a reminder (task + phone number + time) on the dashboard
2. At the scheduled time, the backend triggers a Twilio outbound call to your phone
3. An AI (Claude) greets you, states the reminder, and asks if you completed it
4. Based on your response it: logs completion, snoozes 15 min, reschedules, or cancels
5. The dashboard shows all call history, transcripts, and task completions

## Tech stack

- **Frontend**: Next.js 16 + Tailwind CSS v4 (App Router)
- **Database**: Supabase (Postgres)
- **Phone calls**: Twilio (outbound calls + speech recognition via `<Gather>`)
- **AI**: Anthropic Claude (`claude-sonnet-4-20250514`)
- **Scheduling**: Vercel Cron (prod) / node-cron (local dev)
- **Hosting**: Vercel

---

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd callme-app
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Then run these additional migration statements:

```sql
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general'
  CHECK (category IN ('workout','medication','study','budget','general'));
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS category_settings JSONB DEFAULT '{}';
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES reminders(id);
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS repeat TEXT NOT NULL DEFAULT 'none'
  CHECK (repeat IN ('none','daily','weekly'));
```

4. Copy your project URL and anon key from **Settings → API**

### 3. Set up Twilio

1. Create an account at [twilio.com](https://twilio.com)
2. Buy a phone number with Voice capability
3. Copy your Account SID and Auth Token from the Console

### 4. Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key

### 5. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values in `.env.local`. See the example file for descriptions.

---

## Running locally with ngrok (required for Twilio webhooks)

Twilio needs a public HTTPS URL to send webhook events to. In local dev, use ngrok:

### Install ngrok

```bash
# macOS
brew install ngrok

# or download from https://ngrok.com/download
```

### Start everything

In **terminal 1** — start the Next.js dev server:
```bash
npm run dev
```

In **terminal 2** — expose it via ngrok:
```bash
ngrok http 3000
```

Copy the `https://` URL ngrok gives you (e.g. `https://abc123.ngrok-free.app`) and set it as `BASE_URL` in your `.env.local`:

```
BASE_URL=https://abc123.ngrok-free.app
```

Restart the dev server after changing `.env.local`.

In **terminal 3** — run the local scheduler (fires reminders every minute):
```bash
npm run scheduler
```

### Test a reminder call

1. Open `http://localhost:3000`
2. Create a reminder with your phone number, set the time 1–2 minutes in the future
3. Wait for the scheduler to fire — your phone should ring!

---

## Project structure

```
callme-app/
├── app/
│   ├── page.tsx                    # Dashboard UI
│   ├── layout.tsx
│   └── api/
│       ├── reminders/
│       │   ├── route.ts            # GET all, POST new reminder
│       │   └── [id]/route.ts       # PUT (edit/status), DELETE
│       ├── logs/
│       │   └── route.ts            # GET call logs + completions
│       ├── scheduler/
│       │   └── route.ts            # Cron endpoint — fires due reminders
│       └── twilio/
│           ├── voice/route.ts      # Initial call webhook (greeting)
│           ├── gather/route.ts     # Speech input handler (conversation loop)
│           └── status/route.ts     # Call status callbacks (failed/busy/etc)
├── components/
│   ├── ReminderForm.tsx            # Category-aware new reminder form
│   ├── ReminderList.tsx            # Active reminders with quick actions (edit/snooze/cancel)
│   ├── MissedCalls.tsx             # Missed call section with reschedule UI
│   ├── CallLogs.tsx                # Call history with transcripts
│   ├── TaskCompletions.tsx         # Completed task log
│   ├── Confetti.tsx                # Canvas confetti on new completion
│   └── BackgroundDecor.tsx         # Decorative SVG background
├── lib/
│   ├── supabase.ts                 # Supabase client
│   ├── twilio.ts                   # Outbound call helper
│   ├── claude.ts                   # AI conversation logic
│   └── scheduler.ts                # Reminder polling logic
├── types/index.ts
├── supabase/schema.sql             # Database schema
├── scripts/run-scheduler.ts        # Local dev cron runner
├── vercel.json                     # Vercel Cron config (runs /api/scheduler every minute)
└── .env.local.example
```

---

## Call flow (AI conversation)

```
Call connects
     ↓
Claude greets: "Hey! This is your CallMe reminder for [task]. Did you get it done?"
     ↓
User responds
     ↓
┌────────────────────────────────────────────────────────────────┐
│ "Yes / Done"    → Ask for notes → Log completion → Hang up     │
│ "No / Not yet"  → Offer: Do now / Snooze 15m / Reschedule / Cancel │
│                      ↓                                         │
│                 Handle choice → Update DB → Hang up            │
└────────────────────────────────────────────────────────────────┘
```

For **workout/gym reminders**: if completed, Claude asks what exercises were done and logs them in the notes.

---

## Deploying to Vercel

### Step 1 — Push to GitHub and connect to Vercel

```bash
git init && git add . && git commit -m "Initial commit"
# Push to GitHub, then import the repo at vercel.com/new
```

Or use the CLI:

```bash
npm i -g vercel
vercel   # follow the prompts, select Next.js framework
```

### Step 2 — Add all environment variables

In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio Console → Account Info |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Account Info |
| `TWILIO_PHONE_NUMBER` | E.164 format, e.g. `+15551234567` |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY` |
| `BASE_URL` | Your deployment URL, e.g. `https://callme-xyz.vercel.app` (no trailing slash) |
| `CRON_SECRET` | Any random string — generate with `openssl rand -hex 32` |

### Step 3 — Deploy

```bash
vercel --prod
```

Or push to your main branch — Vercel auto-deploys on push.

### Step 4 — Cron job

`vercel.json` is already configured to run `/api/scheduler` every minute:

```json
{ "crons": [{ "path": "/api/scheduler", "schedule": "* * * * *" }] }
```

Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` with cron requests when `CRON_SECRET` is set as an environment variable — no extra configuration needed.

> **Free plan?** Vercel Cron requires Pro plan. Alternative: use [cron-job.org](https://cron-job.org) — create a job pointing to `GET https://your-app.vercel.app/api/scheduler` every minute with header `Authorization: Bearer <your-CRON-SECRET>`.

### Step 5 — Verify it works

1. Open your deployed app and create a reminder 2 min in the future
2. Check **Vercel → Functions → Logs** to see the scheduler firing
3. Your phone should ring at the scheduled time
4. Check [console.twilio.com](https://console.twilio.com) → Monitor → Logs → Calls if the call doesn't arrive

---

## Environment variables reference

| Variable | Description |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID from Console |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token from Console |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number (E.164 format) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as above (browser-safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as above (browser-safe) |
| `BASE_URL` | Public HTTPS URL (ngrok locally, Vercel URL in prod) |
| `CRON_SECRET` | Optional secret to protect `/api/scheduler` |
