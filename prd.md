# Product Requirements Document
# FinTrack (Mobile) + PersonalFinance (Web)
**Version:** 1.0  
**Date:** February 2026  
**Status:** Living document — updated as scope evolves  
**Audience:** Solo developer + small friend group (10 users initially)

---

## 1. Product Vision

A unified personal finance manager that works across Android and web, requiring zero manual setup for transaction tracking. The core promise:

> **"Open the app. Your money is already tracked."**

FinTrack handles day-to-day tracking on mobile — automatic via SMS, offline-first, instant. PersonalFinance handles deep analysis on web — investments, loans, SIPs, AI insights, CSV imports. Both share one Supabase backend and stay in sync.

---

## 2. Current State — What Actually Exists

This PRD does not re-spec existing work. The following is already implemented:

### FinTrack (Mobile — Expo + React Native)
| Feature | Status | Notes |
|---|---|---|
| SMS parsing pipeline | ⚠️ Partially working | Parser works, BroadcastReceiver unstable on some OEMs |
| SMS categorisation service | ✅ Built | `smsCategorizationService.ts` |
| Native Android SMS module | ✅ Built | `nativeSmsModule.ts` |
| SMS headless background task | ⚠️ Needs validation | Works on stock Android, OEM issues |
| Receipt scanning (OCR) | ✅ Built | Tesseract.js + expo-camera |
| Financial health dashboard | ✅ Built | Score, forecast, charts |
| Smart budgeting + alerts | ✅ Built | Push alerts on budget breach |
| Email parser | ✅ Built | `emailParser.ts` |
| Offline-first SQLite + sync | ✅ Built | expo-sqlite + Zustand + sync.ts |

### PersonalFinance (Web — Next.js 14)
| Feature | Status | Notes |
|---|---|---|
| AI chat assistant | ✅ Built | Gemini + Ollama via Vercel AI SDK |
| SIP tracking | ✅ Built | `/dashboard/sips/` |
| Stock/holdings tracking | ✅ Built | `/dashboard/stocks/`, `/dashboard/holdings/` |
| CSV + PDF import | ✅ Built | papaparse + pdf-parse |
| PDF report generation | ✅ Built | jspdf + jspdf-autotable |
| Gmail integration | ✅ Built | `/api/gmail/` |
| Subscriptions tracking | ✅ Built | `/dashboard/subscriptions/` |
| Goals management | ✅ Built | `/dashboard/goals/` |
| Background jobs | ⚠️ Architecture risk | Redis + BullMQ — see Section 6 |

---

## 3. Target Users

### Primary Users (v1)
10 people — mixed profile:
- Salaried employees tracking monthly spend + SIPs
- Freelancers with irregular income needing expense visibility
- Students tracking UPI spend against a monthly budget

### Common traits across all users
- Heavy UPI users (primary payment method)
- Android phones (primary device)
- Not financial experts — want insights, not raw data
- Trust is critical — financial data is sensitive

---

## 4. Platforms & Tech Stack

### Mobile — FinTrack
| Layer | Choice | Constraint |
|---|---|---|
| Framework | Expo (React Native) | Existing |
| Local DB | expo-sqlite | Existing |
| State | Zustand | Existing |
| Sync | Supabase (free tier) | 500MB DB, 2GB bandwidth/month |
| Auth | Supabase Auth | Existing |
| Background SMS | BroadcastReceiver + HeadlessJS | Android only |

### Web — PersonalFinance
| Layer | Choice | Constraint |
|---|---|---|
| Framework | Next.js 14 App Router | Existing |
| UI | Tailwind + shadcn/ui | Existing |
| Backend | Supabase | Free tier |
| AI | Ollama (local) + Gemini free tier | Cost-constrained |
| Jobs | ⚠️ Redis + BullMQ → needs change | See Section 6 |
| Hosting | Vercel free tier | Serverless — no persistent processes |

---

## 5. Core Features — What Needs to Be Built or Fixed

These are the gaps and next priorities, ordered by importance.

### 5.1 SMS Parser Reliability (HIGHEST PRIORITY)
**Problem:** Parser works but the first-run deduplication bug caused 0 transactions to be imported on initial load. OEM devices (Xiaomi, Samsung) kill background receivers.

**Requirements:**
- Fix: Only mark SMS ID as processed after successful transaction extraction (not on parse failure)
- Fix: Normalise multiline SMS bodies before regex matching
- Fix: Add `'sent'` to debit signals for HDFC UPI format
- Add: One-time `resetSmsProcessedIds()` utility for recovery
- Add: OEM detection — if Xiaomi/Samsung, show one-time prompt to whitelist app in battery settings
- Add: Sender-map registry for top 8 Indian banks (HDFCBK, ICICIB, AXISBK, SBIINB, KOTAK, PAYTM, YESBNK, INDBNK) with bank-specific patterns instead of generic regex

**Acceptance criteria:**
- HDFC UPI multiline SMS correctly extracts amount, merchant, date
- 10 consecutive app opens do not re-import already-processed transactions
- On Xiaomi device, user sees battery optimisation prompt on first open

---

### 5.2 Investment & Loan Tracking (Mobile)
**Problem:** Web has SIP/stock tracking but mobile has nothing for investments or loans.

**Requirements:**

**SIPs:**
- View list of active SIPs (name, amount, frequency, next date, fund name)
- Mark SIP as paused/cancelled
- SMS auto-detect: parse SIP confirmation SMS (most AMCs send these)
- Manual add SIP with fields: fund name, amount, date, folio number

**Loans:**
- Track EMI loans (home, car, personal, education)
- Fields: lender, principal, EMI amount, tenure, next due date, outstanding balance
- SMS auto-detect: EMI debit SMS from banks
- Alert: 3 days before EMI due date

**Stocks/Holdings (read-only on mobile):**
- View current holdings synced from web
- No buy/sell entry on mobile in v1 — web only

**Acceptance criteria:**
- SIP confirmation SMS from HDFC MF / SBI MF correctly parsed
- EMI debit SMS correctly identified and linked to loan
- Mobile investment screen loads from local SQLite, syncs to Supabase

---

### 5.3 Data Sync Architecture
**Problem:** Mobile has offline-first SQLite, web reads directly from Supabase. Sync logic exists (`sync.ts`) but conflict resolution is not defined.

**Requirements:**
- Last-write-wins for transaction edits (simple, sufficient for 10 users)
- Sync triggers: on app foreground, on wifi connect, manual pull-to-refresh
- Sync scope: transactions, categories, budgets, goals — NOT raw SMS data
- Conflict indicator: if same transaction edited on both web and mobile, flag it visually, let user pick
- Supabase free tier limits respected: batch sync, not row-by-row

**Sync data model:**
```
Every synced record needs:
- id (uuid)
- user_id
- updated_at (timestamp)
- device_id (to detect origin)
- is_deleted (soft delete, never hard delete)
```

---

### 5.4 AI Features — Scoped Correctly
**Problem:** Web has an AI chat assistant but it's likely calling Gemini API per message, which will exhaust free tier quickly even for 10 users.

**Requirements:**

**Local rule-based insights (free, always-on — do these first):**
- "You spent ₹X on food this month, Y% more than last month"
- "3 subscriptions detected: Netflix, Spotify, Amazon Prime — total ₹Z/month"
- "Your highest spend day is Saturday"
- "EMI due in 3 days — ₹X to [lender]"
- "SIP of ₹X deducted today"

**AI chat (Ollama locally, Gemini free tier as fallback):**
- User can ask: "How much did I spend on Swiggy last month?"
- User can ask: "Am I on track for my savings goal?"
- Context passed to model: last 90 days transactions + current budgets + goals
- Do NOT pass raw SMS bodies to AI — extract structured data first, pass that
- Cache AI responses for identical questions — don't re-call API

**Gemini free tier limits (as of 2026):**
- 15 requests/minute, 1500 requests/day on free tier
- For 10 users that's 150 requests/user/day — sufficient if not abused
- Add rate limiting: max 20 AI queries per user per day

---

### 5.5 CSV / Broker Import (Web)
**Already built** — PDF and CSV import exist. Needs standardisation:

**Requirements:**
- Support Zerodha Console CSV export format (capital gains, P&L)
- Support Groww transaction history CSV
- Support standard bank statement CSV (most Indian banks)
- After import: show preview before committing — user confirms or discards
- Duplicate detection: if transaction with same date + amount + description exists, skip with warning

---

### 5.6 Gmail Integration — Simplified
**Problem:** Current implementation likely uses Cloud Pub/Sub webhooks which require a persistent server. Vercel is serverless — this won't work reliably.

**Requirements for v1 (polling, not webhooks):**
- On web app open: trigger Gmail scan for emails since last scan
- Filter senders: known bank domains only (hdfcbank.com, icicibank.com, axisbank.com, etc.)
- Parse for: credit card statements, bank alerts, SIP confirmations
- Store last scan timestamp — never re-scan old emails
- Rate limit: max 1 Gmail scan per 30 minutes per user

**Remove for now:**
- Cloud Pub/Sub / webhook setup — requires always-on server, incompatible with Vercel free tier

---

## 6. Architecture Issues to Fix

### 6.1 Redis + BullMQ on Vercel (CRITICAL)
**Problem:** Redis and BullMQ require a persistent server process. Vercel runs serverless functions that spin up and down — there is no persistent process. This will silently fail in production.

**What to do:**
- Replace BullMQ with Vercel Cron Jobs (free, built-in, no Redis needed)
- Replace Redis queue with Supabase table as a job queue (simple for 10 users)

```
Table: background_jobs
- id, user_id, job_type, payload, status, created_at, processed_at
```

A Vercel cron hits `/api/cron/process-jobs` every 5 minutes, picks up pending jobs, processes them. No Redis, no BullMQ, no persistent server needed.

**For 10 users this is completely sufficient.**

---

### 6.2 Supabase Free Tier — Know Your Limits
| Resource | Free Limit | Your Risk |
|---|---|---|
| Database | 500MB | Low for 10 users |
| Bandwidth | 5GB/month | Medium — watch if syncing raw SMS bodies |
| Auth users | 50,000 | No risk |
| Edge functions | 500K calls/month | Low |
| Storage | 1GB | Low |
| **Pausing** | **Project pauses after 7 days inactivity** | **HIGH** |

**Action required:** Supabase free tier pauses your project if no activity for 7 days. Set up a weekly ping cron job on Vercel to prevent this.

```
/api/cron/keep-alive → simple SELECT 1 from Supabase every 5 days
```

---

### 6.3 Tesseract.js for OCR — Performance
Tesseract.js runs OCR in the browser/React Native JS thread. On a mid-range Android phone this will be slow (5-15 seconds per receipt). 

**Recommendation:** Use Google Cloud Vision free tier (1000 calls/month free) as primary OCR, fall back to Tesseract.js offline. For 10 users, 1000 calls/month is more than enough.

---

## 7. Data Model

### Core tables (Supabase)

```sql
-- Users (handled by Supabase Auth)

-- Transactions
transactions (
  id uuid primary key,
  user_id uuid references auth.users,
  amount decimal(12,2) not null,
  type text check (type in ('income','expense','transfer')),
  category_id uuid,
  merchant text,
  date timestamptz,
  source text check (source in ('sms','email','manual','csv','ocr')),
  sms_id text,           -- original SMS _id, for dedup
  raw_sms text,          -- original body, for debugging
  notes text,
  is_deleted boolean default false,
  device_id text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
)

-- Categories
categories (
  id uuid primary key,
  user_id uuid,
  name text,
  icon text,
  colour text,
  is_default boolean,
  updated_at timestamptz
)

-- Budgets
budgets (
  id uuid primary key,
  user_id uuid,
  category_id uuid,
  amount decimal(12,2),
  period text check (period in ('monthly','weekly','yearly')),
  updated_at timestamptz
)

-- SIPs
sips (
  id uuid primary key,
  user_id uuid,
  fund_name text,
  folio_number text,
  amount decimal(12,2),
  frequency text,
  next_date date,
  status text check (status in ('active','paused','cancelled')),
  updated_at timestamptz
)

-- Loans
loans (
  id uuid primary key,
  user_id uuid,
  lender text,
  loan_type text check (loan_type in ('home','car','personal','education','other')),
  principal decimal(12,2),
  outstanding decimal(12,2),
  emi_amount decimal(12,2),
  emi_due_day int,        -- day of month EMI is due
  tenure_months int,
  start_date date,
  updated_at timestamptz
)

-- Goals
goals (
  id uuid primary key,
  user_id uuid,
  name text,
  target_amount decimal(12,2),
  current_amount decimal(12,2),
  target_date date,
  updated_at timestamptz
)

-- Subscriptions
subscriptions (
  id uuid primary key,
  user_id uuid,
  name text,
  amount decimal(12,2),
  billing_cycle text,
  next_billing_date date,
  category text,
  updated_at timestamptz
)

-- Background jobs (replaces Redis/BullMQ)
background_jobs (
  id uuid primary key,
  user_id uuid,
  job_type text,
  payload jsonb,
  status text check (status in ('pending','processing','done','failed')),
  created_at timestamptz default now(),
  processed_at timestamptz
)
```

---

## 8. Phased Roadmap

### Phase 1 — Stabilise what exists (Now → 4 weeks)
- [ ] Fix SMS parser deduplication bug
- [ ] Fix multiline SMS normalisation
- [ ] Add sender-map registry for top 8 banks
- [ ] Replace Redis/BullMQ with Vercel Cron + Supabase job table
- [ ] Add Supabase keep-alive cron
- [ ] Fix Gmail integration to polling (remove Pub/Sub dependency)
- [ ] Validate sync.ts conflict resolution for 10 users
- [ ] OEM battery optimisation prompt on Android

### Phase 2 — Complete mobile investment tracking (4 → 8 weeks)
- [ ] SIP tracking on mobile (SMS auto-detect + manual)
- [ ] Loan/EMI tracking on mobile
- [ ] EMI due date alerts (3 days before)
- [ ] Rule-based local insights engine
- [ ] Mobile investment screen (read-only, synced from web)

### Phase 3 — Polish and AI (8 → 12 weeks)
- [ ] Replace Tesseract.js with Google Vision free tier for OCR
- [ ] AI rate limiting (20 queries/user/day)
- [ ] AI response caching for repeated questions
- [ ] Zerodha + Groww CSV import standardisation
- [ ] Duplicate detection on CSV import
- [ ] Monthly PDF report improvements

### Phase 4 — Expand (12+ weeks, only if Phase 1-3 are stable)
- [ ] iOS support (manual entry + email import only)
- [ ] Account Aggregator integration (requires RBI FIU registration)
- [ ] Multi-currency support
- [ ] Family/shared expense splitting

---

## 9. What NOT to Build (Deliberately Out of Scope)

These are explicitly excluded to keep the project maintainable for a solo developer:

- **Account Aggregator in v1** — requires RBI registration, legal process
- **Real-time stock prices** — requires paid API, not needed for 10 users
- **Bank account linking** (Plaid-style) — no Indian equivalent at reasonable cost
- **Tax filing / ITR integration** — out of scope, different product
- **Social features** — split bills, shared wallets — Phase 4 at earliest
- **iOS SMS reading** — impossible, don't attempt
- **Monetisation infrastructure** — payments, subscriptions, billing — not needed for personal use

---

## 10. Non-Functional Requirements

### Performance
- App open → transaction list visible: under 2 seconds (reads from local SQLite)
- SMS scan on first install: under 30 seconds for 300 messages
- Web dashboard initial load: under 3 seconds

### Privacy
- Raw SMS bodies stored locally only — never sent to Supabase
- Only structured extracted data (amount, merchant, date, type) synced to cloud
- AI context: structured data only, never raw SMS/email content
- No analytics SDKs in v1 — no third party receives user data

### Reliability
- App works fully offline — all core features available without internet
- Sync failures are silent and retried — never block the user
- If SMS parsing fails, transaction is skipped silently — never crash

### Security
- Supabase Row Level Security (RLS) enabled on all tables — users only see their own data
- No API keys in mobile bundle
- Gemini API key server-side only (Next.js API routes)

---

## 11. Open Questions

These need decisions before implementation:

1. **Multi-user data isolation** — are all 10 friends using separate Supabase accounts, or is there a shared account? Separate accounts is strongly recommended for data privacy.

2. **SMS raw body storage** — currently stored in local SQLite. Should it ever sync? Recommendation: no, keep it local only.

3. **Zerodha/Groww sync frequency** — CSV import is manual. Is that acceptable or do users want automatic portfolio sync? (Automatic requires Zerodha Kite API — separate OAuth flow.)

4. **Subscription detection** — is it automatic from SMS/email, or always manual? Automatic is possible but needs careful pattern matching to avoid false positives.

5. **What happens when Supabase free tier project pauses** — have you tested recovery? Paused projects can take 1-2 minutes to resume on first request.