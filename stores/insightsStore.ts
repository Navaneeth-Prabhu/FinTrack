import { create } from 'zustand';
import { Insight, generateInsights } from '@/services/insightsEngine';
import { fetchTransactionsFromDB } from '@/db/repository/transactionRepository';
import { fetchLoansFromDB } from '@/db/repository/loanRepository';

interface InsightsState {
    insights: Insight[];
    isLoading: boolean;
    error: string | null;
    fetchInsights: () => Promise<void>;
}

export const useInsightsStore = create<InsightsState>((set) => ({
    insights: [],
    isLoading: true,
    error: null,

    fetchInsights: async () => {
        try {
            set({ isLoading: true, error: null });

            // Fetch substantial history (last ~300 transactions is enough for M-o-M comparison)
            const [transactions, loans] = await Promise.all([
                fetchTransactionsFromDB(300, 0),
                fetchLoansFromDB()
            ]);

            const generated = generateInsights(transactions, loans);
            set({ insights: generated, isLoading: false });
        } catch (error) {
            console.error('[Insights] Failed to generate:', error);
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Unknown error generating insights',
            });
        }
    }
}));
