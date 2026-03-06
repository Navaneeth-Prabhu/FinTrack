import { useEffect, useMemo, useState } from 'react';
import { useInvestmentTxStore } from '@/stores/investmentTxStore';
import { fetchPriceSnapshotsByHoldingIdFromDB } from '@/db/repository/priceSnapshotRepository';
import { calculateXIRRValue } from '@/utils/investmentCalculations';
import { PriceSnapshot } from '@/types';

/**
 * useHoldingXIRR
 *
 * Fetches investment transactions and price snapshots for a holding,
 * then computes:
 *   - XIRR: Extended IRR using all buy/allotment cashflows + current value as exit
 *   - priceHistory: sorted array of { date, price } for sparkline rendering
 *
 * The XIRR requires at least 2 cashflows to be meaningful.
 * If < 2 transactions exist, xirr returns null.
 *
 * @param holdingId     ID of the Holding to analyse (SIP, Stock, etc.)
 * @param currentValue  The most recent portfolio value (used as the exit cashflow)
 */
export function useHoldingXIRR(holdingId: string, currentValue: number) {
    const { transactionsByHolding, fetchTransactions } = useInvestmentTxStore();
    const txs = transactionsByHolding[holdingId] ?? [];

    const [priceHistory, setPriceHistory] = useState<PriceSnapshot[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch txs and price snapshots on mount
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            await fetchTransactions(holdingId);
            const snapshots = await fetchPriceSnapshotsByHoldingIdFromDB(holdingId);
            if (!cancelled) {
                setPriceHistory(snapshots);
                setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [holdingId]);

    /**
     * Build XIRR cashflow array:
     *   - BUY / ALLOTMENT events → negative cashflow (cash out)
     *   - SELL events → positive cashflow (cash in)
     *   - Current value today → positive cashflow (notional exit)
     *
     * xirr expects: [{ amount: -investment, date }, ..., { amount: currentValue, date: today }]
     */
    const xirr = useMemo(() => {
        if (txs.length === 0 || currentValue <= 0) return null;

        const flows: { amount: number; date: Date }[] = [];

        for (const tx of txs) {
            if (!tx.event_date) continue;
            const d = new Date(tx.event_date);
            if (isNaN(d.getTime())) continue;

            if (tx.event_type === 'buy' || tx.event_type === 'allotment' || tx.event_type === 'payment') {
                flows.push({ amount: -(tx.amount ?? 0), date: d });
            } else if (tx.event_type === 'sell') {
                flows.push({ amount: tx.amount ?? 0, date: d });
            }
        }

        if (flows.length < 1) return null;

        // Add current market value as the notional exit today
        flows.push({ amount: currentValue, date: new Date() });

        // xirr needs at least one negative and one positive flow
        const hasNegative = flows.some(f => f.amount < 0);
        const hasPositive = flows.some(f => f.amount > 0);
        if (!hasNegative || !hasPositive) return null;

        const result = calculateXIRRValue(flows);
        // Guard against NaN, Infinity, or absurd values
        return isFinite(result) && Math.abs(result) < 500 ? result : null;
    }, [txs, currentValue]);

    return { xirr, priceHistory, loading };
}
