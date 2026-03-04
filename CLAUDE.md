# FinTrack — AI Assistant Context

> **What this file is:** A reference for any AI assistant working on this codebase. Read this **entirely** before touching anything. It contains the exact current state of the project — what is built, what is pending, and what should never be touched.

---

## 1. Project Overview

**FinTrack** is an **Android-only** personal finance mobile app (Expo / React Native).
Its companion web app is **PersonalFinance** (`d:\Programing\PersonalFinance`), built with Next.js 14.
Both share a **single Supabase backend** (Postgres + Auth + Storage).

**Core promise:** "Open the app. Your money is already tracked." — transactions are imported automatically from SMS with zero manual setup.

- **Target users:** ~10 people (salaried, students, freelancers) — heavy Indian UPI users on Android
- **Platform:** Android only (SMS reading is impossible on iOS — do NOT add iOS-specific code)
- **App version:** 1.0.0 (active development)

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Expo ~52 + React Native 0.76 | `expo-router` for file-based navigation |
| Language | TypeScript | Strict-ish, see `tsconfig.json` |
| Local DB | `expo-sqlite` ~15 | Offline-first, primary data store |
| State | Zustand ~5 | Stores live in `stores/` |
| Cloud sync | Supabase | Auth + Postgres sync; free tier — batch syncs, never row-by-row |
| Charts | `react-native-gifted-charts`, `victory-native` | Both used in different screens |
| Icons | `lucide-react-native`, `@expo/vector-icons` | Prefer lucide for new components |
| Fonts | `@expo-google-fonts/urbanist` | Single consistent typeface |
| UI primitives | `@gorhom/bottom-sheet` | Modal-style sheets |
| Animations | `react-native-reanimated` ~3 | Used for transitions and gestures |
| OCR | `tesseract.js` | Receipt scanning — runs on-device, slow on mid-range phones |
| Auth | Supabase Auth + `expo-auth-session` | Google OAuth supported |
| Background tasks | `expo-task-manager` + `expo-background-fetch` | SMS polling background job |
| List rendering | `@shopify/flash-list` | Use instead of FlatList for investment/transaction lists |

---

## 3. Folder Structure

```
fintrack/
├── app/                    # Expo Router file-based routes
│   ├── (auth)/             # login.tsx, signup.tsx
│   ├── (onboarding)/       # First-run flow
│   ├── (tabs)/             # Bottom tab navigator
│   │   ├── index.tsx       # Dashboard (home) — wraps home.screen.tsx in ErrorBoundary
│   │   ├── timeline.tsx    # Transaction timeline — wraps timeline.screen.tsx in ErrorBoundary
│   │   ├── budgets.tsx     # Budget overview — wraps SmartBudgetInterface in ErrorBoundary
│   │   ├── investments.tsx # Investments — wraps investments.screen.tsx in ErrorBoundary
│   │   └── settings.tsx    # App settings — wraps settings.screen.tsx in ErrorBoundary
│   └── (routes)/           # Stack screens (pushed on top of tabs)
│       ├── transaction/    # [id].tsx (detail), transactionForm.tsx, searchTransaction.tsx
│       ├── budget/         # add.tsx, edit.tsx, [id].tsx
│       ├── category/       # list.tsx, add.tsx, edit.tsx, [id].tsx, manage.tsx
│       ├── investment/     # Full CRUD for SIPs, Holdings, Loans (see Section 8)
│       ├── account/        # manage.tsx
│       ├── settings/       # 4 sub-screens
│       └── ai/             # chat.tsx
├── screens/                # Screen-level components (true logic lives here)
│   ├── home/               # home.screen.tsx
│   ├── transaction/        # timeline.screen.tsx, transactionForm.screen.tsx, transaction.details.screen.tsx, etc.
│   ├── investment/         # investments.screen.tsx + components/
│   ├── settings/           # settings.screen.tsx, more.screen.tsx, BiometricSection, DataImportSection, etc.
│   ├── budget/             # Budget form screens
│   ├── category/           # Category list screen
│   ├── auth/               # EmailImportScreen
│   ├── account/            # manage.account.screen.tsx
│   └── alerts/             # alerts screen
├── components/             # Reusable UI components
│   ├── ErrorBoundary.tsx   # ✅ Class component, wraps all tab screens
│   ├── BudgetCard.tsx      # Budget display card
│   ├── FinancialHealthScore.tsx # Health score widget on dashboard
│   ├── FinancialSummaryCard.tsx # Income/expense summary widget
│   ├── SmartAlerts.tsx     # Rule-based alerts panel
│   ├── SmartBalanceForecast.tsx # Forecast chart
│   ├── SmartBudgetInterface.tsx # Budget tab UI
│   ├── TotalBalance.tsx    # Balance display (uses useCurrency)
│   ├── SMSImportButton.tsx # Manual SMS import trigger button
│   ├── ReceiptScanner.tsx  # OCR receipt scanning
│   ├── common/             # ThemedText, Button, etc.
│   ├── charts/             # barchartData.ts, CustomLineChart.tsx, etc.
│   ├── investments/        # SIPCard.tsx, UpdateNAVSheet.tsx
│   ├── transactions/       # TransactionItem, RecurringSection, etc.
│   ├── bottomSheet/        # Reusable bottom sheet wrappers
│   └── ui/                 # IconSymbol, etc.
├── stores/                 # Zustand state stores (see Section 6)
├── db/
│   ├── repository/         # SQLite CRUD functions (12 files — one per entity)
│   └── services/           # DB service layer
├── services/               # Business logic services (16 files — see Section 7)
├── hooks/                  # Custom React hooks (see Section 9)
├── constants/              # Colors.ts, theme.ts, sizes.ts
├── utils/                  # budget.ts, date.ts, investmentCalculations.ts, etc.
├── types/                  # TypeScript type definitions (index.ts, etc.)
└── android/                # Native Android project (DO NOT edit unless necessary)
```

---

## 4. Key Architectural Patterns

### Offline-First
All data is written to **SQLite first**, then synced to Supabase asynchronously.
Never assume network is available. Never block UI on sync.

### State Management
- **Zustand stores** are the source of truth for UI state.
- After any DB write, call the corresponding store's refresh/load action.
- `transactionStore.ts` is the most important store — it powers the dashboard, timeline, and charts.
- Each store has a `load` or `fetch` action that reads from SQLite and updates the store.

### Data Flow (typical transaction creation)
```
User input / SMS parsed
  → Write to SQLite via repository (db/repository/)
  → Update Zustand store (call store.load())
  → UI re-renders reactively
  → Background: sync.ts pushes diff to Supabase
```

### Theme System
- `hooks/useTheme.ts` — returns `{ colors, getShadow }`. **Always use this**, never access `Colors.ts` directly in components.
- Color keys available: `background`, `secondaryBackground`, `foreground`, `card`, `secondarycard`, `cardForeground`, `text`, `subtitle`, `border`, `primary`, `secondary`, `success`, `warning`, `error`, `ring`, etc.
- **`colors.textMuted` does NOT exist** — use `colors.subtitle` instead.

### Currency Formatting
- `hooks/useCurrency.ts` — returns `{ format }`. Call `format(amount)` for all currency display.
- **Never hardcode currency symbols.** User-configurable currency lives in `preferenceStore.ts`.

### Navigation
- `expo-router` file-based routing.
- From stack screens use `useRouter()` from `expo-router`.
- `router.push('/investment/add-sip')` pattern. If TypeScript complains about the path type, cast: `router.push('/some-path' as any)`.

### SMS Pipeline
1. `nativeSmsModule.ts` — reads raw SMS from Android content provider
2. `smsParser.ts` — regex-based extraction (amount, merchant, date, type)
3. `smsCategorizationService.ts` — maps to category
4. `smsAlertParser.ts` — parses investment/LIC/SIP-specific SMS separately
5. `db/repository/transactionRepository.ts` — persists result
6. `transactionStore.ts` — updates in-memory state

**Critical SMS rules:**
- Mark SMS as processed **only after successful extraction**, never before
- Raw SMS bodies are **stored locally only** — never sync raw SMS to Supabase (privacy)
- The `sms_id` field is used for deduplication across all entities

### Sync Architecture
- Sync scope: transactions, categories, budgets, sips, loans, holdings, goals — **not raw SMS data**
- Conflict resolution: **last-write-wins** (using `updated_at` timestamp)
- Every synced record has: `id (uuid)`, `user_id`, `updated_at`, `device_id`, `is_deleted` (soft delete)
- Sync triggers: app foreground, wifi connect, manual pull-to-refresh
- Source file: `services/sync.ts`

---

## 5. Database Schema (Local SQLite)

Full schema lives in `db/repository/`. Here is every active table:

| Table | Repository File | Notes |
|---|---|---|
| `transactions` | `transactionRepository.ts` | Core table — income/expense/transfer |
| `categories` | `categoryRepository.ts` | User-defined categories with icon, colour |
| `budgets` | `budgetRepository.ts` | Category-based budget limits |
| `sips` | `sipRepository.ts` | SIP plans with extended v2 fields |
| `loans` | `loanRepository.ts` | Loan / EMI tracking |
| `holdings` | `holdingsRepository.ts` | ✅ v2 — Stocks, FD, Gold, PPF, NPS, other |
| `investment_transactions` | `investmentTxRepository.ts` | ✅ v2 — SIP allotments, loan payments, price updates |
| `price_snapshots` | `priceSnapshotRepository.ts` | ✅ v2 — Price history per holding |
| `recurring_transactions` | `recurringTransactionRepository.ts` | Recurring transaction schedules |
| `accounts` | `accountRepository.ts` | User accounts / wallets |
| `alerts` | `alertRepository.ts` | App alerts / notifications |
| `metrics` | `metricsRepository.ts` | Computed financial metrics cache |

### Extended `sips` table (v2 columns added)
```sql
total_units     REAL DEFAULT 0
current_nav     REAL DEFAULT 0
invested_amount REAL DEFAULT 0
current_value   REAL DEFAULT 0
nav_updated_at  TEXT
scheme_code     TEXT    -- AMFI scheme code for auto NAV fetch
```

### `holdings` table (v2, new)
Type column: `'stock' | 'fd' | 'bond' | 'gold' | 'ppf' | 'nps' | 'other'`
Type-specific extras stored as JSON in `metadata TEXT` column.

### `investment_transactions` table (v2, new)
Event types: `sip_allotment`, `emi_payment`, `price_update`, `buy`, `sell`, `dividend`, `prepayment`, etc.

---

## 6. Zustand Stores

| Store file | Purpose | Key actions |
|---|---|---|
| `transactionStore.ts` | PRIMARY — all transactions | `loadTransactions`, `addTransaction`, `updateTransaction`, `deleteTransaction` |
| `budgetStore.ts` | Budget tracking + alerts | `loadBudgets`, `addBudget`, `updateBudget`, `deleteBudget` |
| `categoryStore.ts` | Category list + CRUD | `loadCategories`, `addCategory`, `updateCategory`, `deleteCategory` |
| `sipStore.ts` | SIP plans with v2 computed values | `fetchSIPs`, `addSIP`, `updateSIP`, `deleteSIP`, `recordAllotment`, `getTotalInvested()`, `getCurrentValue()`, `getReturns()`, `getXIRR()` |
| `loanStore.ts` | Loan / EMI tracking | `fetchLoans`, `addLoan`, `updateLoan`, `deleteLoan`, `recordPayment` |
| `holdingsStore.ts` | ✅ v2 — All non-SIP holdings | `fetchHoldings`, `addHolding`, `updateHolding`, `deleteHolding` |
| `investmentTxStore.ts` | ✅ v2 — Investment event log | `fetchTransactions`, `transactionsByHolding` (indexed by holdingId) |
| `preferenceStore.ts` | User preferences (currency, theme) | `setCurrency`, `setTheme` |
| `supabaseAuthStore.ts` | Auth state (user session) | `signIn`, `signOut`, `user` |
| `syncStore.ts` | Sync state tracking | `isSyncing`, `lastSyncTime` |
| `metricsStore.ts` | Computed financial metrics | `loadMetrics` |
| `accountStore.ts` | User account / wallet | `loadAccounts` |
| `alertStore.ts` | Alert list | `loadAlerts`, `addAlert`, `markRead` |
| `insightsStore.ts` | Rule-based insights | `loadInsights` |
| `recurringTransactionStore.ts` | Recurring schedules | Full CRUD |
| `smsSyncStore.ts` | SMS sync state | `lastSmsProcessed` |

---

## 7. Services

| File | Purpose | Status |
|---|---|---|
| `smsParser.ts` | MAIN parser (39KB) — regex extraction from bank SMS | ✅ Built |
| `smsCategorizationService.ts` | Maps parsed SMS to expense categories | ✅ Built |
| `smsAlertParser.ts` | Parses LIC, SIP confirmation, alert-type SMS | ✅ Built |
| `smsInitService.ts` | First-run SMS import orchestrator | ✅ Built |
| `smsHeadlessTask.ts` | Android HeadlessJS task for real-time SMS | ✅ Built |
| `nativeSmsModule.ts` | Bridge to Android native SMS module | ✅ Built |
| `emailParser.ts` | Email parsing (bank alerts via email) | ✅ Built |
| `sync.ts` | Supabase sync logic (last-write-wins) | ✅ Built, extended for v2 tables |
| `amfiNavService.ts` | Auto-fetch NAV from AMFI API for active SIPs | ✅ Built |
| `emiAlertService.ts` | EMI due date alert scheduling | ✅ Built |
| `insightsEngine.ts` | Rule-based local financial insights generation | ✅ Built |
| `oemDetection.ts` | Detects Xiaomi/Samsung for battery whitelist prompt | ✅ Built |
| `recurringBackground.ts` | Background recurring transaction scheduler | ✅ Built |
| `getAppSignature.ts` | Android app signature for SMS retriever | ✅ Built |
| `SMSDebugService.ts` | Debug helper for SMS parsing | ✅ Built |
| `supabaseClient.ts` | Supabase client singleton | ✅ Built |

---

## 8. Screens & Routes — Full Feature Inventory

### Tab Screens (Bottom Navigation)

#### `index.tsx` → `screens/home/home.screen.tsx` — Dashboard
**Implemented:**
- Total balance card (`TotalBalance.tsx`) — uses `useCurrency`
- Financial summary card (income vs expense)
- Financial health score widget (`FinancialHealthScore.tsx`)
- Smart balance forecast chart (`SmartBalanceForecast.tsx`)
- Smart alerts panel (`SmartAlerts.tsx`)
- Receipt scanner shortcut
- SMS import button (`SMSImportButton.tsx`)
- All wrapped in `ErrorBoundary`

---

#### `timeline.tsx` → `screens/transaction/timeline.screen.tsx` — Transaction Timeline
**Implemented:**
- Full transaction list with date grouping and filtering (SQL-based queries)
- Filter chips: type, account, category
- Search tab navigates to `searchTransactions.screen.tsx`
- Pull-to-refresh
- Transaction grouping by date
- Wrapped in `ErrorBoundary`

---

#### `budgets.tsx` → `components/SmartBudgetInterface.tsx` — Budget Tab
**Implemented:**
- Budget list with category-based spending bars
- Budget progress (spent vs limit)
- `BudgetCard.tsx` per budget
- Budget alerts when near/over limit
- Wrapped in `ErrorBoundary`

---

#### `investments.tsx` → `screens/investment/investments.screen.tsx` — Investments Tab
5 sub-tabs: **Overview | SIPs | Holdings | Loans | Alerts**

**Overview tab** (`components/OverviewView.tsx`):
- `usePortfolioSummary` hook — aggregates sips, holdings, loans into one object
- `PortfolioSummaryCard.tsx` — total value, invested, returns %, XIRR
- `AllocationBar.tsx` — asset allocation bar by category (live data)
- `PerformanceBars.tsx` — returns by holding, top 5 performers
- `UpcomingSIPsWidget.tsx` — SIPs due this month with days countdown

**SIPs tab** (`components/SIPsView.tsx`):
- SIP list via `FlashList` from `sipStore`
- Per-SIP hero card: total portfolio value, invested, returns, XIRR
- Asset allocation bar (currently hardcoded percentages — note: could be wired to live data)
- `SIPCard.tsx` — shows fund name, amount, units, NAV, current value, returns %
- `UpdateNAVSheet` — tap on SIP card to update current NAV (bottom sheet)
- Add SIP → `app/(routes)/investment/add-sip.tsx`
- Edit SIP → `app/(routes)/investment/edit-sip.tsx`
- Detail → `app/(routes)/investment/sip/[id].tsx` — allotment history, record allotment
- `RecordAllotmentSheet.tsx` — record SIP monthly allotment (amount, NAV, units)

**Holdings tab** (`components/HoldingsView.tsx`):
- Holdings list grouped by type
- Filter chips: All / Stocks / FD / Gold / Bonds / PPF / NPS
- `HoldingCard.tsx` — name, current value, P&L, P&L %, stale price badge
- Stale price badge: >2 days for stocks, >7 days for MFs (computed at render via `differenceInDays`)
- `UpdatePriceSheet.tsx` — quick price update bottom sheet
- Add Holding → `app/(routes)/investment/add-holding.tsx`
- Edit Holding → `app/(routes)/investment/edit-holding.tsx`
- Detail → `app/(routes)/investment/holding/[id].tsx` — price history, update price

**Loans tab** (`components/LoansView.tsx`):
- `LoanSummaryCard.tsx` — total outstanding, combined monthly EMI, next due date
- Loan cards with `EMICountdown.tsx` chip (red if ≤5 days, green otherwise)
- Repayment progress bar (paid vs remaining)
- Add Loan → `app/(routes)/investment/add-loan.tsx`
- Edit Loan → `app/(routes)/investment/edit-loan.tsx`
- Detail → `app/(routes)/investment/loan/[id].tsx` — payment history, record payment
- `RecordPaymentSheet.tsx` — record EMI/loan payment

**Alerts tab:**
- Shows investment-related alerts (EMI due, SIP confirmation, stale price)
- Driven by `alertStore.ts` and `emiAlertService.ts`

---

#### `settings.tsx` → `screens/settings/settings.screen.tsx` — Settings
**Implemented:**
- Profile section
- Currency settings → `screens/settings/currency.screen.tsx`
- Theme toggle (dark/light)
- Data import: CSV import (`DataImportSection.tsx`) with column mapping
- Data export (`DataExportSection.tsx`)
- Biometric lock (`BiometricSection.tsx`)
- Support screen (`support.screen.tsx`)
- OAuth / Gmail auth (`useGmailAuth.ts`)
- More settings in `more.screen.tsx`

---

### Stack Routes — `app/(routes)/`

#### `transaction/`
| Route | Screen | Feature |
|---|---|---|
| `[id].tsx` | `transaction.details.screen.tsx` | Full transaction detail, edit, delete |
| `transactionForm.tsx` | `transactionForm.screen.tsx` | Add / edit transaction (37KB — complex) |
| `searchTransaction.tsx` | `searchTransactions.screen.tsx` | Search by keyword |
| `visitedHistory/` | `visitedHistory.screen.tsx` | Recently viewed transactions |

#### `budget/`
| Route | Feature |
|---|---|
| `add.tsx` | Add new budget |
| `edit.tsx` | Edit existing budget |
| `[id].tsx` | Budget detail / spending history |

#### `category/`
| Route | Feature |
|---|---|
| `list.tsx` | Category list (all) |
| `add.tsx` | Add new category |
| `edit.tsx` | Edit category |
| `[id].tsx` | Category detail |
| `manage.tsx` | Category management (reorder, merge) |

#### `investment/`
| Route | Feature |
|---|---|
| `add-investment-type.tsx` | Type picker bottom sheet (MF, Stock, FD, etc.) |
| `add-sip.tsx` | Add SIP form |
| `edit-sip.tsx` | Edit SIP form |
| `sip/[id].tsx` | SIP detail + allotment history |
| `add-holding.tsx` | Add holding form (type-specific fields) |
| `edit-holding.tsx` | Edit holding form |
| `holding/[id].tsx` | Holding detail + price history |
| `add-loan.tsx` | Add loan form |
| `edit-loan.tsx` | Edit loan form |
| `loan/[id].tsx` | Loan detail + payment history |

#### `settings/`
| Route | Feature |
|---|---|
| 4 sub-screens | Theme, currency, support, upgrade |

#### `ai/chat.tsx`
- AI chat screen (Gemini integration for financial queries)

#### `account/manage.tsx`
- Account/wallet management

---

## 9. Custom Hooks

| Hook | File | Purpose |
|---|---|---|
| `useTheme` | `hooks/useTheme.ts` | `{ colors, getShadow }` — theme access, always use this |
| `useCurrency` | `hooks/useCurrency.ts` | `{ format }` — currency formatting |
| `usePortfolioSummary` | `hooks/usePortfolioSummary.ts` | Aggregates sips + holdings + loans into one object |
| `useSMSObserver` | `hooks/useSMSObserver.ts` | Listens for new SMS in foreground |
| `useSMSTransactions` | `hooks/useSMSTransactions.ts` | Manages SMS→transaction state |
| `useGmailAuth` | `hooks/useGmailAuth.ts` | OAuth flow for Gmail integration |
| `useColorScheme` | `hooks/useColorScheme.ts` | Light/dark scheme detection |
| `useThemeColor` | `hooks/useThemeColor.ts` | Low-level theme color utility |

---

## 10. `usePortfolioSummary` Hook

**File:** `hooks/usePortfolioSummary.ts`
This is the single aggregation point for the Overview tab. It reads from all investment stores and returns:

```typescript
{
  totalValue: number;           // sip.currentValue + holding.currentValue
  totalInvested: number;        // sip.investedAmount + holding.investedAmount
  totalReturns: number;         // totalValue - totalInvested
  returnsPercent: number;       // (totalReturns / totalInvested) * 100
  assetAllocation: Array<{      // live data by type
    label: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  upcomingSIPs: SIPPlan[];      // SIPs due this calendar month
}
```

---

## 11. What Is Implemented vs What Is Still Pending

### ✅ Fully Implemented (Investment Module v2)

| Feature | Location |
|---|---|
| Holdings SQLite table + CRUD | `db/repository/holdingsRepository.ts` |
| Investment transactions table | `db/repository/investmentTxRepository.ts` |
| Price snapshots table | `db/repository/priceSnapshotRepository.ts` |
| Extended SIPs table (v2 columns) | `db/repository/sipRepository.ts` |
| `holdingsStore.ts` | Full CRUD + fetch |
| `investmentTxStore.ts` | Indexed by holdingId |
| `amfiNavService.ts` | Auto NAV fetch from AMFI API |
| Investment calculations | `utils/investmentCalculations.ts` |
| `usePortfolioSummary` hook | `hooks/usePortfolioSummary.ts` |
| Overview tab wired to live data | `PortfolioSummaryCard`, `AllocationBar` |
| SIP detail screen + allotment recording | `app/(routes)/investment/sip/[id].tsx` |
| Loan detail screen + payment recording | `app/(routes)/investment/loan/[id].tsx` |
| Holding detail screen + price update | `app/(routes)/investment/holding/[id].tsx` |
| Edit SIP/Loan/Holding forms | All `edit-*.tsx` routes |
| `RecordAllotmentSheet` | Working bottom sheet |
| `RecordPaymentSheet` | Working bottom sheet |
| `EMICountdown` chip | Live colour logic |
| `PerformanceBars` | Top 5 returns chart |
| `UpcomingSIPsWidget` | This-month SIPs |
| Error Boundaries on all tabs | `components/ErrorBoundary.tsx` |
| Sync extended for v2 tables | `services/sync.ts` |

### ⚠️ Partially Implemented / Known Issues

| Issue | File | Detail |
|---|---|---|
| SIPsView allocation bar | `SIPsView.tsx` L87-94 | Hardcoded percentages (58%/28%/14%) — should use `usePortfolioSummary` |
| TypeScript errors remain | `ts_errors_final.log` | ~136 lines of errors in charts, camera, settings, email parser — not investment-related |
| `support.screen.tsx` | `screens/settings/support.screen.tsx` | References undefined `isDarkMode`, `themeColor`, `darkThemeColor` variables |
| `EmailImportScreen.tsx` | `screens/auth/EmailImportScreen.tsx` | References missing style keys and `Transaction.title` property |
| `camera.screen.tsx` | `screens/transaction/camera.screen.tsx` | Camera API type errors, needs Expo Camera v2 migration |
| SMS BroadcastReceiver | Android native | Unstable on Xiaomi/Samsung (battery killer) — `oemDetection.ts` handles prompt |

### ❌ Not Yet Implemented (PRD Priorities)

| Feature | Priority | Notes |
|---|---|---|
| SMS deduplication bug fix | P0 (PRD 5.1) | Mark as processed only after successful extraction |
| Multiline SMS normalisation | P0 (PRD 5.1) | Some HDFC UPI SMS spans multiple lines |
| Sender-map registry (8 banks) | P1 (PRD 5.1) | Bank-specific regex patterns instead of generic |
| OEM battery prompt validation | P1 (PRD 5.1) | Works on stock Android, needs validation on Xiaomi |
| Bulk "Update all prices" | P1 (design spec) | Power-user feature on Overview tab |
| Import from CAMS/Karvy | P2 | Complex, not in scope for v1 |
| XIRR per holding (Holdings tab) | P2 | Needs full transaction history — infrastructure exists |
| Value-over-time sparkline charts | P2 | Needs price_snapshots data to accumulate first |
| AI rate limiting (20/day) | P2 (PRD 5.4) | Gemini calls not rate limited yet |
| AI response caching | P2 (PRD 5.4) | No caching for identical questions yet |
| Google Vision OCR | P3 | Replace Tesseract.js with Cloud Vision free tier |

---

## 12. Supabase Configuration

- **Project:** Shared with PersonalFinance web app
- **Auth:** Supabase Auth with RLS on every table — users only see their own data
- **Client location:** `services/supabaseClient.ts`
- **Env vars** (in `.env`):
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Free tier limits:** 500MB DB, 5GB bandwidth/month — always batch sync, never row-by-row
- **⚠️ CRITICAL:** Supabase free tier **pauses after 7 days of inactivity**. The PersonalFinance web app has a keep-alive cron job.

---

## 13. Running the App

```bash
# Install (first time or after package changes)
npm install

# Start dev server (requires Android device/emulator)
npx expo start --dev-client
npm run android   # Build and run on connected Android device

# Build (EAS)
npx eas build --platform android --profile preview

# Type check
npx tsc --noEmit | Out-File -Encoding utf8 ts_errors_final.log

# Clear metro cache if things act up
npx expo start --clear
```

**Note:** `npx expo run:android` takes 1+ hour on cold build — use `npm run android` for faster rebuilds.

---

## 14. Commonly Edited Files

| File | Why |
|---|---|
| `services/smsParser.ts` | Add new bank SMS patterns (39KB — read carefully before editing) |
| `services/smsCategorizationService.ts` | Change category mapping rules |
| `stores/transactionStore.ts` | Any transaction data changes |
| `screens/transaction/timeline.screen.tsx` | Transaction list UI |
| `screens/transaction/transactionForm.screen.tsx` | Add/edit transaction form (37KB) |
| `screens/home/home.screen.tsx` | Dashboard screen |
| `services/sync.ts` | Supabase sync logic (20KB) |
| `db/repository/transactionRepository.ts` | SQLite query changes |
| `hooks/usePortfolioSummary.ts` | Portfolio aggregation logic |
| `screens/investment/investments.screen.tsx` | Investment tab structure |

---

## 15. Known Issues & Constraints

- **OEM SMS receivers:** BroadcastReceiver is unstable on Xiaomi/Samsung (battery killer). `oemDetection.ts` handles the battery optimisation prompt.
- **Tesseract.js OCR is slow:** 5–15 seconds on mid-range phones. Acceptable for now; Google Vision API is the planned upgrade.
- **iOS:** Not supported. SMS reading is impossible on iOS. Do NOT add iOS-specific code.
- **TypeScript strict mode is not fully enforced** — there are ~136 lines of TS errors in `ts_errors_final.log`, mostly in older screens (charts, camera, settings, email parser). Investment module and core transaction stores are clean.
- **`colors.textMuted` does NOT exist** — the correct key is `colors.subtitle`.
- **`@/theme/ThemeProvider` does NOT exist** — import `useTheme` from `@/hooks/useTheme` instead.
- **`@/components/ui/Button` is NOT the right import** — use `import { Button } from '@/components/common/Button'`. The common `Button` uses `children`, not a `title` prop.
- **Scratch log files** (`ts_errors.log`, `ts_errors_2.log`, `ts_errors_final.log`, `tsc_output.txt`, etc.) — ignore these.

---

## 16. Not In Scope (Do Not Build)

- iOS SMS reading
- Real-time live stock price feeds (paid API)
- Bank account linking (Plaid-style)
- Tax filing / ITR integration
- Social / split bill features
- Account Aggregator (requires RBI FIU registration)
- Monetisation infrastructure
- Redis / BullMQ (web app only, not mobile)

---

## 17. Related Project

The **PersonalFinance** web app (`d:\Programing\PersonalFinance`) is the companion.
It includes: AI chat (Gemini), SIP/stocks tracking, CSV/PDF import, Gmail integration, subscriptions, goals management.
Both apps share the same Supabase project.
See `prd.md` in this repo for the full shared product requirements document.
