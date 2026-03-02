➕ Added vs Previous Plan
📊
Returns by Holding bar chart
Overview now shows per-fund performance bars — users instantly see which investment is winning or losing.
📅
Upcoming SIPs widget
Overview shows SIPs due this month with days-remaining — reduces missed SIP surprises.
🏷️
Stale price badge
Holdings cards show "3d old" if price hasn't been updated recently — nudges users to keep data fresh.
⏳
EMI countdown chip
Loans show colour-coded countdown — red if due within 5 days, green if safe. Critical for UPI users who transfer manually.
📉
Loan repayment progress bar
Visual "paid vs remaining" bar on each loan — feels satisfying and motivating to see progress.
🔖
Holdings group filter chips
All / Stocks / FD / Gold filter chips — users with 10+ holdings can quickly focus on one type.
Screen 01 — Overview Tab
Portfolio Overview
The default landing tab. Aggregates data from sipStore + holdingsStore + loanStore into a single summary. No new DB queries — reads from existing stores and computes totals client-side.

Key computed values (all done in a single useMemo):
• totalPortfolioValue = sum(sip.current_value) + sum(holding.current_value) + sum(fd.maturity_value_today)
• totalInvested = sum(sip.invested_amount) + sum(holding.qty × avg_buy_price) + sum(fd.principal)
• totalReturns = totalPortfolioValue − totalInvested
• returnsPercent = (totalReturns / totalInvested) × 100
• allocationBreakdown = group by type, calculate % of total
• upcomingSIPs = sips where next_date is within current calendar month, sorted by date
State & Data
What Drives Overview
No local state needed — Overview is purely derived data. Use a single usePortfolioSummary() custom hook that reads from all three stores.
// hooks/usePortfolioSummary.ts
export const usePortfolioSummary = () => {
  const sips = useSipStore(s => s.sips);
  const holdings = useHoldingsStore(s => s.holdings);
  const loans = useLoanStore(s => s.loans);

  return useMemo(() => ({
    totalValue, totalInvested,
    returns, returnsPercent,
    allocation, upcomingSIPs,
    performanceByHolding
  }), [sips, holdings, loans]);
};
Files
What to Create / Modify
New files for this screen:
hooks/usePortfolioSummary.ts
components/investments/PortfolioHeroCard.tsx
components/investments/AllocationBar.tsx
components/investments/PerformanceBars.tsx
components/investments/UpcomingSIPsWidget.tsx
app/(tabs)/investments.tsx — add Overview as first tab
Screen 02 — Holdings Tab
Holdings (Stocks, FD, Gold, Bonds, PPF)
A new tab that didn't exist before. Backed by a new holdings SQLite table. Uses a new holdingsStore following the same Zustand pattern as sipStore. Grouped by type with filter chips at the top.

The "stale price" logic: if price_updated_at is more than 2 days ago for stocks, or more than 7 days for MFs, show the amber "Xd old" badge. This is calculated at render time with date-fns differenceInDays — no extra DB field needed.
DB Schema
New Holdings Table
-- db/repository/holdingsRepository.ts
CREATE TABLE IF NOT EXISTS holdings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- stock|fd|bond|gold|ppf|nps|other
  name TEXT NOT NULL,
  ticker TEXT,
  quantity REAL DEFAULT 0,
  avg_buy_price REAL DEFAULT 0,
  current_price REAL DEFAULT 0,
  buy_date TEXT,
  maturity_date TEXT, -- for FD/bonds
  interest_rate REAL, -- for FD/bonds
  notes TEXT,
  price_updated_at TEXT,
  is_deleted INTEGER DEFAULT 0,
  updated_at TEXT
);
Add Flow
Adding a New Holding
1
Tap "+ Add" → Type Picker
Bottom sheet with: Stock · FD · Bond · Gold · PPF · NPS · Other. Each has icon + one-line description.
2
Type-specific form screen
Stock: name, ticker, shares, avg price, buy date, current price. FD: bank, principal, rate, compounding, start/maturity date. Gold: description, units, buy price, current price.
3
Save → holdingsRepository.insert()
Write to SQLite → update holdingsStore → navigate back. Same offline-first pattern as transactions.
4
Price update (frequent action)
Each holding card has an "Update price" tap target. Opens a mini bottom sheet: just one number input + save. 3 taps max.
Files
Holdings Files
db/repository/holdingsRepository.ts
stores/holdingsStore.ts
components/investments/HoldingCard.tsx
components/investments/HoldingTypeFilter.tsx
components/investments/UpdatePriceSheet.tsx
app/(routes)/investment/add-holding.tsx
app/(routes)/investment/holding-detail.tsx
Screen 03 — Loans Tab (Upgrade)
Loans — What Changes
The loans tab already exists with loanStore + loanRepository untouched. This is purely a UI upgrade — no schema changes, no store changes. Three additions to the existing screen:

1. Outstanding summary card — total outstanding across all loans, combined monthly EMI, next due date. Computed from loanStore in a useMemo.

2. Repayment progress bar per loan — paid = principal − outstanding, bar fill = paid / principal × 100. Both values already exist in your schema.

3. EMI countdown chip — daysUntilEMI = differenceInDays(next_emi_date, today). Red chip if ≤ 5 days, green if > 5. This is a pure render-time calculation — zero DB changes needed.
Computed Values
Loans Summary Logic
// All computed from existing loanStore
const summary = useMemo(() => {
  const totalOutstanding =
    sum(loans.map(l => l.outstanding));

  const monthlyEMI =
    sum(loans.map(l => l.emi_amount));

  const nextDue = loans
    .map(l => l.emi_due_day)
    .sort()[0];

  return { totalOutstanding,
            monthlyEMI, nextDue };
}, [loans]);
Files
Loans — Only UI Changes
No new files needed. Only modify existing UI components:
app/(tabs)/investments.tsx — add summary card to Loans tab
components/investments/LoanSummaryCard.tsx
components/investments/LoanRepaymentBar.tsx
components/investments/EMICountdown.tsx
stores/loanStore.ts ✅ untouched
db/repository/loanRepository.ts ✅ untouched
Build Order
Recommended Implementation Sequence
1
DB + Store first (Day 1)
Create holdingsRepository.ts with the new table + CRUD functions. Create holdingsStore.ts. Extend sipRepository.ts with new columns (migration). Test with dummy data in SQLite explorer before touching any UI.
2
Holdings Tab (Day 2-3)
Build HoldingCard + filter chips + UpdatePriceSheet + add-holding form. This is the most complex new screen — do it while your DB layer is fresh in mind. Verify stale badge logic works correctly.
3
Loans UI Upgrade (Day 4 — half day)
Quickest win. No store/DB changes. Just add summary card, progress bar component, and EMI countdown chip to the existing Loans tab. Should take 3-4 hours.
4
SIPs Tab Upgrade (Day 4-5)
Extend SIP cards with current_value, units, returns%, NAV + last updated. Add UpdateNAVSheet component. Migrate existing SIP records to new schema columns with sensible defaults (0 for unset values).
5
Overview Tab last (Day 5-6)
Build Overview last — it's purely derived from the stores you've already built. Create usePortfolioSummary hook, build PortfolioHeroCard, AllocationBar, PerformanceBars, UpcomingSIPsWidget. Wire up and make it the default active tab.
6
Sync extension (Day 6)
Extend sync.ts to include the new holdings table in the Supabase sync cycle. Follow the same pattern as transactions: soft-delete via is_deleted, last-write-wins on updated_at, never sync null values.