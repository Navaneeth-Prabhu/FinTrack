import { useMemo } from 'react';
import { useHoldingsStore } from '@/stores/holdingsStore';
import { useSIPStore } from '@/stores/sipStore';
import { useLoanStore } from '@/stores/loanStore';
import { useInvestmentTxStore } from '@/stores/investmentTxStore';
import { InvestmentTransaction } from '@/types';

export interface PortfolioSummary {
    totalInvested: number;
    currentValue: number;
    totalReturns: number;
    totalReturnsPercent: number;
    totalLoansOutstanding: number;
    netWorth: number; // currentValue - loansOutstanding
    assetAllocation: {
        mutualFunds: number;
        stocks: number;
        fixedIncome: number;
        gold: number;
        others: number;
    };
    recentTransactions: InvestmentTransaction[];
}

export function usePortfolioSummary(): PortfolioSummary {
    const { holdings } = useHoldingsStore();
    const { sips } = useSIPStore();
    const { loans } = useLoanStore();
    const { transactionsByHolding } = useInvestmentTxStore();

    return useMemo(() => {
        let totalInvested = 0;
        let currentValue = 0;

        const assetAllocation = {
            mutualFunds: 0,
            stocks: 0,
            fixedIncome: 0,
            gold: 0,
            others: 0,
        };

        // 1. Calculate from Holdings
        holdings.forEach(h => {
            const invested = h.invested_amount || 0;
            const current = h.current_value || invested;

            totalInvested += invested;
            currentValue += current;

            // Simple allocation logic based on type string matching
            const typeLower = h.type.toLowerCase();
            if (typeLower === 'stock') {
                assetAllocation.stocks += current;
            } else if (typeLower.includes('mutual') || typeLower.includes('mf')) {
                assetAllocation.mutualFunds += current;
            } else if (typeLower === 'fd' || typeLower === 'bond' || typeLower === 'ppf' || typeLower === 'nps') {
                assetAllocation.fixedIncome += current;
            } else if (typeLower === 'gold') {
                assetAllocation.gold += current;
            } else {
                assetAllocation.others += current;
            }
        });

        // 2. Calculate from SIPs
        sips.forEach(s => {
            const invested = s.totalInvested || 0;
            const current = s.currentValue || invested;

            totalInvested += invested;
            currentValue += current;

            // Assuming SIPs are mostly Mutual Funds
            assetAllocation.mutualFunds += current;
        });

        // 3. Calculate Returns
        const totalReturns = currentValue - totalInvested;
        const totalReturnsPercent = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

        // 4. Calculate Loans
        const totalLoansOutstanding = loans.reduce((acc, l) => acc + (l.outstanding || 0), 0);

        // 5. Net Worth
        const netWorth = currentValue - totalLoansOutstanding;

        // 6. Recent Transactions (last 5)
        // Note: investmentTxStore stores transactions keyed by holdingId.
        // We need to flatten them and sort by date.
        const allTxs = Object.values(transactionsByHolding).flat() as InvestmentTransaction[];
        const recentTransactions = allTxs
            .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
            .slice(0, 5);

        return {
            totalInvested,
            currentValue,
            totalReturns,
            totalReturnsPercent,
            totalLoansOutstanding,
            netWorth,
            assetAllocation,
            recentTransactions
        };
    }, [holdings, sips, loans, transactionsByHolding]);
}
