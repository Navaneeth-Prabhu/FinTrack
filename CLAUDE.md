# FinTrack — AI Assistant Context

> **What this file is:** A reference for any AI assistant working on this codebase. Read this before touching anything.

---

## 1. Project Overview

**FinTrack** is an Android-first personal finance mobile app (Expo / React Native).  
Its companion web app is **PersonalFinance** (`d:\Programing\PersonalFinance`), built with Next.js.  
Both share a **single Supabase backend** (postgres + auth + storage).

**Core promise:** "Open the app. Your money is already tracked." — transactions are imported automatically from SMS, with zero manual setup.

- **Target users:** ~10 people (salaried, students, freelancers) — heavy Indian UPI users on Android
- **Platform:** Android only (SMS reading is impossible on iOS)
- **App version:** 1.0.0 (active development)

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Expo ~52 + React Native 0.76 | `expo-router` for file-based navigation |
| Language | TypeScript | Strict-ish, see `tsconfig.json` |
| Local DB | `expo-sqlite` ~15 | Offline-first, primary data store |
| State | Zustand ~5 | Stores live in `stores/` |
| Cloud sync | Supabase | Auth + postgres sync; free tier — be careful with bandwidth |
| Charts | `react-native-gifted-charts`, `victory-native` | Both used in different screens |
| Icons | `lucide-react-native`, `@expo/vector-icons` | Prefer lucide for new components |
| Fonts | `@expo-google-fonts/urbanist` | Single consistent typeface |
| UI primitives | `@gorhom/bottom-sheet` | Modal-style sheets |
| Animations | `react-native-reanimated` ~3 | Used for transitions and gestures |
| OCR | `tesseract.js` | Receipt scanning — runs on-device, slow on mid-range phones |
| Auth | Supabase Auth + `expo-auth-session` | Google OAuth supported |
| Background tasks | `expo-task-manager` + `expo-background-fetch` | SMS polling background job |

---

## 3. Folder Structure

```
fintrack/
├── app/                    # Expo Router file-based routes
│   ├── (auth)/             # Login, signup screens
│   ├── (onboarding)/       # First-run flow
│   ├── (tabs)/             # Bottom tab navigator
│   │   ├── index.tsx       # Dashboard (home)
│   │   ├── timeline.tsx    # Transaction list
│   │   ├── budgets.tsx     # Budget overview
│   │   ├── investments.tsx # Investments (SIPs, loans)
│   │   └── settings.tsx    # App settings
│   └── (routes)/           # Stack screens (pushed on top of tabs)
│       ├── transaction/    # Add/edit/detail transaction
│       ├── budget/         # Add/edit budget
│       ├── category/       # Category management
│       ├── investment/     # SIP & loan detail screens
│       ├── account/        # Account profile
│       ├── settings/       # Settings sub-screens
│       └── ai/             # AI chat screen
├── components/             # Reusable UI components (~50 files)
├── stores/                 # Zustand state stores
│   ├── transactionStore.ts # PRIMARY store — all transactions
│   ├── budgetStore.ts      # Budget state + alerts
│   ├── categoryStore.ts    # Category list + CRUD
│   ├── sipStore.ts         # SIP investments
│   ├── loanStore.ts        # Loan / EMI tracking
│   ├── preferenceStore.ts  # User preferences (currency, theme, etc.)
│   ├── syncStore.ts        # Sync state tracking
│   ├── supabaseAuthStore.ts# Auth state (user session)
│   └── metricsStore.ts     # Computed financial metrics
├── db/
│   ├── repository/         # SQLite CRUD functions (one file per entity)
│   └── services/           # DB service layer
├── services/               # Business logic services
│   ├── smsParser.ts        # MAIN SMS parser (35KB — complex, read carefully)
│   ├── smsCategorizationService.ts # Maps parsed SMS to categories
│   ├── smsAlertParser.ts   # Parser for alert-type SMS (LIC, SIP confirmations)
│   ├── smsInitService.ts   # First-run SMS import orchestrator
│   ├── smsHeadlessTask.ts  # Android HeadlessJS task for real-time SMS
│   ├── nativeSmsModule.ts  # Bridge to Android native SMS module
│   ├── emailParser.ts      # Email parsing (bank alerts via email)
│   ├── sync.ts             # Supabase sync logic (conflict = last-write-wins)
│   ├── oemDetection.ts     # Detects Xiaomi/Samsung for battery prompt
│   └── recurringBackground.ts # Background job scheduler
├── hooks/                  # Custom React hooks
├── constants/              # App-wide constants (colors, sizes, etc.)
├── utils/                  # Utility functions
├── types/                  # TypeScript type definitions
├── assets/                 # Images, fonts, icons
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
- `transactionStore.ts` is the most important store — it powers the dashboard, timeline, and chart data.

### Data Flow (typical transaction creation)
```
User input / SMS parsed
  → Write to SQLite via repository (db/repository/)
  → Update Zustand store
  → UI re-renders
  → Background: sync.ts pushes diff to Supabase
```

### SMS Pipeline
1. `nativeSmsModule.ts` — reads raw SMS from Android content provider
2. `smsParser.ts` — regex-based extraction (amount, merchant, date, type)
3. `smsCategorizationService.ts` — maps to category
4. `db/repository/transactionRepository.ts` — persists result
5. `transactionStore.ts` — updates in-memory state

**Critical SMS rules:**
- Mark SMS as processed **only after successful extraction**, never before
- Raw SMS bodies are **stored locally only** — never sync raw SMS to Supabase (privacy)
- The `sms_id` field is used for deduplication

### Sync Architecture
- Sync scope: transactions, categories, budgets, goals — **not raw SMS data**
- Conflict resolution: **last-write-wins** (using `updated_at` timestamp)
- Every synced record has: `id (uuid)`, `user_id`, `updated_at`, `device_id`, `is_deleted` (soft delete)
- Sync triggers: app foreground, wifi connect, manual pull-to-refresh

---

## 5. Database Schema (Local SQLite)

Key tables mirrored locally (full schema in `db/repository/`):

- **transactions** — `id, user_id, amount, type (income/expense/transfer), category_id, merchant, date, source (sms/email/manual/csv/ocr), sms_id, raw_sms, notes, is_deleted, device_id, updated_at`
- **categories** — `id, user_id, name, icon, colour, is_default, updated_at`
- **budgets** — `id, user_id, category_id, amount, period (monthly/weekly/yearly), updated_at`
- **sips** — `id, user_id, fund_name, folio_number, amount, frequency, next_date, status (active/paused/cancelled), updated_at`
- **loans** — `id, user_id, lender, loan_type, principal, outstanding, emi_amount, emi_due_day, tenure_months, start_date, updated_at`
- **goals** — `id, user_id, name, target_amount, current_amount, target_date, updated_at`

---

## 6. Supabase Configuration

- **Project:** Shared with PersonalFinance web app
- **Auth:** Supabase Auth with RLS on every table — users only see their own data
- **Client location:** `services/supabaseClient.ts`
- **Env vars** (in `.env`):
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Free tier limits:** 500MB DB, 5GB bandwidth/month — batch sync, never row-by-row
- **⚠️ Important:** Project pauses after 7 days of inactivity — the web app has a keep-alive cron

---

## 7. Running the App

```bash
# Install (first time or after package changes)
npm install

# Start dev server (requires Android device/emulator)
npm start          # or: expo start --dev-client
npm run android    # Build and run on connected Android device

# Clear cache if metro acts up
npx expo start --clear
```

**Build system:** EAS Build (`eas.json`) for production APK/AAB.

---

## 8. Commonly Edited Files

| File | Why |
|---|---|
| `services/smsParser.ts` | Add new bank SMS patterns |
| `services/smsCategorizationService.ts` | Change category mapping rules |
| `stores/transactionStore.ts` | Any transaction data changes |
| `components/TransactionList.tsx` | Timeline/list UI changes |
| `app/(tabs)/index.tsx` | Dashboard screen |
| `services/sync.ts` | Supabase sync logic |
| `db/repository/transactionRepository.ts` | SQLite query changes |

---

## 9. Known Issues & Constraints

- **OEM SMS receivers:** BroadcastReceiver is unstable on Xiaomi/Samsung (battery killer). `oemDetection.ts` handles the prompt.
- **Tesseract.js OCR is slow:** 5–15 seconds on mid-range phones. Acceptable for now; Google Vision API is the planned upgrade.
- **iOS:** Not supported. SMS reading is impossible on iOS. Don't add iOS-specific code.
- **Redis/BullMQ:** Used in the web app but NOT in this mobile app. Don't introduce server-side job queues here.
- **`tsc_output_transfer.txt` / `typescript-errors.txt`:** Scratch files from debugging — ignore them.

---

## 10. Not In Scope (Do Not Build)

- iOS SMS reading
- Real-time stock price feeds
- Bank account linking (Plaid-style)
- Tax filing / ITR integration
- Social / split bill features
- Monetisation infrastructure

---

## 11. Related Project

The **PersonalFinance** web app (`d:\Programing\PersonalFinance`) is the companion.  
See `prd.md` in this repo for the full shared product requirements document.  
Both apps share the same Supabase project.
