// services/investmentSmsHandler.ts
// ─────────────────────────────────────────────────────────────────────────────
// Translates structured SMS parse results (from smsAlertParser.ts) into
// investment_transaction database writes.
//
// Flow per SMS:
//   smsAlertParser → ParsedSIPAllotment / ParsedLoanEMI / ParsedStockTrade
//         ↓
//   investmentSmsHandler (this file) → dedup check → DB write → store refresh
//
// Day 5 implementation:
//   handleSIPAllotmentSMS() — SIP allotment events
//   handleLoanEMISMS()      — Loan EMI payment events
//   handleStockBuySMS()     — Stock buy events (Day 8, stub ready)
// ─────────────────────────────────────────────────────────────────────────────

import {
    ParsedSIPAllotment,
    ParsedLoanEMI,
    ParsedStockTrade,
} from './smsAlertParser';
import {
    saveInvestmentTxToDB,
    findInvestmentTxBySmsId,
} from '@/db/repository/investmentTxRepository';
import {
    findSIPByFolio,
    createSIPFromSMS,
} from '@/db/repository/sipRepository';
import { useSIPStore } from '@/stores/sipStore';
import { useLoanStore } from '@/stores/loanStore';
import { useHoldingsStore } from '@/stores/holdingsStore';

// Simple local ID generator (same as stores)
const generateId = () =>
    Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

// ─── Result types ─────────────────────────────────────────────────────────────

export type HandlerResult =
    | { status: 'success'; holdingId: string }
    | { status: 'duplicate'; skipped: true; existingId: string }
    | { status: 'error'; reason: string };

// ─── SIP Allotment Handler ───────────────────────────────────────────────────

/**
 * Handles a parsed SIP allotment SMS.
 *
 * Steps:
 *   1. Dedup — skip if sms_id already recorded
 *   2. Match folio → existing SIP; if not found, auto-create skeleton SIP
 *   3. Write investment_transaction row (event_type = 'allotment')
 *   4. Refresh sipStore so UI reflects updated totals
 *
 * @param parsed  Structured output from smsAlertParser.parseSIPAllotment()
 * @param smsId   Raw SMS ID from the device — used as dedup key
 */
export const handleSIPAllotmentSMS = async (
    parsed: ParsedSIPAllotment,
    smsId: string
): Promise<HandlerResult> => {
    try {
        // Step 1: Dedup check
        const existing = await findInvestmentTxBySmsId(smsId);
        if (existing) {
            return { status: 'duplicate', skipped: true, existingId: existing.id };
        }

        // Step 2: Find or create matching SIP by folio number
        let sipId: string;
        const sip = await findSIPByFolio(parsed.folioNumber);
        if (!sip) {
            // Auto-create a skeleton SIP — user edits details from detail screen
            sipId = await createSIPFromSMS({
                folioNumber: parsed.folioNumber,
                amount: parsed.amount,
                fundName: parsed.fundName,
            });
            console.log(`[investmentSmsHandler] Auto-created SIP for folio ${parsed.folioNumber} → id: ${sipId}`);
        } else {
            sipId = sip.id;
        }

        // Step 3: Write investment_transaction row
        const now = new Date().toISOString();
        await saveInvestmentTxToDB({
            id: generateId(),
            holding_id: sipId,
            holding_type: 'sip',
            event_type: 'allotment',
            amount: parsed.amount,
            units: parsed.units,
            nav: parsed.nav,
            event_date: parsed.date || now,
            source: 'sms',
            sms_id: smsId,
            is_deleted: 0 as any,
            updated_at: now,
            created_at: now,
        });

        // Step 4: Refresh sipStore — triggers reactive UI update
        await useSIPStore.getState().fetchSIPs();

        console.log(
            `[investmentSmsHandler] SIP allotment recorded — folio: ${parsed.folioNumber}` +
            `, units: ${parsed.units}, nav: ${parsed.nav}, amount: ₹${parsed.amount}`
        );

        return { status: 'success', holdingId: sipId };
    } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.error('[investmentSmsHandler] handleSIPAllotmentSMS failed:', reason);
        return { status: 'error', reason };
    }
};

// ─── Loan EMI Handler ────────────────────────────────────────────────────────

/**
 * Handles a parsed Loan EMI SMS.
 *
 * Steps:
 *   1. Dedup — skip if sms_id already recorded
 *   2. Find matching loan by last-4 of loan account number
 *      (best-effort match; if ambiguous or not found, creates a standalone tx)
 *   3. Write investment_transaction row (event_type = 'payment')
 *   4. Refresh loanStore so outstanding balance updates in UI
 *
 * @param parsed  Structured output from smsAlertParser.parseLoanEMI()
 * @param smsId   Raw SMS ID from the device — used as dedup key
 */
export const handleLoanEMISMS = async (
    parsed: ParsedLoanEMI,
    smsId: string
): Promise<HandlerResult> => {
    try {
        // Step 1: Dedup check
        const existing = await findInvestmentTxBySmsId(smsId);
        if (existing) {
            return { status: 'duplicate', skipped: true, existingId: existing.id };
        }

        // Step 2: Find matching loan (best-effort by loan account hint)
        let loanId: string | null = null;
        const loans = useLoanStore.getState().loans;

        if (parsed.loanAccountHint) {
            const matched = loans.find(
                l => l.notes?.includes(parsed.loanAccountHint!)
            );
            if (matched) loanId = matched.id;
        }

        // Fallback: match by lender name heuristic
        if (!loanId && parsed.lenderHint) {
            const lowerHint = parsed.lenderHint.toLowerCase();
            const matched = loans.find(
                l => l.lender && l.lender.toLowerCase().includes(lowerHint)
            );
            if (matched) loanId = matched.id;
        }

        // Step 3: Write investment_transaction row
        const now = new Date().toISOString();
        const txId = generateId();
        await saveInvestmentTxToDB({
            id: txId,
            // If no loan matched, use a synthetic holding_id so the tx is stored
            // User can link it manually from the Loans tab
            holding_id: loanId ?? `unmatched_loan_${txId}`,
            holding_type: 'other',
            event_type: 'payment',
            amount: parsed.emiAmount,
            balance_after: parsed.outstandingAmount,
            event_date: parsed.date || now,
            source: 'sms',
            sms_id: smsId,
            notes: loanId ? undefined : `Unmatched loan — ${parsed.lenderHint}`,
            is_deleted: 0 as any,
            updated_at: now,
            created_at: now,
        });

        // Step 4: If we matched a loan, trigger outstanding update via loanStore
        if (loanId) {
            await useLoanStore.getState().recordPayment(loanId, parsed.emiAmount);
        } else {
            // Still refresh so the unmatched tx shows in the investmentTx list
            console.warn(
                `[investmentSmsHandler] Loan EMI recorded but no matching loan found. ` +
                `Hint: "${parsed.lenderHint}" / account: "${parsed.loanAccountHint}"`
            );
        }

        console.log(
            `[investmentSmsHandler] Loan EMI recorded — ₹${parsed.emiAmount}` +
            (loanId ? ` → loanId: ${loanId}` : ' (unmatched)')
        );

        return { status: 'success', holdingId: loanId ?? txId };
    } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.error('[investmentSmsHandler] handleLoanEMISMS failed:', reason);
        return { status: 'error', reason };
    }
};

// ─── Stock Buy/Sell Handler ───────────────────────────────────────────────────

/**
 * Handles a parsed stock buy or sell SMS.
 *
 * Steps:
 *   1. Dedup — skip if sms_id already recorded
 *   2. Find existing Holding by ticker symbol (case-insensitive match)
 *      If not found: auto-create a new Holding with data from the SMS
 *   3. For BUY:  update avg_buy_price (weighted average) and quantity
 *      For SELL: reduce quantity (remaining holdings stay at cost basis)
 *   4. Write investment_transaction row (event_type = 'buy' | 'sell')
 *   5. Refresh holdingsStore so UI reflects the change
 *
 * @param parsed  Structured output from smsAlertParser.parseStockBuy()
 * @param smsId   Raw SMS ID from the device — used as dedup key
 */
export const handleStockBuySMS = async (
    parsed: ParsedStockTrade,
    smsId: string
): Promise<HandlerResult> => {
    try {
        // Step 1: Dedup check
        const existing = await findInvestmentTxBySmsId(smsId);
        if (existing) {
            return { status: 'duplicate', skipped: true, existingId: existing.id };
        }

        const holdingsStore = useHoldingsStore.getState();
        const now = new Date().toISOString();

        // Step 2: Find or create a Holding for this ticker
        const tickerUpper = parsed.ticker.toUpperCase();
        let holding = holdingsStore.holdings.find(
            h => h.type === 'stock' && h.ticker?.toUpperCase() === tickerUpper
        );

        let holdingId: string;

        if (!holding) {
            // Auto-create a skeleton stock holding from SMS data
            holdingId = generateId();
            const newHolding = {
                id: holdingId,
                type: 'stock' as const,
                name: tickerUpper,             // User can rename from the holding detail screen
                ticker: tickerUpper,
                quantity: parsed.action === 'buy' ? parsed.quantity : 0,
                avg_buy_price: parsed.price,
                current_price: parsed.price,   // Best estimate at time of SMS
                buy_date: parsed.date || now,
                source: 'sms',
                price_updated_at: now,
                updated_at: now,
                notes: `Auto-created from SMS — ${parsed.exchange}`,
            };
            await holdingsStore.addHolding(newHolding as any);
            console.log(`[investmentSmsHandler] Auto-created Holding for ticker ${tickerUpper} → id: ${holdingId}`);
        } else {
            holdingId = holding.id;
            // Step 3: Update quantity and avg_buy_price in store
            if (parsed.action === 'buy') {
                const prevQty = holding.quantity;
                const prevAvg = holding.avg_buy_price;
                const newQty = prevQty + parsed.quantity;
                // Weighted average cost basis
                const newAvg = newQty > 0
                    ? (prevQty * prevAvg + parsed.quantity * parsed.price) / newQty
                    : parsed.price;

                await holdingsStore.updateHolding({
                    ...holding,
                    quantity: newQty,
                    avg_buy_price: newAvg,
                    current_price: parsed.price,   // Update current price too
                    price_updated_at: now,
                    updated_at: now,
                });
            } else {
                // SELL — reduce quantity, keep cost basis unchanged
                const remainingQty = Math.max(0, holding.quantity - parsed.quantity);
                await holdingsStore.updateHolding({
                    ...holding,
                    quantity: remainingQty,
                    current_price: parsed.price,
                    price_updated_at: now,
                    updated_at: now,
                });
            }
        }

        // Step 4: Write investment_transaction row
        await saveInvestmentTxToDB({
            id: generateId(),
            holding_id: holdingId,
            holding_type: 'stock',
            event_type: parsed.action === 'buy' ? 'buy' : 'sell',
            amount: parsed.total,
            price: parsed.price,
            quantity: parsed.quantity,
            event_date: parsed.date || now,
            source: 'sms',
            sms_id: smsId,
            notes: `${parsed.action.toUpperCase()} ${parsed.quantity} × ${tickerUpper} @ ₹${parsed.price} on ${parsed.exchange}`,
            is_deleted: 0 as any,
            updated_at: now,
            created_at: now,
        });

        // Seed price snapshot for sparkline
        const { savePriceSnapshotToDB } = require('@/db/repository/priceSnapshotRepository');
        const snapshotId = `snapshot_${holdingId}_${now.split('T')[0]}_sms`;
        try {
            await savePriceSnapshotToDB({
                id: snapshotId,
                holding_id: holdingId,
                price: parsed.price,
                recorded_at: now,
                source: 'sms',
                created_at: now
            });
        } catch (e) {
            // ignore if duplicate for the same day
        }

        // Step 5: Refresh store so Holdings tab reflects the change
        await holdingsStore.fetchHoldings();

        console.log(
            `[investmentSmsHandler] Stock ${parsed.action} recorded — ` +
            `${parsed.quantity} × ${tickerUpper} @ ₹${parsed.price} (holdingId: ${holdingId})`
        );

        return { status: 'success', holdingId };
    } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.error('[investmentSmsHandler] handleStockBuySMS failed:', reason);
        return { status: 'error', reason };
    }
};

