# FinTrack — v3 Next Steps Implementation Plan
> Post v2 Completion · SMS Automation + Detail Screens + Bug Fixes

---

## Quick Status

| Area | Status |
|---|---|
| v2 Investment CRUD | ✅ Complete |
| Detail screen history lists | ⚠️ Needs verification |
| SMS dedup bug | ❌ P0 — fix first |
| SMS automation | 🔒 Blocked until above fixed |
| AMFI auto-fetch | ✅ Built, needs wiring |
| Estimated build time | 10–14 days |

---

## Section 1 — Gap Analysis

### ✅ What Is Genuinely Complete (from CLAUDE.md)

| Feature | Evidence |
|---|---|
| holdings, investmentTx, priceSnapshots repositories | Section 5 — all 3 listed |
| Extended sips table (v2 columns incl. scheme_code) | Section 5 — all 6 columns listed |
| holdingsStore + investmentTxStore | Section 6 — both listed with correct actions |
| sipStore v2 (recordAllotment, getXIRR, etc.) | Section 6 — all computed actions listed |
| usePortfolioSummary hook | Section 10 — full return shape documented |
| amfiNavService.ts | Section 7 — listed as Built |
| investmentCalculations.ts | utils/ folder listed |
| All CRUD routes (add/edit/detail for SIP, Holding, Loan) | Section 8 — all routes listed |
| RecordAllotmentSheet + RecordPaymentSheet | Section 8 — both listed |
| EMICountdown chip + repayment progress bar | Section 8 — both listed |
| Error boundaries on all tabs | Section 3 — ErrorBoundary.tsx listed |
| Sync extended for v2 tables | Section 7 — sync.ts noted as extended |
| PerformanceBars + UpcomingSIPsWidget | Section 8 — both listed |
| EMI alert service | Section 7 — emiAlertService.ts listed |

### ⚠️ Partially Done / Known Issues

| Issue | Severity | Detail |
|---|---|---|
| SIPsView allocation bar hardcoded | Medium | Lines 87-94: hardcoded 58%/28%/14% — should use `usePortfolioSummary` |
| ~136 TypeScript errors | Medium | ts_errors_final.log — charts, camera, settings, email parser |
| support.screen.tsx broken | Low | References undefined `isDarkMode`, `themeColor`, `darkThemeColor` |
| EmailImportScreen.tsx broken | Low | Missing style keys and `Transaction.title` property |
| camera.screen.tsx broken | Low | Expo Camera v2 API mismatch |

### ❌ Not Yet Built

| Feature | Priority | Why It Matters |
|---|---|---|
| SMS deduplication bug fix | P0 | Mark processed only after successful extraction — risk of silent data loss |
| Multiline SMS normalisation | P0 | HDFC UPI SMS spans multiple lines — parser misses these completely |
| Investment detail screens wired to real TX data | P1 | History FlashLists appear to be empty shells — investmentTxStore not wired to list UI |
| Sender-map registry (8 banks) | P1 | Bank-specific regex dramatically reduces false positives |
| Bulk "Update all prices" on Overview | P1 | Design spec item — flagged in Section 11 |
| OEM battery prompt validation (Xiaomi) | P1 | Works on stock Android only |
| XIRR per holding on Holdings tab | P2 | Infrastructure exists, not surfaced in HoldingCard yet |
| Value-over-time sparklines | P2 | price_snapshots table exists but no chart reads from it |
| AI rate limiting (20/day) | P2 | Gemini calls uncapped |
| AI response caching | P2 | No caching for identical queries |

> **CRITICAL FINDING:** The investment detail screens exist as routes but the transaction history FlashLists inside them appear to be empty shells. `investmentTxStore.transactionsByHolding` data is not visibly wired to the detail screen lists in the CLAUDE.md description. This is the most important thing to verify and fix before touching SMS automation — if transaction history is not showing, SMS-imported allotments will have nowhere to display.

---

## Section 2 — Should You Start Automation Now?

**No. Fix 3 things first, then automate.** Here is the exact reasoning.

### The 3 Blockers

#### Blocker 1 — Investment detail screens must show real transaction history

SMS automation will auto-create `investment_transactions` rows. If the detail screens cannot display these rows, users have no way to see, verify, or delete auto-imported data. You would be writing to a table with no readable UI.

**What to check:** Open `sip/[id].tsx` and confirm the allotment history FlashList reads from `investmentTxStore.transactionsByHolding(sipId)`. If it renders empty for a SIP that has recorded allotments, it is broken.

**What to fix:**
```typescript
// Ensure this pattern exists in sip/[id].tsx:
const { transactionsByHolding, fetchTransactions } = useInvestmentTxStore();
const allotments = transactionsByHolding[id] ?? [];

useEffect(() => {
  fetchTransactions(id); // load from SQLite into store
}, [id]);
```

Same check applies to `loan/[id].tsx` (payment history) and `holding/[id].tsx` (price history).

#### Blocker 2 — SMS deduplication bug (P0 in your own CLAUDE.md)

Your CLAUDE.md explicitly flags: _"Mark as processed only after successful extraction, never before."_

If `markAsProcessed()` runs before `repository.insert()` and the insert fails, that SMS is silently lost forever. For investment SMS (SIP allotments, loan EMIs), that means missing financial records with no recovery path.

**The fix:**
```typescript
// WRONG (assumed current):
await markSMSProcessed(smsId);         // marks BEFORE parsing
const result = await parseAndInsert(); // if this throws, SMS is lost

// CORRECT:
try {
  const result = await parseAndInsert(sms); // parse and write first
  if (result.success) {
    await markSMSProcessed(smsId); // only mark AFTER successful write
  }
} catch (error) {
  // SMS stays unprocessed — will retry on next app open
  console.warn('SMS parse failed, will retry:', smsId, error);
}
```

#### Blocker 3 — SIPsView allocation bar hardcoded

The Overview tab shows wrong allocation percentages after automation adds new allotments. `usePortfolioSummary().assetAllocation` is already computed correctly — it just needs to replace the hardcoded values.

```typescript
// SIPsView.tsx lines 87-94 — replace hardcoded array with:
const { assetAllocation } = usePortfolioSummary();
// Pass directly to AllocationBar — no changes needed to AllocationBar itself
```

### What Happens If You Skip These and Automate Anyway

| Scenario | Outcome |
|---|---|
| SMS imports SIP allotment → detail screen shows empty history | User cannot verify import. Trust drops immediately. |
| Dedup bug triggers during batch SMS import | Multiple allotments silently lost. Invested amount wrong. XIRR wrong. No indication to user. |
| SMS automation updates allocation → bar still shows 58/28/14 | Overview looks broken. User questions whether automation is working. |

> Once all 3 blockers are fixed — roughly 2–3 days of work — your automation infrastructure is in excellent shape. `amfiNavService.ts` is built, `smsAlertParser.ts` exists, the SMS pipeline is proven, all DB tables and stores are ready. The automation layer itself will be straightforward.

---

## Section 3 — Detail Screens — Exact Wiring

### 3.1 SIP Detail Screen — `sip/[id].tsx`

| Section | Data Source | Status |
|---|---|---|
| Fund name, folio, status badge | `sipStore.sips.find(id)` | Likely working |
| Performance card (invested, current value, returns, XIRR) | `sipStore` computed methods | Likely working |
| Current NAV + nav_updated_at | `sipStore.sips.find(id).current_nav` | Likely working |
| Allotment history FlashList | `investmentTxStore.transactionsByHolding[id]` | ⚠️ Needs verification |
| 'Record allotment' → RecordAllotmentSheet | RecordAllotmentSheet.tsx | Likely working |
| Edit / Delete actions | router + sipStore.deleteSIP | Likely working |

**Full wiring pattern:**
```typescript
// app/(routes)/investment/sip/[id].tsx
const { id } = useLocalSearchParams<{ id: string }>();
const sip = useSipStore(s => s.sips.find(s => s.id === id));

const { transactionsByHolding, fetchTransactions } = useInvestmentTxStore();
const allotments = transactionsByHolding[id] ?? [];

useEffect(() => {
  fetchTransactions(id);
}, [id]);

// JSX:
<FlashList
  data={allotments.filter(t => t.event_type === 'sip_allotment')}
  renderItem={({ item }) => <AllotmentRow tx={item} />}
  estimatedItemSize={72}
  ListEmptyComponent={<EmptyState message="No allotments recorded yet" />}
/>
```

### 3.2 Holding Detail Screen — `holding/[id].tsx`

```typescript
const holding = useHoldingsStore(s => s.holdings.find(h => h.id === id));
const { transactionsByHolding, fetchTransactions } = useInvestmentTxStore();
const priceHistory = transactionsByHolding[id]
  ?.filter(t => t.event_type === 'price_update') ?? [];

useEffect(() => { fetchTransactions(id); }, [id]);

// Stale price badge — computed at render, zero extra DB query
const daysOld = differenceInDays(new Date(), new Date(holding.price_updated_at));
const isStale = holding.type === 'stock' ? daysOld > 2 : daysOld > 7;

<FlashList
  data={priceHistory}
  renderItem={({ item }) => <PriceHistoryRow tx={item} />}
  estimatedItemSize={60}
/>
```

### 3.3 Loan Detail Screen — `loan/[id].tsx`

```typescript
const loan = useLoanStore(s => s.loans.find(l => l.id === id));
const { transactionsByHolding, fetchTransactions } = useInvestmentTxStore();
const payments = transactionsByHolding[id]
  ?.filter(t => t.event_type === 'emi_payment' || t.event_type === 'prepayment')
  ?.sort((a, b) => b.event_date.localeCompare(a.event_date)) ?? [];

useEffect(() => { fetchTransactions(id); }, [id]);

const paidAmount = loan.principal - loan.outstanding;
const progressPct = (paidAmount / loan.principal) * 100;

<FlashList
  data={payments}
  renderItem={({ item }) => <PaymentRow tx={item} />}
  estimatedItemSize={68}
  ListHeaderComponent={<LoanSummaryCard loan={loan} progress={progressPct} />}
/>
```

### 3.4 New Row Components Needed

| Component | Fields | File |
|---|---|---|
| `AllotmentRow` | Date · Units · NAV · Amount · source badge (manual/sms) | `components/investments/AllotmentRow.tsx` |
| `PaymentRow` | Date · Amount · Balance after · source badge | `components/investments/PaymentRow.tsx` |
| `PriceHistoryRow` | Date · Price · Change from prev · source badge (manual/amfi/sms) | `components/investments/PriceHistoryRow.tsx` |

---

## Section 4 — Bug Fixes

### 4.1 SMS Dedup Fix (P0)

See Blocker 2 above. Move `markAsProcessed()` to after successful `repository.insert()`.

### 4.2 Multiline SMS Normalisation (P0)

```typescript
// services/smsParser.ts — add at the top of parseSMS()
const normaliseSMSBody = (body: string): string => {
  return body
    .replace(/\r\n/g, ' ')  // Windows line endings
    .replace(/\n/g, ' ')    // Unix line endings
    .replace(/\r/g, ' ')    // old Mac line endings
    .replace(/\s{2,}/g, ' ') // collapse multiple spaces
    .trim();
};

// Call at entry point:
const normalisedBody = normaliseSMSBody(rawSmsBody);
// Use normalisedBody in all subsequent regex matches
```

### 4.3 SIPsView Allocation Bar (Medium)

See Blocker 3 above. One line change in `SIPsView.tsx` lines 87-94.

---

## Section 5 — SMS Automation Implementation

### 5.1 Architecture

| Component | File | What It Does |
|---|---|---|
| Raw SMS reading | `nativeSmsModule.ts` | ✅ Already built — no changes |
| SMS routing | `smsParser.ts` | Add: route investment SMS to `smsAlertParser` BEFORE transaction parser |
| Investment SMS parsing | `smsAlertParser.ts` | Extend: add SIP allotment, loan EMI, stock buy patterns |
| Investment data writing | `investmentSmsHandler.ts` (new) | Translates parsed result to `investmentTxRepository` inserts |
| Dedup check | `investmentTxRepository.ts` | Add: `findBySmsId()` |
| Store refresh | `sipStore` / `loanStore` / `holdingsStore` | Call `.fetchSIPs()` etc. after successful import |
| Background import | `smsHeadlessTask.ts` | Extend: call `investmentSmsHandler` after existing transaction handler |

### 5.2 SMS Patterns for `smsAlertParser.ts`

#### SIP Allotment
```typescript
// Matches SBI MF, HDFC MF, ICICI Pru, Mirae, Parag Parikh etc.
// Example: "Units allotted 11.841 for Rs.999 in Valu Fund Folio:1234567 NAV:84.32 Dt:01-Mar-2026"
const SIP_ALLOTMENT = /units allotted ([\d.]+).*?(?:rs\.?|inr)\s*([\d,]+).*?folio[:\s]*(\d+).*?nav[:\s]*([\d.]+)/i;

// AMFI confirmation format
// "Dear Investor, your SIP of Rs.999 in Fund XYZ has been processed. Units: 11.84, NAV: 84.32, Folio: 1234567"
const SIP_CONFIRMATION = /sip of (?:rs\.?|inr)\s*([\d,]+).*?units[:\s]*([\d.]+).*?nav[:\s]*([\d.]+).*?folio[:\s]*(\d+)/i;
```

#### Loan EMI
```typescript
// Example: "EMI of Rs.35000 debited from A/C XX4521 for Loan A/C XX9876. Outstanding: Rs.27,20,000. -SBI"
const LOAN_EMI = /emi of (?:rs\.?|inr)\s*([\d,]+).*?(?:loan|a\/c)[:\s]*[x*]*(\d{4}).*?outstanding[:\s]*(?:rs\.?|inr)\s*([\d,]+)/i;

// HDFC format: "Your EMI of INR 5,500.00 for Loan ending 8832 is due on 10-Apr-2026"
const LOAN_EMI_DUE = /emi of (?:rs\.?|inr)\s*([\d,.]+).*?loan ending (\d{4}).*?due on ([\d-]+)/i;
```

#### Stock Buy/Sell (Zerodha, Groww, Upstox)
```typescript
// Zerodha: "Bought 10 INFY @ 1895.00 on NSE. Order 234567890. -Zerodha"
const STOCK_BUY  = /bought (\d+) ([A-Z]+) @\s*([\d.]+) on (NSE|BSE)/i;

// Groww: "Order executed: Bought 5 RELIANCE at Rs.2850 on NSE"
const STOCK_BUY_GROWW = /order executed.*?bought (\d+) ([A-Z]+) at (?:rs\.?|inr)\s*([\d,]+) on (NSE|BSE)/i;

const STOCK_SELL = /sold (\d+) ([A-Z]+) @\s*([\d.]+) on (NSE|BSE)/i;
```

#### FD Maturity
```typescript
// "Your FD of Rs.50,000 with HDFC Bank matured on 31-Mar-2026. Maturity amount Rs.53,550 credited to A/C XX1234"
const FD_MATURITY = /fd of (?:rs\.?|inr)\s*([\d,]+).*?matured.*?maturity amount.*?([\d,]+)/i;
```

### 5.3 New File: `services/investmentSmsHandler.ts`

```typescript
export const handleSIPAllotmentSMS = async (
  parsed: ParsedSIPAllotment,
  smsId: string
) => {
  // Step 1: Dedup check
  const existing = await investmentTxRepository.findBySmsId(smsId);
  if (existing) return { status: 'duplicate', skipped: true };

  // Step 2: Find or create matching SIP by folio number
  let sipId: string;
  const sip = await sipRepository.findByFolio(parsed.folioNumber);
  if (!sip) {
    // Auto-create a skeleton SIP — user fills in missing details later
    sipId = await sipRepository.createFromSMS({
      folio_number: parsed.folioNumber,
      amount: parsed.amount,
      source: 'sms',
    });
  } else {
    sipId = sip.id;
  }

  // Step 3: Write investment_transaction event
  await investmentTxRepository.insert({
    holding_id:   sipId,
    holding_type: 'sip',
    event_type:   'sip_allotment',
    amount:       parsed.amount,
    units:        parsed.units,
    nav:          parsed.nav,
    event_date:   parsed.date,
    source:       'sms',
    sms_id:       smsId, // dedup key
  });

  // Step 4: Write price snapshot
  await priceSnapshotRepository.insert({
    holding_id:  sipId,
    price:       parsed.nav,
    recorded_at: parsed.date,
    source:      'sms',
  });

  // Step 5: Recompute SIP aggregate values
  await sipStore.getState().recordAllotment(sipId, {
    units: parsed.units,
    nav:   parsed.nav,
    amount: parsed.amount,
  });

  return { status: 'success', sipId };
};

// Also create:
// handleLoanEMISMS(parsed, smsId) — writes emi_payment + updates outstanding
// handleStockBuySMS(parsed, smsId) — finds/creates holding + writes buy event
```

### 5.4 Routing in `smsParser.ts`

> **CRITICAL:** Route investment SMS BEFORE transaction SMS. SIP allotment SMS contains amount values that the generic transaction parser will incorrectly classify as an expense. Without this routing priority, you will get a duplicate — one correct `investment_transaction` AND one incorrect expense transaction for the same SMS.

```typescript
// services/smsParser.ts — add at top of parseSMS()
export const parseSMS = async (sms: RawSMS) => {
  const body = normaliseSMSBody(sms.body); // fix from Section 4

  // Investment patterns FIRST — more specific than transaction patterns
  const sipAllotment = smsAlertParser.parseSIPAllotment(body);
  if (sipAllotment) {
    return investmentSmsHandler.handleSIPAllotmentSMS(sipAllotment, sms.id);
  }

  const loanEMI = smsAlertParser.parseLoanEMI(body);
  if (loanEMI) {
    return investmentSmsHandler.handleLoanEMISMS(loanEMI, sms.id);
  }

  const stockBuy = smsAlertParser.parseStockBuy(body);
  if (stockBuy) {
    return investmentSmsHandler.handleStockBuySMS(stockBuy, sms.id);
  }

  // Fall through to existing transaction parsing
  return parseTransactionSMS(body, sms);
};
```

---

## Section 6 — AMFI NAV Wiring

`amfiNavService.ts` is built but needs connecting to the app lifecycle.

### Trigger Points

| Trigger | Where | Frequency |
|---|---|---|
| App foreground | `app/_layout.tsx` — AppState listener | Once per day max (guarded internally) |
| Background fetch | `recurringBackground.ts` | Daily background task |
| Manual refresh | 'Refresh NAV' button on Overview tab | On demand |

### App Foreground Trigger

```typescript
// app/_layout.tsx
import { AppState } from 'react-native';
import { fetchAndUpdateNAVs } from '@/services/amfiNavService';

useEffect(() => {
  const subscription = AppState.addEventListener('change', async (state) => {
    if (state === 'active') {
      // amfiNavService internally checks if already fetched today — safe to call every time
      fetchAndUpdateNAVs().catch(console.warn); // silent fail, never block UI
    }
  });
  return () => subscription.remove();
}, []);
```

### scheme_code Field Note

The `scheme_code` column exists on the sips table (confirmed in CLAUDE.md Section 5). Without it, AMFI auto-fetch cannot match the right SIP.

- **When user adds a SIP:** Add optional 'AMFI Scheme Code' field to `add-sip.tsx` with helper text: _"Find your scheme code on your fund house website or CAS statement"_
- **When SMS imports a SIP:** scheme_code is not in allotment SMS — leave blank, user fills in later from SIP detail screen
- **If scheme_code is blank:** AMFI fetch skips that SIP — NAV still updatable manually via UpdateNAVSheet

---

## Section 7 — Build Order

> Follow this strictly. Days 4–8 (automation) must not start until Days 1–3 are tested on a real device. "Tested" = open a detail screen, record a manual allotment/payment, confirm it appears in the history list.

| Day | Task | Files | Test Gate |
|---|---|---|---|
| 1 AM | Fix SMS dedup — move `markAsProcessed()` after successful insert | `smsParser.ts` | Force a parse error. Confirm SMS is NOT marked as processed. |
| 1 PM | Fix multiline SMS — add `normaliseSMSBody()` | `smsParser.ts` | Test multiline string in SMSDebugService. Confirm it parses. |
| 1 PM | Fix SIPsView allocation bar — replace hardcoded values | `SIPsView.tsx` lines 87-94 | Add test SIP + holding. Confirm bar reflects real percentages. |
| 2 | Wire investmentTxStore to SIP detail — allotment FlashList | `sip/[id].tsx` | Record 2 allotments manually. Open SIP detail. Both must appear. |
| 2 | Wire investmentTxStore to Loan detail — payment FlashList | `loan/[id].tsx` | Record EMI payment. Open Loan detail. Payment appears. Outstanding decreased. |
| 2 | Wire investmentTxStore to Holding detail — price history FlashList | `holding/[id].tsx` | Update price manually. Open Holding detail. Price update appears in history. |
| 3 | Create AllotmentRow, PaymentRow, PriceHistoryRow components | `components/investments/` (3 new files) | Each row shows correct fields with source badge. |
| 3 | Add scheme_code field to add-sip form | `app/(routes)/investment/add-sip.tsx` | Create SIP with scheme code. Confirm it saves. |
| 4 | Extend smsAlertParser with SIP allotment patterns | `smsAlertParser.ts` | Run 10 real SIP allotment SMS strings. All must parse correctly. |
| 4 | Extend smsAlertParser with loan EMI patterns | `smsAlertParser.ts` | Run 5 real loan EMI SMS strings. All must parse correctly. |
| 5 | Create `investmentSmsHandler.ts` — SIP allotment + loan EMI handlers | `services/investmentSmsHandler.ts` (new) | Call handler manually. Confirm `investment_transaction` row in SQLite. |
| 5 | Add `findBySmsId()` to investmentTxRepository | `db/repository/investmentTxRepository.ts` | Call handler twice with same smsId. Second call returns `{skipped: true}`. |
| 6 | Add investment routing to smsParser — before transaction routing | `smsParser.ts` | Send SIP allotment SMS through full pipeline. Confirm: investment_transaction created, NO duplicate expense transaction. |
| 7 | Wire AMFI NAV fetch to AppState foreground trigger | `app/_layout.tsx` | Background app 1 min. Foreground it. Confirm AMFI fetch attempt in logs. |
| 7 | Add manual 'Refresh NAV' button to Overview tab | `OverviewView.tsx` | Tap button. NAV updates + price_snapshot written + SIP current_value updates. |
| 8 | Add stock buy/sell SMS patterns + `handleStockBuySMS` | `smsAlertParser.ts`, `investmentSmsHandler.ts` | Run Zerodha/Groww SMS strings. Confirm holding created or updated. |
| 9 | OEM battery prompt validation on Xiaomi (if device available) | `oemDetection.ts` | Xiaomi device: prompt appears on first SMS import attempt. |
| 10 | TypeScript cleanup — critical errors in ts_errors_final.log | Various | `npx tsc --noEmit` shows 0 errors in investment module files. |

---

## Section 8 — File Manifest

### New Files

| File | Purpose | Day |
|---|---|---|
| `services/investmentSmsHandler.ts` | Translates parsed SMS into investment_transaction writes | 5 |
| `components/investments/AllotmentRow.tsx` | Display component for one SIP allotment event | 3 |
| `components/investments/PaymentRow.tsx` | Display component for one loan payment event | 3 |
| `components/investments/PriceHistoryRow.tsx` | Display component for one price update event | 3 |

### Modified Files

| File | Change | Day |
|---|---|---|
| `services/smsParser.ts` | (1) Move markAsProcessed after insert. (2) Add normaliseSMSBody(). (3) Add investment routing before transaction routing. | 1 + 6 |
| `services/smsAlertParser.ts` | Add SIP allotment, loan EMI, stock buy/sell, FD maturity patterns | 4 + 8 |
| `db/repository/investmentTxRepository.ts` | Add `findBySmsId()` dedup check | 5 |
| `db/repository/sipRepository.ts` | Add `findByFolio()` for SMS-based SIP matching | 5 |
| `app/(routes)/investment/sip/[id].tsx` | Wire investmentTxStore allotment history to FlashList | 2 |
| `app/(routes)/investment/loan/[id].tsx` | Wire investmentTxStore payment history to FlashList | 2 |
| `app/(routes)/investment/holding/[id].tsx` | Wire investmentTxStore price history to FlashList | 2 |
| `app/(routes)/investment/add-sip.tsx` | Add optional scheme_code field with helper text | 3 |
| `screens/investment/components/SIPsView.tsx` | Replace hardcoded allocation percentages with usePortfolioSummary | 1 |
| `app/_layout.tsx` | Add AppState listener to trigger AMFI NAV fetch on foreground | 7 |
| `screens/investment/components/OverviewView.tsx` | Add 'Refresh NAV' manual button | 7 |

### Untouched Files

| File | Reason |
|---|---|
| All DB repositories except `investmentTxRepository` + `sipRepository` | Schema complete from v2 |
| All Zustand stores (except triggered refreshes) | Store actions complete from v2 |
| `usePortfolioSummary` hook | Computing correct values — just needed in SIPsView |
| `amfiNavService.ts` | Built and working — only needs triggering |
| `RecordAllotmentSheet`, `RecordPaymentSheet`, `UpdateNAVSheet` | Working from v2 |
| All transaction files (transactionStore, transactionRepository, etc.) | Automation is additive — does not change transaction layer |
| All budget, category, settings screens | Out of scope for v3 |

---

## Section 9 — P2 Backlog (After v3)

These become feasible once v3 is complete and real data has accumulated in `price_snapshots` and `investment_transactions`.

| Feature | Why Now Feasible | Effort |
|---|---|---|
| Value-over-time sparkline charts | `price_snapshots` will have real data after v3 runs 2–3 weeks | Medium — chart component only |
| XIRR per holding on HoldingCard | `investmentTxStore` has full buy history after v3 | Small — call `computeXIRR()` in HoldingCard |
| Bulk 'Update all prices' on Overview | All stores loaded — one button triggers UpdatePriceSheet for each stale holding | Medium |
| Sender-map registry (8 banks) | v3 proves patterns — bank-specific patterns are an upgrade to proven code | Medium |
| AI rate limiting (20/day) | Independent of investment module | Small |
| AI response caching | Independent of investment module | Small |
| Value-over-time portfolio graph | Requires 30+ days of price_snapshots accumulation | Medium |
| CAMS/Karvy CAS PDF import | `investmentSmsHandler` pattern is the model | Hard |

---

*FinTrack · v3 Next Steps · Post v2 Completion*
