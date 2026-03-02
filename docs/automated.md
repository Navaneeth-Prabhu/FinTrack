What "Automated" Actually Means for Indian Investment Tracking
There are 3 levels of automation possible:
Level 1 — SMS parsing (you already have this infra)
Level 2 — Public API scraping (NAV, stock prices)  
Level 3 — Account aggregation (CAMS, Zerodha, NSDL)
Each has very different complexity and your current architecture handles them differently.

Level 1 — SMS Automation ✅ Already Possible
You already have smsParser.ts. Indian banks and AMCs send SMS for almost everything:
SBI MF: Units allotted 142.30 for Rs.999 in Valu Fund
        Folio: 1234567  NAV: Rs.84.32  Date: 01-Mar-2026

HDFC Bank: EMI of Rs.35,000 debited for Loan A/C ••••4521
           Outstanding: Rs.27,20,000

Zerodha: Bought 10 INFY @ Rs.1,895 on NSE
         Order: 2345678  Exchange: NSE
Your existing SMS pipeline can auto-create and auto-update investments. This is genuinely the most valuable automation for your users — zero extra setup, it just works on install.
What you'd need to add:
typescript// services/smsParser.ts — new patterns alongside existing ones
const SIP_ALLOTMENT_PATTERN = /Units allotted ([\d.]+).*?Rs\.([\d,]+).*?NAV.*?Rs\.([\d.]+)/i;
const LOAN_EMI_PATTERN = /EMI of Rs\.([\d,]+) debited.*?Outstanding.*?Rs\.([\d,]+)/i;
const STOCK_BUY_PATTERN = /Bought (\d+) ([A-Z]+) @ Rs\.([\d.]+) on (NSE|BSE)/i;
```

**Impact on architecture:** Your current schema handles this fine with one addition — a `sms_id` field on holdings and sips (same deduplication pattern you already use on transactions).

---

## Level 2 — Public API for Prices ⚠️ Possible But Has Tradeoffs

### Mutual Fund NAV — Easiest Win

AMFI (Association of Mutual Funds in India) publishes **free daily NAV data** for every fund in India. No API key, no auth, completely public:
```
https://www.amfiindia.com/spages/NAVAll.txt
This is a flat text file updated every day at 9PM. You can fetch it, parse it, and update all your MF NAV values automatically.
typescript// services/navUpdateService.ts
const fetchLatestNAV = async (schemeCode: string): Promise<number> => {
  const response = await fetch('https://www.amfiindia.com/spages/NAVAll.txt');
  // parse flat file, find by scheme code
  // update holdings/sips table
};
Problem for your app: You're mobile-only, offline-first. Fetching a 2MB text file on every app open is expensive on Indian mobile data. Better approach — fetch once daily in background using your existing expo-background-fetch infrastructure.
Stock Prices — Harder
There's no free official Indian stock price API. Options:
SourceCostReliabilityLegalNSE/BSE official APIPaid, expensive✅ High✅Yahoo Finance unofficialFree⚠️ Breaks sometimes⚠️ Grey areaGoogle Finance scrapingFree⚠️ Breaks often❌ ToS violationTwelve Data / Alpha VantageFree tier limited✅ Good✅
Honest recommendation for v1: Don't automate stock prices. Manual entry for stocks, automated NAV for MFs only. The AMFI API is clean, legal, and reliable. Stock automation is a v2 problem.

Level 3 — Account Aggregation ⚠️ Complex
This means connecting directly to Zerodha, Groww, CAMS, NSDL to pull your actual portfolio. India actually has a good standard for this:
Account Aggregator (AA) Framework — RBI-mandated, all major brokers support it. Companies like Finvu, Perfios, Setu provide AA APIs.
Reality check:

Requires user consent flow (OAuth-style)
Requires your app to be registered as a Financial Information User (FIU)
Requires legal compliance, privacy policy, data handling agreements
Not feasible for a personal app with 10 users

CAMS/Karvy CAS import is the practical middle ground — users download a Consolidated Account Statement PDF and you parse it. This is what Kuvera, Groww, and INDmoney do for onboarding.

Does Your Current Architecture Support Automation?
Here's the honest assessment:
What works well for automation ✅
SMS pipeline — already built, just needs new patterns. Your sms_id deduplication means no double-imports. This is the biggest win and requires the least new code.
Background fetch — expo-background-fetch already in your stack. NAV updates can run here daily.
Offline-first SQLite — works perfectly. Auto-imported data writes to SQLite first, syncs to Supabase same as transactions.
What needs changing for automation ⚠️
The flat holdings table becomes a problem. When SMS auto-creates a holding, you need to match it against existing records to avoid duplicates. The type-specific extension tables I recommended actually make this harder — you'd be querying across multiple tables for every SMS.
For automation, a better schema compromise is:
sqlholdings (
  id, user_id, type, name,
  
  -- identity fields for deduplication
  folio_number    TEXT,  -- MF folio, unique per fund
  ticker          TEXT,  -- stock ticker, unique per exchange
  account_number  TEXT,  -- loan/FD account
  
  -- common value fields
  quantity        REAL,
  avg_buy_price   REAL,
  current_price   REAL,
  invested_amount REAL,
  current_value   REAL,
  
  -- type-specific as JSON (flexible, no extra tables)
  metadata        TEXT,  -- JSON blob for type-specific extras
  
  -- automation fields
  sms_id          TEXT,  -- last SMS that updated this
  source          TEXT DEFAULT 'manual',  -- 'manual'|'sms'|'api'
  price_source    TEXT DEFAULT 'manual',
  price_updated_at TEXT,
  
  is_deleted INTEGER DEFAULT 0,
  updated_at TEXT
)
```

The `metadata` JSON column is the key insight here. For a stock it stores `{"exchange":"NSE","isin":"INE009A01021"}`. For an FD it stores `{"bank":"HDFC","maturity_date":"2026-08-01","interest_rate":7.1}`. You avoid nullable columns without the complexity of multiple tables, and SQLite handles JSON fine with `json_extract()`.

---

## Revised Architecture Recommendation

Given automation is a goal, here's what changes:
```
Current plan              →    Automation-ready plan
──────────────────────────────────────────────────────
Manual entry only         →    SMS auto-import + manual fallback
current_price only        →    price_snapshots table (charts later)
Flat nullable schema      →    Unified table + metadata JSON
No source tracking        →    source field ('manual'|'sms'|'api')
No dedup logic            →    folio_number/ticker as unique keys
Manual NAV updates        →    Daily AMFI background fetch for MFs
```

---

## Bottom Line

Your current architecture is **good for manual entry v1 but would need retrofitting for automation**. The changes aren't huge — mainly the schema additions above — but doing them now costs 1 extra day and saves you a painful migration later when you have real user data.

**Recommended v1 scope with automation in mind:**
```
✅ Build now:    SMS auto-import for SIP allotments + EMI payments
✅ Build now:    AMFI NAV auto-fetch (daily background task)  
✅ Build now:    price_snapshots table (empty for now, ready for charts)
✅ Build now:    metadata JSON + source fields on holdings table
⏳ Build later:  Stock price automation (v2)
⏳ Build later:  CAMS PDF import (v2)
❌ Don't build:  Account Aggregator / Zerodha API (compliance heavy)