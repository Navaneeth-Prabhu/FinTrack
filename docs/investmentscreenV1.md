Investment Tracking — Implementation Plan
A complete plan to upgrade the Investments screen from a basic SIP logger to a proper portfolio tracker. All data is manually entered — no external API needed.
01 — Data Model
What to Track Per Investment Type
Mutual Funds / SIPs
Fields: fund name, folio number, SIP amount, frequency, start date, status (active/paused/cancelled)
Per update: current NAV, total units, current value, invested amount — user manually enters NAV periodically

Computed fields (client-side):
• Returns = current_value − invested_amount
• Returns % = (returns / invested) × 100
• XIRR — complex but doable with a JS library (xirr npm package)
-- sips table (already exists, extend it)
folio_number TEXT,
total_units REAL, -- manually updated
current_nav REAL, -- last known NAV
nav_updated_at TEXT, -- when was NAV last entered
invested_amount REAL, -- cumulative invested
current_value REAL -- units × current_nav
Stocks / Direct Equity
Fields: stock name, ticker symbol, exchange (NSE/BSE), number of shares, avg buy price, buy date
Per update: current price — user enters manually or from a broker SMS

Computed: current value = shares × current_price, P&L = current_value − (shares × avg_buy_price)
-- new: holdings table
id TEXT PRIMARY KEY,
user_id TEXT,
type TEXT, -- 'stock' | 'fd' | 'bond' | 'gold' | 'crypto' | 'other'
name TEXT,
ticker TEXT, -- optional, for stocks
quantity REAL,
avg_buy_price REAL,
current_price REAL,
buy_date TEXT,
notes TEXT,
price_updated_at TEXT,
is_deleted INTEGER DEFAULT 0,
updated_at TEXT
FDs / Bonds / PPF / NPS
Simpler model — no units or NAV. Just: institution, principal, interest rate, start date, maturity date, maturity amount

Maturity value is computed: P × (1 + r/n)^(n×t) — no manual updates needed until maturity.
02 — Screen Architecture
Tab Structure & What Each Tab Shows
1
Overview Tab (new)
Portfolio summary card (total value, invested, returns, XIRR), asset allocation bar, quick stats. This is what most users should land on first. Think of it as the "dashboard" for investments.
2
SIPs Tab (existing, upgraded)
Current SIP list but with current value, units, returns%, NAV + last updated timestamp per card. Add "Update NAV" quick action on each card — tapping opens a small bottom sheet with a number input. Status badges (Active / Paused / Cancelled).
3
Holdings Tab (new)
Stocks, FDs, Bonds, Gold, PPF, NPS — all non-SIP investments in one list. Grouped by type with a mini allocation view. Each row shows: name, current value, P&L amount, P&L %. Tap to expand for full details.
4
Loans Tab (existing)
Keep as-is. Minor upgrade: show outstanding vs principal as a progress bar. Add days-until-next-EMI countdown.
5
Alerts Tab (existing)
Keep as-is. Future: add price alerts when user manually sets a target NAV or stock price.
03 — Add Investment Flow
The "+ Add" Button Experience
Step 1 — Type Picker Bottom Sheet
Tapping "+ Add" opens a bottom sheet with investment type options:

Mutual Fund / SIP · Stock · Fixed Deposit · Bond · Gold · PPF/NPS · Other

Each type has an icon and a one-line description. Selecting a type advances to the relevant form.
Step 2 — Type-Specific Form
Each investment type has a tailored form. Don't show FD-specific fields for a stock entry. Key principle: only required fields on first screen, optional fields collapsible under "More details".

MF/SIP form: fund name, folio (optional), SIP amount, frequency, start date, initial NAV, units
Stock form: name, ticker (optional), shares, avg buy price, buy date, current price
FD form: bank, principal, interest rate, compounding, start date, maturity date
NAV / Price Update Flow (critical UX)
This is the most frequent action after initial setup. Two entry points:

1. Quick update — each SIP/holding card has an "Update price" chip. Tap → inline bottom sheet → enter new value → save. Should be 3 taps max.
2. Bulk update — "Update all prices" button in Overview tab header for power users who want to update everything at once in a single session.

Always show last updated X days ago so users know which prices are stale.
04 — Files to Change
What's New vs Modified vs Untouched
New Files
db/repository/holdingsRepository.ts
stores/holdingsStore.ts
components/investments/HoldingCard.tsx
components/investments/UpdatePriceSheet.tsx
components/investments/AddInvestmentSheet.tsx
components/investments/PortfolioSummaryCard.tsx
components/investments/AllocationBar.tsx
app/(routes)/investment/holdings.tsx
Modified Files
app/(tabs)/investments.tsx — add Overview tab + restructure
db/repository/sipRepository.ts — add NAV/units/value fields
stores/sipStore.ts — add currentValue, returns computed fields
components/investments/SipCard.tsx — add 6-stat grid + NAV update
Untouched
loanStore.ts ✅
loanRepository.ts ✅
sync.ts ✅ (extend for holdings)
smsParser.ts ✅
Loans tab UI ✅
Alerts tab UI ✅
05 — Scope Guard
What NOT to Build (v1)
No live price API — manual entry only. Zerodha/AMFI API integration is v2.
No transaction history per holding — only current snapshot. Buy/sell history tracking is v2.
No XIRR calculation — show simple returns % only. XIRR needs full transaction history.
No portfolio graphs / charts — allocation bar is sufficient for v1. Value-over-time chart needs historical snapshots.
No import from CAMS/Karvy — too complex for v1, major feature for v2.