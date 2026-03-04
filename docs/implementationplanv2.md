# FinTrack — Investment Module v2 Implementation Plan

> **Document type:** AI-agent implementation guide  
> **Platform:** Expo 52 / React Native 0.76 / expo-sqlite / Zustand  
> **Status:** Post v1 → v2 plan  
> **Estimated build time:** 8–12 days  
> **Last updated:** March 2026

---

## How to Use This Document

This document is structured for AI agents and developers to execute sequentially. Each section has a clear input, output, and test gate. **Never move to the next section until the current section's test gate passes.**

---

## Table of Contents

1. [Baseline — What v1 Has vs What's Missing](#1-baseline)
2. [Database Schema Additions](#2-database-schema)
3. [Repository Layer + Test Gates](#3-repository-layer)
4. [Zustand Stores](#4-zustand-stores)
5. [Calculation Utilities](#5-calculation-utilities)
6. [CRUD Operations — Edit, Delete, Record](#6-crud-operations)
7. [New Screens](#7-new-screens)
8. [Online Automation](#8-online-automation)
9. [Error Boundaries](#9-error-boundaries)
10. [Sync Extension](#10-sync-extension)
11. [Build Order](#11-build-order)
12. [File Manifest](#12-file-manifest)
13. [Expandability Assessment](#13-expandability-assessment)

---

## 1. Baseline

### What v1 Shipped ✅

| Screen / Feature | Status | Notes |
|---|---|---|
| Investments tab structure | ✅ Done | Overview, SIPs, Holdings, Loans, Alerts tabs exist |
| SIP list display | ✅ Done | Shows fund name, installment, invested |
| Loan list display | ✅ Done | Shows lender, EMI, outstanding |
| Holdings list display | ✅ Done | Stocks, FD, Gold cards render |
| Portfolio summary card | ✅ Done | Total value, returns placeholders |
| Allocation bar | ✅ Done | Visual breakdown by asset type |
| Add SIP form | ✅ Done | Basic fields saved to SQLite |
| Add Loan form | ✅ Done | Basic fields saved to SQLite |
| loanStore + loanRepository | ✅ Done | Zustand + SQLite pattern in place |
| sipStore + sipRepository | ✅ Done | Zustand + SQLite pattern in place |

### What v1 is Missing ❌

| Gap | Impact | Priority |
|---|---|---|
| No edit/delete for SIPs | Users can't fix mistakes | P0 |
| No edit/delete for Loans | Users can't update outstanding balance | P0 |
| No edit/delete for Holdings | Users can't correct stock prices | P0 |
| No loan payment recording | Can't track EMI payments made | P0 |
| NAV not computed from units | Returns show as 0 or wrong | P0 |
| No transaction history per holding | Can't track buy/sell/allotment events | P1 |
| No price snapshot history | Charts forever impossible without it | P1 |
| No SIP allotment recording | Can't track units received per SIP | P1 |
| No data staleness indicator | Users don't know prices are old | P1 |
| No AMFI NAV auto-fetch | Manual NAV entry only | P2 |
| No SMS auto-import for investments | Zero automation | P2 |
| No error boundaries on investment tabs | One crash kills whole screen | P1 |

> **P0** = must fix before shipping to any user  
> **P1** = needed for meaningful portfolio tracking  
> **P2** = automation layer, high value but not blocking  

---

## 2. Database Schema

> **Rule:** All schema changes follow FinTrack's existing migration pattern — bump schema version, run ALTER TABLE / CREATE TABLE in the migration handler, then immediately patch any NULL values.

### 2.1 Extend Existing `sips` Table

```sql
-- Add to migration handler in db/repository/sipRepository.ts
ALTER TABLE sips ADD COLUMN total_units     REAL DEFAULT 0;
ALTER TABLE sips ADD COLUMN current_nav     REAL DEFAULT 0;
ALTER TABLE sips ADD COLUMN invested_amount REAL DEFAULT 0;
ALTER TABLE sips ADD COLUMN current_value   REAL DEFAULT 0;
ALTER TABLE sips ADD COLUMN nav_updated_at  TEXT;
ALTER TABLE sips ADD COLUMN scheme_code     TEXT; -- AMFI scheme code for auto NAV fetch

-- CRITICAL: Patch existing records immediately after migration.
-- Never leave NULLs — they cause NaN in JS computations.
UPDATE sips
SET    invested_amount = COALESCE(amount, 0),
       total_units     = 0,
       current_nav     = 0,
       current_value   = 0
WHERE  invested_amount IS NULL;
```

### 2.2 New Table: `investment_transactions`

This is the **most important new table in v2**. Every SIP allotment, loan payment, stock buy/sell, and price update is recorded as an immutable event row. This is what enables XIRR computation, tax calculation, payment history, and future charts — without it none of those features are possible.

```sql
CREATE TABLE IF NOT EXISTS investment_transactions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  holding_id      TEXT NOT NULL,    -- FK to sips.id / holdings.id / loans.id
  holding_type    TEXT NOT NULL,    -- 'sip' | 'holding' | 'loan'
  event_type      TEXT NOT NULL,    -- see event types below
  amount          REAL NOT NULL,    -- rupee amount
  units           REAL,             -- units allotted (SIP/MF only)
  nav             REAL,             -- NAV at time of event (MF only)
  price           REAL,             -- price per share (stock only)
  quantity        REAL,             -- shares bought/sold (stock only)
  balance_after   REAL,             -- outstanding after event (loan only)
  notes           TEXT,
  event_date      TEXT NOT NULL,    -- ISO date string
  source          TEXT DEFAULT 'manual',  -- 'manual' | 'sms' | 'api'
  sms_id          TEXT,             -- dedup key if SMS-imported
  is_deleted      INTEGER DEFAULT 0,
  updated_at      TEXT NOT NULL
);

-- Index for fast lookup by holding (used on detail screens)
CREATE INDEX IF NOT EXISTS idx_inv_tx_holding
  ON investment_transactions(holding_id, event_date DESC);

-- Index for SMS deduplication
CREATE INDEX IF NOT EXISTS idx_inv_tx_sms
  ON investment_transactions(sms_id)
  WHERE sms_id IS NOT NULL;
```

**Event types by holding_type:**

| holding_type | valid event_type values |
|---|---|
| `sip` | `sip_allotment`, `sip_pause`, `sip_resume`, `sip_cancel`, `dividend` |
| `holding` | `buy`, `sell`, `price_update`, `dividend`, `split` |
| `loan` | `emi_payment`, `prepayment`, `partial_payment` |

### 2.3 New Table: `price_snapshots`

Every price update (manual or automated) writes a row here. Enables sparklines and charts later without any schema migration.

```sql
CREATE TABLE IF NOT EXISTS price_snapshots (
  id          TEXT PRIMARY KEY,
  holding_id  TEXT NOT NULL,
  price       REAL NOT NULL,
  recorded_at TEXT NOT NULL,
  source      TEXT DEFAULT 'manual'  -- 'manual' | 'amfi' | 'sms'
);

CREATE INDEX IF NOT EXISTS idx_snapshots_holding
  ON price_snapshots(holding_id, recorded_at DESC);
```

### 2.4 New Table: `holdings`

One unified table for all non-SIP investments. Type-specific fields stored in a `metadata` JSON column — avoids nullable columns per asset type while keeping the schema clean.

```sql
CREATE TABLE IF NOT EXISTS holdings (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  type             TEXT NOT NULL,  -- 'stock'|'fd'|'bond'|'gold'|'ppf'|'nps'|'other'
  name             TEXT NOT NULL,
  -- identity / dedup keys
  ticker           TEXT,            -- stock: 'INFY', 'RELIANCE'
  folio_number     TEXT,            -- MF folio
  account_number   TEXT,            -- FD / bond account number
  -- value fields (updated on each price_update event)
  quantity         REAL DEFAULT 0,
  avg_buy_price    REAL DEFAULT 0,
  current_price    REAL DEFAULT 0,
  invested_amount  REAL DEFAULT 0,  -- quantity * avg_buy_price
  current_value    REAL DEFAULT 0,  -- quantity * current_price
  -- type-specific extras as JSON blob
  -- stock:  {"exchange":"NSE","isin":"INE009A01021"}
  -- fd:     {"bank":"HDFC","interest_rate":7.1,"compounding":4,"maturity_date":"2026-08-01","maturity_value":55800}
  -- gold:   {"gold_type":"SGB","quantity_grams":5}
  metadata         TEXT DEFAULT '{}',
  -- automation tracking
  source           TEXT DEFAULT 'manual',  -- 'manual'|'sms'|'api'
  price_updated_at TEXT,
  is_deleted       INTEGER DEFAULT 0,
  updated_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_holdings_user
  ON holdings(user_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_holdings_ticker
  ON holdings(ticker)
  WHERE ticker IS NOT NULL;
```

---

## 3. Repository Layer

> **Critical rule:** Build and test every repository function **before** writing any screen or store that depends on it. Test with actual SQLite rows — not mocks, not hardcoded UI data.

### 3.1 `investmentTxRepository.ts`

**File:** `db/repository/investmentTxRepository.ts`

```typescript
import * as SQLite from 'expo-sqlite';
import { uuid } from 'uuid';

const db = SQLite.openDatabaseSync('fintrack.db');

export interface InvestmentTransaction {
  id: string;
  user_id: string;
  holding_id: string;
  holding_type: 'sip' | 'holding' | 'loan';
  event_type: string;
  amount: number;
  units?: number;
  nav?: number;
  price?: number;
  quantity?: number;
  balance_after?: number;
  notes?: string;
  event_date: string;
  source: 'manual' | 'sms' | 'api';
  sms_id?: string;
  is_deleted: number;
  updated_at: string;
}

export const investmentTxRepository = {

  insert: async (tx: Omit): Promise => {
    const now = new Date().toISOString();
    const id = uuid();
    await db.runAsync(
      `INSERT INTO investment_transactions
        (id, user_id, holding_id, holding_type, event_type, amount, units, nav,
         price, quantity, balance_after, notes, event_date, source, sms_id, is_deleted, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)`,
      [id, tx.user_id, tx.holding_id, tx.holding_type, tx.event_type,
       tx.amount, tx.units ?? null, tx.nav ?? null, tx.price ?? null,
       tx.quantity ?? null, tx.balance_after ?? null, tx.notes ?? null,
       tx.event_date, tx.source, tx.sms_id ?? null, now]
    );
    return { ...tx, id, is_deleted: 0, updated_at: now };
  },

  getByHoldingId: async (holdingId: string): Promise => {
    return await db.getAllAsync(
      `SELECT * FROM investment_transactions
       WHERE holding_id = ? AND is_deleted = 0
       ORDER BY event_date DESC`,
      [holdingId]
    ) as InvestmentTransaction[];
  },

  getByHoldingIdAndType: async (holdingId: string, eventType: string): Promise => {
    return await db.getAllAsync(
      `SELECT * FROM investment_transactions
       WHERE holding_id = ? AND event_type = ? AND is_deleted = 0
       ORDER BY event_date DESC`,
      [holdingId, eventType]
    ) as InvestmentTransaction[];
  },

  softDelete: async (id: string): Promise => {
    await db.runAsync(
      `UPDATE investment_transactions SET is_deleted = 1, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
  },

  softDeleteByHoldingId: async (holdingId: string): Promise => {
    await db.runAsync(
      `UPDATE investment_transactions SET is_deleted = 1, updated_at = ?
       WHERE holding_id = ?`,
      [new Date().toISOString(), holdingId]
    );
  },

  existsBySmsId: async (smsId: string): Promise => {
    const row = await db.getFirstAsync(
      `SELECT id FROM investment_transactions WHERE sms_id = ? LIMIT 1`,
      [smsId]
    );
    return row !== null;
  },

};
```

### ✅ Test Gate 3.1 — investmentTxRepository

Run these tests manually (in a `__tests__/` file or temporarily in a screen's useEffect) before building any store or screen that depends on this repository.

```typescript
// TEST FILE: __tests__/investmentTxRepository.test.ts
// Run with: jest investmentTxRepository

import { investmentTxRepository } from '../db/repository/investmentTxRepository';

describe('investmentTxRepository', () => {

  const TEST_HOLDING_ID = 'test-sip-001';
  const TEST_USER_ID = 'test-user-001';

  // ── Test 1: Insert ──────────────────────────────────────────────
  it('inserts a sip_allotment event and returns it with id', async () => {
    const result = await investmentTxRepository.insert({
      user_id: TEST_USER_ID,
      holding_id: TEST_HOLDING_ID,
      holding_type: 'sip',
      event_type: 'sip_allotment',
      amount: 999,
      units: 11.84,
      nav: 84.37,
      event_date: '2026-03-01',
      source: 'manual',
    });

    expect(result.id).toBeDefined();          // must have an id
    expect(result.units).toBe(11.84);         // units must be preserved
    expect(result.is_deleted).toBe(0);        // must not be deleted
    expect(result.updated_at).toBeDefined();  // timestamp must be set
  });

  // ── Test 2: Read back ───────────────────────────────────────────
  it('reads back inserted rows for a holding_id', async () => {
    // Insert two events
    await investmentTxRepository.insert({
      user_id: TEST_USER_ID, holding_id: TEST_HOLDING_ID,
      holding_type: 'sip', event_type: 'sip_allotment',
      amount: 999, units: 11.84, nav: 84.37,
      event_date: '2026-02-01', source: 'manual',
    });

    const rows = await investmentTxRepository.getByHoldingId(TEST_HOLDING_ID);

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].holding_id).toBe(TEST_HOLDING_ID);
    expect(rows[0].event_type).toBe('sip_allotment');
    // Must be ordered by event_date DESC
    if (rows.length > 1) {
      expect(rows[0].event_date >= rows[1].event_date).toBe(true);
    }
  });

  // ── Test 3: Soft delete ─────────────────────────────────────────
  it('soft deletes a row and hides it from getByHoldingId', async () => {
    const inserted = await investmentTxRepository.insert({
      user_id: TEST_USER_ID, holding_id: 'delete-test-holding',
      holding_type: 'loan', event_type: 'emi_payment',
      amount: 35000, balance_after: 2685000,
      event_date: '2026-03-01', source: 'manual',
    });

    await investmentTxRepository.softDelete(inserted.id);

    const rows = await investmentTxRepository.getByHoldingId('delete-test-holding');
    const found = rows.find(r => r.id === inserted.id);

    expect(found).toBeUndefined(); // soft deleted rows must NOT appear in results
  });

  // ── Test 4: SMS deduplication ───────────────────────────────────
  it('correctly reports existence of sms_id for dedup', async () => {
    const SMS_ID = 'sms-test-12345';

    await investmentTxRepository.insert({
      user_id: TEST_USER_ID, holding_id: TEST_HOLDING_ID,
      holding_type: 'sip', event_type: 'sip_allotment',
      amount: 999, units: 11.84, nav: 84.37,
      event_date: '2026-03-05', source: 'sms', sms_id: SMS_ID,
    });

    const exists = await investmentTxRepository.existsBySmsId(SMS_ID);
    expect(exists).toBe(true);  // must detect duplicate

    const notExists = await investmentTxRepository.existsBySmsId('non-existent-sms');
    expect(notExists).toBe(false);
  });

  // ── Test 5: NULL fields don't cause errors ──────────────────────
  it('inserts without optional fields and reads back without errors', async () => {
    // Loan payment — no units, nav, price, quantity fields
    const result = await investmentTxRepository.insert({
      user_id: TEST_USER_ID,
      holding_id: 'loan-001',
      holding_type: 'loan',
      event_type: 'emi_payment',
      amount: 35000,
      balance_after: 2685000,
      event_date: '2026-03-01',
      source: 'manual',
      // units, nav, price, quantity are intentionally omitted
    });

    expect(result.units).toBeUndefined();   // optional fields must be undefined, not crash
    expect(result.amount).toBe(35000);      // required fields must be correct
  });

  // ── Test 6: Cascade soft delete by holdingId ───────────────────
  it('soft deletes all events for a holding when holding is deleted', async () => {
    const HOLDING = 'cascade-test-holding';
    await investmentTxRepository.insert({
      user_id: TEST_USER_ID, holding_id: HOLDING,
      holding_type: 'sip', event_type: 'sip_allotment',
      amount: 999, event_date: '2026-01-01', source: 'manual',
    });
    await investmentTxRepository.insert({
      user_id: TEST_USER_ID, holding_id: HOLDING,
      holding_type: 'sip', event_type: 'sip_allotment',
      amount: 999, event_date: '2026-02-01', source: 'manual',
    });

    await investmentTxRepository.softDeleteByHoldingId(HOLDING);

    const rows = await investmentTxRepository.getByHoldingId(HOLDING);
    expect(rows.length).toBe(0);  // ALL events for this holding must be hidden
  });

});
```

**What to verify manually in SQLite file after running tests:**
- Open the SQLite db file in a viewer (e.g. DB Browser for SQLite)
- Confirm `investment_transactions` table exists with correct columns
- Confirm soft-deleted rows have `is_deleted = 1` (they exist in DB, just hidden from queries)
- Confirm `updated_at` is populated on all rows
- Confirm NULL optional fields are stored as NULL (not 0 or empty string)

---

### 3.2 `holdingsRepository.ts`

**File:** `db/repository/holdingsRepository.ts`

```typescript
export interface Holding {
  id: string;
  user_id: string;
  type: 'stock' | 'fd' | 'bond' | 'gold' | 'ppf' | 'nps' | 'other';
  name: string;
  ticker?: string;
  folio_number?: string;
  account_number?: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  invested_amount: number;
  current_value: number;
  metadata: string;  // JSON string
  source: 'manual' | 'sms' | 'api';
  price_updated_at?: string;
  is_deleted: number;
  updated_at: string;
}

export const holdingsRepository = {

  insert: async (h: Omit): Promise => {
    const id = uuid();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO holdings
        (id, user_id, type, name, ticker, folio_number, account_number,
         quantity, avg_buy_price, current_price, invested_amount, current_value,
         metadata, source, price_updated_at, is_deleted, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)`,
      [id, h.user_id, h.type, h.name, h.ticker ?? null, h.folio_number ?? null,
       h.account_number ?? null, h.quantity, h.avg_buy_price, h.current_price,
       h.invested_amount, h.current_value, h.metadata ?? '{}',
       h.source, h.price_updated_at ?? null, now]
    );
    return { ...h, id, is_deleted: 0, updated_at: now };
  },

  getAll: async (userId: string): Promise => {
    return await db.getAllAsync(
      `SELECT * FROM holdings WHERE user_id = ? AND is_deleted = 0 ORDER BY name ASC`,
      [userId]
    ) as Holding[];
  },

  getByType: async (userId: string, type: string): Promise => {
    return await db.getAllAsync(
      `SELECT * FROM holdings WHERE user_id = ? AND type = ? AND is_deleted = 0`,
      [userId, type]
    ) as Holding[];
  },

  update: async (id: string, changes: Partial): Promise => {
    const now = new Date().toISOString();
    const fields = Object.keys(changes).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(changes), now, id];
    await db.runAsync(
      `UPDATE holdings SET ${fields}, updated_at = ? WHERE id = ?`,
      values
    );
  },

  updatePrice: async (id: string, newPrice: number, timestamp: string): Promise => {
    await db.runAsync(
      `UPDATE holdings
       SET current_price = ?,
           current_value = quantity * ?,
           price_updated_at = ?,
           updated_at = ?
       WHERE id = ?`,
      [newPrice, newPrice, timestamp, timestamp, id]
    );
  },

  softDelete: async (id: string): Promise => {
    await db.runAsync(
      `UPDATE holdings SET is_deleted = 1, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
  },

  getByTicker: async (ticker: string, userId: string): Promise => {
    return await db.getFirstAsync(
      `SELECT * FROM holdings WHERE ticker = ? AND user_id = ? AND is_deleted = 0`,
      [ticker, userId]
    ) as Holding | null;
  },

};
```

### ✅ Test Gate 3.2 — holdingsRepository

```typescript
// __tests__/holdingsRepository.test.ts

import { holdingsRepository } from '../db/repository/holdingsRepository';

describe('holdingsRepository', () => {

  const TEST_USER = 'test-user-001';

  // ── Test 1: Insert stock ────────────────────────────────────────
  it('inserts a stock holding and reads it back', async () => {
    const holding = await holdingsRepository.insert({
      user_id: TEST_USER,
      type: 'stock',
      name: 'Infosys Ltd',
      ticker: 'INFY',
      quantity: 10,
      avg_buy_price: 1895,
      current_price: 1845,
      invested_amount: 18950,   // 10 * 1895
      current_value: 18450,     // 10 * 1845
      metadata: JSON.stringify({ exchange: 'NSE', isin: 'INE009A01021' }),
      source: 'manual',
    });

    expect(holding.id).toBeDefined();
    expect(holding.ticker).toBe('INFY');
    expect(holding.invested_amount).toBe(18950);

    const all = await holdingsRepository.getAll(TEST_USER);
    const found = all.find(h => h.id === holding.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Infosys Ltd');
  });

  // ── Test 2: Insert FD with metadata ────────────────────────────
  it('inserts an FD with metadata JSON and reads it back correctly', async () => {
    const fdMeta = {
      bank: 'HDFC Bank',
      interest_rate: 7.1,
      compounding: 4,
      maturity_date: '2026-08-01',
      maturity_value: 55800,
    };

    const holding = await holdingsRepository.insert({
      user_id: TEST_USER,
      type: 'fd',
      name: 'HDFC Bank FD',
      quantity: 1,
      avg_buy_price: 50000,
      current_price: 50000,
      invested_amount: 50000,
      current_value: 52400,
      metadata: JSON.stringify(fdMeta),
      source: 'manual',
    });

    const all = await holdingsRepository.getAll(TEST_USER);
    const found = all.find(h => h.id === holding.id);

    // Metadata must survive round-trip through SQLite as valid JSON
    const parsedMeta = JSON.parse(found!.metadata);
    expect(parsedMeta.interest_rate).toBe(7.1);
    expect(parsedMeta.bank).toBe('HDFC Bank');
  });

  // ── Test 3: updatePrice recomputes current_value ────────────────
  it('updatePrice correctly recomputes current_value as quantity * newPrice', async () => {
    const holding = await holdingsRepository.insert({
      user_id: TEST_USER,
      type: 'stock',
      name: 'Reliance Industries',
      ticker: 'RELIANCE',
      quantity: 5,
      avg_buy_price: 2600,
      current_price: 2600,
      invested_amount: 13000,
      current_value: 13000,
      metadata: '{}',
      source: 'manual',
    });

    const newPrice = 2750;
    await holdingsRepository.updatePrice(holding.id, newPrice, new Date().toISOString());

    const all = await holdingsRepository.getAll(TEST_USER);
    const updated = all.find(h => h.id === holding.id);

    expect(updated?.current_price).toBe(2750);
    expect(updated?.current_value).toBe(5 * 2750);  // MUST be 13750, not old value
    expect(updated?.price_updated_at).toBeDefined();
  });

  // ── Test 4: getByType filter ────────────────────────────────────
  it('getByType returns only holdings of the requested type', async () => {
    const stocks = await holdingsRepository.getByType(TEST_USER, 'stock');
    const fds = await holdingsRepository.getByType(TEST_USER, 'fd');

    stocks.forEach(h => expect(h.type).toBe('stock'));
    fds.forEach(h => expect(h.type).toBe('fd'));
  });

  // ── Test 5: softDelete hides from getAll ───────────────────────
  it('softDelete hides holding from getAll results', async () => {
    const holding = await holdingsRepository.insert({
      user_id: TEST_USER,
      type: 'gold',
      name: 'SGB 2023',
      quantity: 5,
      avg_buy_price: 5600,
      current_price: 5840,
      invested_amount: 28000,
      current_value: 29200,
      metadata: JSON.stringify({ gold_type: 'SGB' }),
      source: 'manual',
    });

    await holdingsRepository.softDelete(holding.id);

    const all = await holdingsRepository.getAll(TEST_USER);
    const found = all.find(h => h.id === holding.id);
    expect(found).toBeUndefined();  // must be hidden, not hard deleted
  });

  // ── Test 6: metadata defaults to empty object ───────────────────
  it('metadata defaults to {} and is valid JSON', async () => {
    const holding = await holdingsRepository.insert({
      user_id: TEST_USER,
      type: 'other',
      name: 'Some other asset',
      quantity: 1,
      avg_buy_price: 1000,
      current_price: 1000,
      invested_amount: 1000,
      current_value: 1000,
      metadata: '{}',
      source: 'manual',
    });

    const all = await holdingsRepository.getAll(TEST_USER);
    const found = all.find(h => h.id === holding.id);

    expect(() => JSON.parse(found!.metadata)).not.toThrow();
    expect(JSON.parse(found!.metadata)).toEqual({});
  });

});
```

---

### 3.3 `priceSnapshotRepository.ts`

**File:** `db/repository/priceSnapshotRepository.ts`

```typescript
export const priceSnapshotRepository = {

  insert: async (snap: {
    holding_id: string;
    price: number;
    recorded_at: string;
    source: 'manual' | 'amfi' | 'sms';
  }): Promise => {
    await db.runAsync(
      `INSERT INTO price_snapshots (id, holding_id, price, recorded_at, source)
       VALUES (?, ?, ?, ?, ?)`,
      [uuid(), snap.holding_id, snap.price, snap.recorded_at, snap.source]
    );
  },

  getLatestN: async (holdingId: string, limit: number = 30): Promise<Array> => {
    return await db.getAllAsync(
      `SELECT price, recorded_at, source FROM price_snapshots
       WHERE holding_id = ? ORDER BY recorded_at DESC LIMIT ?`,
      [holdingId, limit]
    );
  },

};
```

### ✅ Test Gate 3.3 — priceSnapshotRepository

```typescript
// __tests__/priceSnapshotRepository.test.ts

describe('priceSnapshotRepository', () => {

  // ── Test 1: Insert and read back ───────────────────────────────
  it('inserts a snapshot and reads it back in DESC order', async () => {
    const holdingId = 'snap-test-holding';

    await priceSnapshotRepository.insert({ holding_id: holdingId, price: 84.37, recorded_at: '2026-02-01T09:00:00Z', source: 'amfi' });
    await priceSnapshotRepository.insert({ holding_id: holdingId, price: 86.10, recorded_at: '2026-03-01T09:00:00Z', source: 'amfi' });
    await priceSnapshotRepository.insert({ holding_id: holdingId, price: 85.55, recorded_at: '2026-02-15T09:00:00Z', source: 'manual' });

    const snaps = await priceSnapshotRepository.getLatestN(holdingId, 10);

    expect(snaps.length).toBe(3);
    // Must be DESC — latest first
    expect(snaps[0].price).toBe(86.10);
    expect(snaps[0].recorded_at).toBe('2026-03-01T09:00:00Z');
  });

  // ── Test 2: Limit works correctly ──────────────────────────────
  it('respects the limit parameter', async () => {
    const holdingId = 'limit-test-holding';
    for (let i = 0; i < 10; i++) {
      await priceSnapshotRepository.insert({
        holding_id: holdingId, price: 100 + i,
        recorded_at: `2026-0${(i % 9) + 1}-01T00:00:00Z`, source: 'manual'
      });
    }

    const snaps = await priceSnapshotRepository.getLatestN(holdingId, 3);
    expect(snaps.length).toBe(3);  // must respect limit, not return all 10
  });

});
```

---

### 3.4 Extend `sipRepository.ts`

Add these methods to the existing sipRepository:

```typescript
// Add to existing db/repository/sipRepository.ts

updateNAV: async (id: string, nav: number, navDate: string): Promise => {
  await db.runAsync(
    `UPDATE sips
     SET current_nav = ?, nav_updated_at = ?, updated_at = ?
     WHERE id = ?`,
    [nav, navDate, new Date().toISOString(), id]
  );
},

updateAfterAllotment: async (
  id: string,
  totalUnits: number,
  investedAmount: number,
  currentValue: number
): Promise => {
  await db.runAsync(
    `UPDATE sips
     SET total_units = ?, invested_amount = ?, current_value = ?, updated_at = ?
     WHERE id = ?`,
    [totalUnits, investedAmount, currentValue, new Date().toISOString(), id]
  );
},

getActiveWithSchemeCodes: async (): Promise<Array> => {
  return await db.getAllAsync(
    `SELECT id, scheme_code, total_units FROM sips
     WHERE status = 'active' AND scheme_code IS NOT NULL AND is_deleted = 0`
  );
},
```

### ✅ Test Gate 3.4 — sipRepository extensions

```typescript
describe('sipRepository extensions', () => {

  // ── Test 1: updateNAV persists and does not touch other fields ──
  it('updateNAV updates nav fields without touching other sip fields', async () => {
    // Assumes a sip with id 'sip-001' exists in test DB
    const before = await sipRepository.getById('sip-001');
    await sipRepository.updateNAV('sip-001', 94.51, '2026-03-01');
    const after = await sipRepository.getById('sip-001');

    expect(after.current_nav).toBe(94.51);
    expect(after.nav_updated_at).toBe('2026-03-01');
    expect(after.amount).toBe(before.amount);   // SIP amount must be unchanged
    expect(after.status).toBe(before.status);   // status must be unchanged
  });

  // ── Test 2: updateAfterAllotment recomputes correctly ──────────
  it('updateAfterAllotment sets all three aggregate fields correctly', async () => {
    await sipRepository.updateAfterAllotment('sip-001', 142.30, 11999, 13450);
    const sip = await sipRepository.getById('sip-001');

    expect(sip.total_units).toBe(142.30);
    expect(sip.invested_amount).toBe(11999);
    expect(sip.current_value).toBe(13450);
    // Returns should be computable without NaN
    expect(sip.current_value - sip.invested_amount).toBe(1451);
  });

});
```

---

## 4. Zustand Stores

> Build stores only after all repository test gates pass.

### 4.1 `holdingsStore.ts`

**File:** `stores/holdingsStore.ts`

```typescript
import { create } from 'zustand';
import { holdingsRepository, Holding } from '../db/repository/holdingsRepository';

interface HoldingsState {
  holdings: Holding[];
  isLoading: boolean;
  error: string | null;
  loadHoldings: (userId: string) => Promise;
  addHolding: (h: Omit) => Promise;
  updateHolding: (id: string, changes: Partial) => Promise;
  updatePrice: (id: string, price: number, timestamp: string) => Promise;
  deleteHolding: (id: string) => Promise;
  refreshHolding: (id: string, userId: string) => Promise;
}

export const useHoldingsStore = create((set, get) => ({
  holdings: [],
  isLoading: false,
  error: null,

  loadHoldings: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const holdings = await holdingsRepository.getAll(userId);
      set({ holdings, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addHolding: async (h) => {
    const inserted = await holdingsRepository.insert(h);
    set(state => ({ holdings: [inserted, ...state.holdings] }));
  },

  updateHolding: async (id, changes) => {
    await holdingsRepository.update(id, changes);
    set(state => ({
      holdings: state.holdings.map(h => h.id === id ? { ...h, ...changes } : h)
    }));
  },

  updatePrice: async (id, price, timestamp) => {
    await holdingsRepository.updatePrice(id, price, timestamp);
    set(state => ({
      holdings: state.holdings.map(h =>
        h.id === id
          ? { ...h, current_price: price, current_value: h.quantity * price, price_updated_at: timestamp }
          : h
      )
    }));
  },

  deleteHolding: async (id) => {
    await holdingsRepository.softDelete(id);
    set(state => ({ holdings: state.holdings.filter(h => h.id !== id) }));
  },

  refreshHolding: async (id, userId) => {
    const all = await holdingsRepository.getAll(userId);
    set({ holdings: all });
  },
}));
```

### 4.2 `investmentTxStore.ts`

**File:** `stores/investmentTxStore.ts`

> Load lazily per holding — never load all transactions at startup.

```typescript
import { create } from 'zustand';
import { investmentTxRepository, InvestmentTransaction } from '../db/repository/investmentTxRepository';

interface InvestmentTxState {
  // keyed by holding_id — only loaded when detail screen opens
  byHolding: Record;
  loadForHolding: (holdingId: string) => Promise;
  addTransaction: (tx: Omit) => Promise;
  deleteTransaction: (id: string, holdingId: string) => Promise;
  clearHolding: (holdingId: string) => void;
}

export const useInvestmentTxStore = create((set, get) => ({
  byHolding: {},

  loadForHolding: async (holdingId) => {
    const txs = await investmentTxRepository.getByHoldingId(holdingId);
    set(state => ({ byHolding: { ...state.byHolding, [holdingId]: txs } }));
  },

  addTransaction: async (tx) => {
    const inserted = await investmentTxRepository.insert(tx);
    set(state => ({
      byHolding: {
        ...state.byHolding,
        [tx.holding_id]: [inserted, ...(state.byHolding[tx.holding_id] ?? [])]
      }
    }));
    return inserted;
  },

  deleteTransaction: async (id, holdingId) => {
    await investmentTxRepository.softDelete(id);
    set(state => ({
      byHolding: {
        ...state.byHolding,
        [holdingId]: (state.byHolding[holdingId] ?? []).filter(t => t.id !== id)
      }
    }));
  },

  clearHolding: (holdingId) => {
    set(state => {
      const next = { ...state.byHolding };
      delete next[holdingId];
      return { byHolding: next };
    });
  },
}));
```

---

## 5. Calculation Utilities

**File:** `utils/investmentCalculations.ts`

```typescript
import { differenceInDays } from 'date-fns';

// ── Basic returns ──────────────────────────────────────────────────────────

export const absoluteReturn = (currentValue: number, invested: number): number =>
  currentValue - invested;

export const returnPercent = (currentValue: number, invested: number): number =>
  invested > 0 ? ((currentValue - invested) / invested) * 100 : 0;

// ── MF / SIP ───────────────────────────────────────────────────────────────

export const computeCurrentValue = (totalUnits: number, latestNAV: number): number =>
  totalUnits * latestNAV;

export const averageNAV = (invested: number, totalUnits: number): number =>
  totalUnits > 0 ? invested / totalUnits : 0;

export const cagr = (currentValue: number, invested: number, years: number): number =>
  years > 0 && invested > 0
    ? (Math.pow(currentValue / invested, 1 / years) - 1) * 100
    : 0;

// XIRR — Extended IRR for SIPs (accounts for different investment dates)
// Requires: npm install xirr
export const computeXIRR = (
  allotments: Array,
  currentValue: number
): number => {
  try {
    const xirr = require('xirr');
    const cashflows = [
      ...allotments.map(a => ({ amount: -a.amount, when: new Date(a.date) })),
      { amount: currentValue, when: new Date() },
    ];
    if (cashflows.length < 2) return 0;
    return xirr(cashflows) * 100;
  } catch {
    // XIRR fails to converge on some edge cases — fall back to simple return
    const totalInvested = allotments.reduce((s, a) => s + a.amount, 0);
    return returnPercent(currentValue, totalInvested);
  }
};

// ── FD ─────────────────────────────────────────────────────────────────────

export const fdMaturityValue = (
  principal: number,
  annualRate: number,       // e.g. 7.1 for 7.1%
  compoundingPerYear: number, // 4 = quarterly, 12 = monthly, 1 = annually
  tenureYears: number
): number => {
  const r = annualRate / 100;
  return principal * Math.pow(1 + r / compoundingPerYear, compoundingPerYear * tenureYears);
};

export const fdCurrentValue = (
  principal: number,
  annualRate: number,
  compoundingPerYear: number,
  startDate: string
): number => {
  const yearsElapsed = differenceInDays(new Date(), new Date(startDate)) / 365;
  return fdMaturityValue(principal, annualRate, compoundingPerYear, yearsElapsed);
};

// ── Loans ──────────────────────────────────────────────────────────────────

export const remainingTenureMonths = (
  outstanding: number,
  emiAmount: number,
  annualRate: number
): number => {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return Math.ceil(outstanding / emiAmount);
  if (emiAmount <= outstanding * monthlyRate) return Infinity; // EMI too low to ever repay
  return Math.ceil(
    -Math.log(1 - (outstanding * monthlyRate) / emiAmount) / Math.log(1 + monthlyRate)
  );
};

export const emiInterestComponent = (outstanding: number, annualRate: number): number =>
  (outstanding * annualRate) / 100 / 12;

export const emiPrincipalComponent = (emiAmount: number, outstanding: number, annualRate: number): number =>
  emiAmount - emiInterestComponent(outstanding, annualRate);

// ── Staleness ─────────────────────────────────────────────────────────────

export const isStale = (lastUpdated: string | null | undefined, thresholdDays: number): boolean => {
  if (!lastUpdated) return true;
  return differenceInDays(new Date(), new Date(lastUpdated)) > thresholdDays;
};

export const stalenessLabel = (lastUpdated: string | null | undefined): string => {
  if (!lastUpdated) return 'never updated';
  const days = differenceInDays(new Date(), new Date(lastUpdated));
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
};

// ── Portfolio aggregation ─────────────────────────────────────────────────

export const computeAllocation = (
  sips: Array,
  holdings: Array
): Array => {
  const groups: Record = {};

  sips.forEach(s => {
    groups['Mutual Funds'] = (groups['Mutual Funds'] ?? 0) + s.current_value;
  });
  holdings.forEach(h => {
    const label = {
      stock: 'Stocks', fd: 'Fixed Deposits', bond: 'Bonds',
      gold: 'Gold', ppf: 'PPF/NPS', nps: 'PPF/NPS', other: 'Other'
    }[h.type] ?? 'Other';
    groups[label] = (groups[label] ?? 0) + h.current_value;
  });

  const total = Object.values(groups).reduce((a, b) => a + b, 0);
  return Object.entries(groups).map(([label, value]) => ({
    label,
    value,
    percent: total > 0 ? (value / total) * 100 : 0,
  }));
};
```

### ✅ Test Gate 5 — Calculation Utilities

```typescript
// __tests__/investmentCalculations.test.ts

import {
  returnPercent, fdMaturityValue, fdCurrentValue,
  remainingTenureMonths, isStale, averageNAV, computeCurrentValue
} from '../utils/investmentCalculations';

describe('investmentCalculations', () => {

  it('returnPercent computes correctly', () => {
    expect(returnPercent(13450, 11999)).toBeCloseTo(12.09, 1);
    expect(returnPercent(11999, 11999)).toBe(0);       // no gain
    expect(returnPercent(0, 0)).toBe(0);               // zero division guard
  });

  it('computeCurrentValue = units * nav', () => {
    expect(computeCurrentValue(142.30, 94.51)).toBeCloseTo(13449.67, 1);
    expect(computeCurrentValue(0, 94.51)).toBe(0);
  });

  it('averageNAV = invested / units', () => {
    expect(averageNAV(11999, 142.30)).toBeCloseTo(84.32, 1);
    expect(averageNAV(1000, 0)).toBe(0);  // zero division guard
  });

  it('fdMaturityValue — known value: 50000 @ 7.1% quarterly for 1 year', () => {
    const result = fdMaturityValue(50000, 7.1, 4, 1);
    expect(result).toBeCloseTo(53655, 0);  // ~₹3655 interest on 50k at 7.1% quarterly
  });

  it('remainingTenureMonths — 20 year home loan', () => {
    // ₹40L loan, ₹35k EMI, 8.5% rate — should be roughly 18-20 years remaining
    const months = remainingTenureMonths(4000000, 35000, 8.5);
    expect(months).toBeGreaterThan(200);
    expect(months).toBeLessThan(260);
  });

  it('isStale returns true when lastUpdated exceeds threshold', () => {
    expect(isStale('2026-01-01', 7)).toBe(true);   // old date is stale
    expect(isStale(null, 7)).toBe(true);            // null is always stale
    expect(isStale(new Date().toISOString(), 7)).toBe(false);  // today is fresh
  });

});
```

---

## 6. CRUD Operations

### 6.1 Record SIP Allotment

```typescript
// Called from RecordAllotmentSheet.tsx after user submits the form

export const recordSIPAllotment = async (
  sip: SIP,
  allotment: { units: number; nav: number; amount: number; date: string }
): Promise => {

  // Step 1: Write the event
  await useInvestmentTxStore.getState().addTransaction({
    user_id: sip.user_id,
    holding_id: sip.id,
    holding_type: 'sip',
    event_type: 'sip_allotment',
    amount: allotment.amount,
    units: allotment.units,
    nav: allotment.nav,
    event_date: allotment.date,
    source: 'manual',
  });

  // Step 2: Write price snapshot
  await priceSnapshotRepository.insert({
    holding_id: sip.id,
    price: allotment.nav,
    recorded_at: allotment.date,
    source: 'manual',
  });

  // Step 3: Recompute SIP aggregate fields from full history
  const allHistory = await investmentTxRepository.getByHoldingIdAndType(sip.id, 'sip_allotment');
  const totalUnits = allHistory.reduce((s, t) => s + (t.units ?? 0), 0);
  const totalInvested = allHistory.reduce((s, t) => s + t.amount, 0);
  const currentValue = totalUnits * allotment.nav;  // latest NAV

  await sipRepository.updateAfterAllotment(sip.id, totalUnits, totalInvested, currentValue);

  // Step 4: Refresh store
  await useSipStore.getState().loadSIPs(sip.user_id);
};
```

### 6.2 Record Loan Payment

```typescript
// Called from RecordPaymentSheet.tsx

export const recordLoanPayment = async (
  loan: Loan,
  payment: { amount: number; date: string; notes?: string }
): Promise => {

  const newOutstanding = loan.outstanding - payment.amount;

  // Step 1: Write investment event
  await investmentTxRepository.insert({
    user_id: loan.user_id,
    holding_id: loan.id,
    holding_type: 'loan',
    event_type: 'emi_payment',
    amount: payment.amount,
    balance_after: newOutstanding,
    event_date: payment.date,
    notes: payment.notes,
    source: 'manual',
  });

  // Step 2: Update loan outstanding
  await loanRepository.update(loan.id, { outstanding: newOutstanding });

  // Step 3: Cross-link to transaction timeline as expense
  // This makes EMI payments appear in the monthly transactions view
  await transactionRepository.insert({
    id: uuid(),
    user_id: loan.user_id,
    amount: payment.amount,
    type: 'expense',
    category_id: LOAN_EMI_CATEGORY_ID,  // pre-seeded category
    merchant: loan.lender,
    date: payment.date,
    notes: `EMI — ${loan.lender}`,
    source: 'manual',
    is_deleted: 0,
    updated_at: new Date().toISOString(),
  });

  // Step 4: Refresh stores
  useLoanStore.getState().loadLoans(loan.user_id);
  useTransactionStore.getState().fetchTransactions();
};
```

### 6.3 Update Holding Price

```typescript
// Called from UpdatePriceSheet.tsx — must be 3 taps maximum in the UI

export const updateHoldingPrice = async (
  holding: Holding,
  newPrice: number
): Promise => {
  const now = new Date().toISOString();

  // Step 1: Update holding record
  await useHoldingsStore.getState().updatePrice(holding.id, newPrice, now);

  // Step 2: Write price snapshot (enables future charts)
  await priceSnapshotRepository.insert({
    holding_id: holding.id,
    price: newPrice,
    recorded_at: now,
    source: 'manual',
  });

  // Step 3: Write investment_transaction event
  await investmentTxRepository.insert({
    user_id: holding.user_id,
    holding_id: holding.id,
    holding_type: 'holding',
    event_type: 'price_update',
    amount: holding.quantity * newPrice,
    price: newPrice,
    event_date: now,
    source: 'manual',
  });
};
```

---

## 7. New Screens

### 7.1 Screen Map

```
app/(routes)/investment/
├── sip-detail.tsx          -- SIP detail + allotment history
├── holding-detail.tsx      -- Holding detail + price history
├── loan-detail.tsx         -- Loan detail + payment history
├── add-holding.tsx         -- Add holding form (type-specific)
├── edit-sip.tsx            -- Edit SIP form
├── edit-holding.tsx        -- Edit holding form
└── edit-loan.tsx           -- Edit loan form

components/investments/
├── RecordAllotmentSheet.tsx  -- Bottom sheet for SIP allotment recording
├── RecordPaymentSheet.tsx    -- Bottom sheet for loan payment recording
├── UpdatePriceSheet.tsx      -- Mini 3-tap price update sheet
├── AllotmentHistoryList.tsx  -- FlashList of sip_allotment events
├── PaymentHistoryList.tsx    -- FlashList of loan payment events
├── StalenessBadge.tsx        -- Amber "Xd old" indicator
└── DataHealthBanner.tsx      -- Overview banner for stale price count
```

### 7.2 SIP Detail Screen Content

| Section | Content |
|---|---|
| Header | Fund name, folio, status badge, Edit / Delete buttons |
| Performance card | Invested, current value, returns, returns%, XIRR, avg NAV |
| NAV section | Current NAV + last updated (with staleness colour) + 'Update NAV' button |
| SIP details | Amount, frequency, start date, next due date |
| Allotment history | FlashList of sip_allotment events — date, units, NAV, amount |
| Bottom actions | 'Record allotment', 'Pause SIP', 'Cancel SIP' |

### 7.3 Loan Detail Screen Content

| Section | Content |
|---|---|
| Header | Lender name, loan type badge, account number, Edit button |
| Summary card | Outstanding, original principal, repayment progress bar |
| EMI section | EMI amount, due day, interest rate, tenure remaining (computed) |
| Countdown chip | Days until next EMI — red ≤5 days, green >5 days |
| Payment history | FlashList of emi_payment events — date, amount, balance after |
| Bottom actions | 'Record EMI payment', 'Record prepayment' |

### 7.4 Holding Detail Screen Content

| Section | Content |
|---|---|
| Header | Name, type badge, ticker/account number, Edit / Delete buttons |
| Performance card | Invested, current value, P&L, P&L%, staleness indicator |
| Price section | Current price, last updated with colour, 'Update price' CTA |
| Details | Type-specific: shares+avg for stocks, rate+maturity for FD |
| Transaction history | FlashList of buy/sell/price_update events |
| Bottom actions | 'Update price', 'Add buy', 'Record sell' (stocks only) |

---

## 8. Online Automation

> **Principle:** Offline-first always. Online features add data, never block the UI. All online calls wrapped in try/catch with silent failure.

### 8.1 AMFI NAV Auto-Fetch

**File:** `services/amfiNavService.ts`

```typescript
const AMFI_URL = 'https://www.amfiindia.com/spages/NAVAll.txt';
const LAST_FETCH_KEY = 'amfi_last_fetch_date';

const parseAMFIFile = (text: string): Record => {
  const navMap: Record = {};
  const lines = text.split('\n');
  for (const line of lines) {
    const parts = line.split(';');
    if (parts.length >= 5) {
      const schemeCode = parts[0].trim();
      const nav = parseFloat(parts[4].trim());
      const date = parts[5]?.trim() ?? new Date().toISOString().split('T')[0];
      if (schemeCode && !isNaN(nav)) {
        navMap[schemeCode] = { nav, date };
      }
    }
  }
  return navMap;
};

export const fetchAndUpdateNAVs = async (): Promise => {
  const lastFetch = await AsyncStorage.getItem(LAST_FETCH_KEY);
  const today = new Date().toISOString().split('T')[0];
  if (lastFetch === today) return { updated: 0, failed: 0 };  // already fetched today

  try {
    const response = await fetch(AMFI_URL, {
      signal: AbortSignal.timeout(15000)  // 15s timeout
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    const navMap = parseAMFIFile(text);

    const activeSIPs = await sipRepository.getActiveWithSchemeCodes();
    let updated = 0;
    let failed = 0;

    for (const sip of activeSIPs) {
      const latest = navMap[sip.scheme_code];
      if (!latest) { failed++; continue; }

      try {
        await sipRepository.updateNAV(sip.id, latest.nav, latest.date);
        await priceSnapshotRepository.insert({
          holding_id: sip.id, price: latest.nav,
          recorded_at: latest.date, source: 'amfi'
        });
        const currentValue = sip.total_units * latest.nav;
        await sipRepository.update(sip.id, { current_value: currentValue });
        updated++;
      } catch { failed++; }
    }

    await AsyncStorage.setItem(LAST_FETCH_KEY, today);
    await useSipStore.getState().loadSIPs(currentUserId);
    return { updated, failed };

  } catch (error) {
    // Silent fail — user continues with last known NAV
    console.warn('[AMFI] Fetch failed, using cached NAV:', error);
    return { updated: 0, failed: -1 };
  }
};

// Register in expo-background-fetch (already in your stack)
// Call fetchAndUpdateNAVs() in the existing background fetch task
// Also call on app foreground (AppState change to 'active')
```

### 8.2 SMS Auto-Import for Investments

Extend existing `smsParser.ts` with these patterns. Route matched SMS to investment handlers **before** the transaction handler runs:

```typescript
// Add to services/smsParser.ts

export const INVESTMENT_SMS_PATTERNS = {
  sipAllotment: /Units allotted ([\d.]+).*?Rs\.?([\d,]+).*?NAV.*?Rs\.?([\d.]+)/i,
  loanEMI:      /EMI of Rs\.?([\d,]+) debited.*?Outstanding.*?Rs\.?([\d,]+)/i,
  stockBuy:     /Bought (\d+) ([A-Z]+) @\s*Rs\.?([\d.]+) on (NSE|BSE)/i,
  dividend:     /Dividend of Rs\.?([\d.]+) credited.*?folio[:\s]+([\d/]+)/i,
  fdMatured:    /FD of Rs\.?([\d,]+) matured.*?credited/i,
};

export const parseInvestmentSMS = (body: string, smsId: string): ParsedInvestmentEvent | null => {
  // Check dedup first — never process same SMS twice
  // investmentTxRepository.existsBySmsId(smsId) — check before parsing

  if (INVESTMENT_SMS_PATTERNS.sipAllotment.test(body)) {
    const m = body.match(INVESTMENT_SMS_PATTERNS.sipAllotment)!;
    return { type: 'sip_allotment', units: parseFloat(m[1]), amount: parseFloat(m[2].replace(/,/g,'')), nav: parseFloat(m[3]), smsId };
  }
  if (INVESTMENT_SMS_PATTERNS.loanEMI.test(body)) {
    const m = body.match(INVESTMENT_SMS_PATTERNS.loanEMI)!;
    return { type: 'emi_payment', amount: parseFloat(m[1].replace(/,/g,'')), balanceAfter: parseFloat(m[2].replace(/,/g,'')), smsId };
  }
  if (INVESTMENT_SMS_PATTERNS.stockBuy.test(body)) {
    const m = body.match(INVESTMENT_SMS_PATTERNS.stockBuy)!;
    return { type: 'stock_buy', quantity: parseInt(m[1]), ticker: m[2], price: parseFloat(m[3]), exchange: m[4], smsId };
  }
  return null;
};
```

---

## 9. Error Boundaries

**File:** `components/ErrorBoundary.tsx`

Every investment tab content must be wrapped in this. One crash in holdingsStore must not kill the entire Investments tab.

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
  fallbackMessage?: string;
  onRetry?: () => void;
}

interface State { hasError: boolean; error: string | null; }

export class ErrorBoundary extends React.Component {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
    // Optionally: log to Supabase error tracking
  }

  render() {
    if (this.state.hasError) {
      return (
        
          ⚠️
          {this.props.fallbackMessage ?? "Couldn't load this section"}
          {this.props.onRetry && (
            <TouchableOpacity onPress={() => { this.setState({ hasError: false, error: null }); this.props.onRetry?.(); }}>
              Try again
            
          )}
        
      );
    }
    return this.props.children;
  }
}

// Usage in investments.tsx:
// 
//   
// 
```

---

## 10. Sync Extension

Extend `services/sync.ts` to include the three new tables. Follow the existing last-write-wins pattern.

```typescript
// Add to existing sync.ts syncToSupabase() function

// Sync holdings
const holdingsToSync = await holdingsRepository.getModifiedSince(lastSyncTime);
for (const h of holdingsToSync) {
  await supabase.from('holdings').upsert(h, { onConflict: 'id' });
}

// Sync investment_transactions (append-only, low conflict risk)
const txsToSync = await investmentTxRepository.getModifiedSince(lastSyncTime);
for (const tx of txsToSync) {
  await supabase.from('investment_transactions').upsert(tx, { onConflict: 'id' });
}

// Sync price_snapshots (append-only)
const snapsToSync = await priceSnapshotRepository.getModifiedSince(lastSyncTime);
for (const snap of snapsToSync) {
  await supabase.from('price_snapshots').upsert(snap, { onConflict: 'id' });
}
```

> **IMPORTANT — Holdings price sync rule:** When pulling remote holdings, never overwrite a `price_updated_at` that is more recent locally. Use:
> ```sql
> UPDATE holdings SET ...
> WHERE updated_at < remote.updated_at
>    OR price_updated_at < remote.price_updated_at
> ```
> Never blindly overwrite a freshly entered local price with a stale cloud value.

---

## 11. Build Order

> **Rule:** Never skip a test gate. A broken repository caught on Day 1 takes 20 minutes to fix. The same bug discovered inside a screen on Day 6 takes 3 hours to trace back.

| Day | Task | Test Gate |
|---|---|---|
| 1 | DB migrations — all 4 schema changes | Open SQLite file, confirm all tables/columns exist with correct types |
| 1–2 | investmentTxRepository + tests | All 6 test cases in Test Gate 3.1 pass |
| 2 | holdingsRepository + tests | All 6 test cases in Test Gate 3.2 pass |
| 2 | priceSnapshotRepository + tests | Test Gate 3.3 passes |
| 2 | sipRepository extensions + tests | Test Gate 3.4 passes |
| 3 | holdingsStore + investmentTxStore | Store loads data after repository writes, optimistic updates work |
| 3 | investmentCalculations utils + tests | All calculation tests pass, no NaN on edge cases |
| 3–4 | Loan detail screen + RecordPaymentSheet | Record payment → outstanding decreases → expense appears in transactions timeline |
| 4 | SIP detail screen + RecordAllotmentSheet | Record allotment → units/invested/current_value all update correctly |
| 4–5 | Holding detail screen + UpdatePriceSheet | Update price → current_value recomputes → snapshot written |
| 5 | AMFI NAV service | Fetch runs, NAVs update for active SIPs, snapshots written |
| 5–6 | SMS patterns for investments | Parse 5 test SMS strings, verify correct event type created per pattern |
| 6 | Sync extension for new tables | New records appear in Supabase after sync |
| 6 | Error boundaries on all investment tabs | Force a JS throw in each tab, verify boundary catches it without crashing other tabs |
| 7 | usePortfolioSummary hook | Values match manual sum of individual holdings |
| 7 | Overview tab wired to real data | All cards show real values, stale count is accurate |
| 8+ | QA pass on all investment screens | Manual test all CRUD operations on device |

---

## 12. File Manifest

### New Files

| File | Purpose |
|---|---|
| `db/repository/investmentTxRepository.ts` | CRUD for investment_transactions |
| `db/repository/holdingsRepository.ts` | CRUD for holdings table |
| `db/repository/priceSnapshotRepository.ts` | Append-only writes for price_snapshots |
| `stores/holdingsStore.ts` | Zustand store for holdings |
| `stores/investmentTxStore.ts` | Lazy-loaded, per-holding investment event store |
| `hooks/usePortfolioSummary.ts` | Aggregates all stores into portfolio metrics |
| `utils/investmentCalculations.ts` | NAV, XIRR, CAGR, FD, loan tenure formulas |
| `services/amfiNavService.ts` | AMFI flat file fetch + NAV update logic |
| `components/ErrorBoundary.tsx` | Per-tab crash boundary with retry |
| `components/investments/RecordPaymentSheet.tsx` | Loan EMI/prepayment bottom sheet |
| `components/investments/RecordAllotmentSheet.tsx` | SIP allotment recording sheet |
| `components/investments/UpdatePriceSheet.tsx` | 3-tap price update mini sheet |
| `components/investments/AllotmentHistoryList.tsx` | FlashList of SIP allotment events |
| `components/investments/PaymentHistoryList.tsx` | FlashList of loan payment events |
| `components/investments/StalenessBadge.tsx` | Amber "Xd ago" indicator |
| `components/investments/DataHealthBanner.tsx` | Overview stale price count banner |
| `app/(routes)/investment/sip-detail.tsx` | Full SIP detail screen |
| `app/(routes)/investment/holding-detail.tsx` | Holding detail screen |
| `app/(routes)/investment/loan-detail.tsx` | Loan detail + payment history |
| `app/(routes)/investment/add-holding.tsx` | Add holding form (type-aware) |
| `app/(routes)/investment/edit-sip.tsx` | Edit SIP form |
| `app/(routes)/investment/edit-holding.tsx` | Edit holding form |
| `app/(routes)/investment/edit-loan.tsx` | Edit loan form |

### Modified Files

| File | What Changes |
|---|---|
| `db/repository/sipRepository.ts` | Add updateNAV(), updateAfterAllotment(), getActiveWithSchemeCodes() + migration |
| `db/repository/loanRepository.ts` | Add updateOutstanding() after payment recording |
| `stores/sipStore.ts` | Add refreshSIP(id) action for post-allotment recompute |
| `stores/loanStore.ts` | Add updateOutstanding() action |
| `services/smsParser.ts` | Add INVESTMENT_SMS_PATTERNS + parseInvestmentSMS() routing |
| `services/sync.ts` | Extend to sync holdings, investment_transactions, price_snapshots |
| `app/(tabs)/investments.tsx` | Wire Overview to usePortfolioSummary, wrap tabs in ErrorBoundary, add DataHealthBanner |

### Untouched Files

| File | Reason |
|---|---|
| `transactionStore.ts` | Only extended via loan payment cross-link (handled in recordLoanPayment) |
| `budgetStore.ts` | Not affected |
| `categoryStore.ts` | Not affected — LOAN_EMI_CATEGORY_ID should already exist |
| `smsInitService.ts` | Investment SMS routed in new layer, not init service |
| `app/(tabs)/index.tsx` | Dashboard investment widget reads from holdingsStore, no changes needed |

---

## 13. Expandability Assessment

| Future Feature | Cost Under This Architecture | Complexity |
|---|---|---|
| Price charts / sparklines | Low — price_snapshots already exists, just add chart component | Easy |
| New asset type (Crypto, US stocks) | Low — add new type value, extend metadata JSON, add form. No schema change | Easy |
| CAMS / Karvy CAS PDF import | Medium — parse PDF, map to investment_transaction events | Medium |
| Zerodha Kite API integration | Medium — API calls produce InvestmentTransaction events, same schema | Medium |
| Tax computation (LTCG/STCG) | Medium — query investment_transactions for buy/sell pairs, apply tax rules | Medium |
| Portfolio rebalancing suggestions | Medium — reads allocation from usePortfolioSummary, computes target vs actual | Medium |
| Multi-currency holdings | Medium — add currency field to holdings, conversion rate to price_snapshots | Medium |
| Account Aggregator (AA framework) | High — requires FIU registration + compliance, architecture supports it | Hard |
| Real-time stock prices | High — needs paid API + polling/WebSocket, significant battery impact on Android | Hard |

---

## Appendix — Key Decisions Summary

| Decision | Choice | Reason |
|---|---|---|
| investment_transactions as event log | ✅ Immutable events, never update | Enables XIRR, charts, tax, audit trail |
| Holdings schema | Unified table + metadata JSON | Avoids nullable columns, supports new asset types without migration |
| price_snapshots as separate table | ✅ Append-only | Charts and history possible without future schema change |
| XIRR library | `xirr` npm package | 12KB, no native deps, works in React Native, matches industry standard |
| EMI payment → transaction link | ✅ Cross-link to transactions table | EMI appears in monthly spending, consistent with app's core value prop |
| AMFI fetch frequency | Once per day via AsyncStorage gate | Free public data, avoids unnecessary 2MB fetches |
| Sync conflict rule for prices | price_updated_at wins over updated_at | Prevents stale cloud NAV overwriting fresh local manual entry |
| Error boundaries | Per-tab, not per-app | One broken store doesn't kill the entire investments screen |

---

*End of document. Total new files: 23. Modified files: 7. Untouched files: 5.*