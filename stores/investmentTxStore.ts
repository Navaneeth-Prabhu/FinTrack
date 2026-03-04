import { create } from 'zustand';
import { InvestmentTransaction } from '@/types';
import {
    fetchInvestmentTxsByHoldingId,
    saveInvestmentTxToDB,
    deleteInvestmentTxFromDB
} from '@/db/repository/investmentTxRepository';

interface InvestmentTxStore {
    transactionsByHolding: Record<string, InvestmentTransaction[]>;
    isLoading: boolean;
    error: string | null;

    fetchTransactions: (holdingId: string) => Promise<void>;
    addTransaction: (tx: InvestmentTransaction) => Promise<void>;
    deleteTransaction: (id: string, holdingId: string) => Promise<void>;
}

export const useInvestmentTxStore = create<InvestmentTxStore>((set, get) => ({
    transactionsByHolding: {},
    isLoading: false,
    error: null,

    fetchTransactions: async (holdingId: string) => {
        set({ isLoading: true });
        try {
            const txs = await fetchInvestmentTxsByHoldingId(holdingId);
            set(state => ({
                transactionsByHolding: {
                    ...state.transactionsByHolding,
                    [holdingId]: txs
                },
                isLoading: false
            }));
        } catch (error) {
            console.error('Fetch Investment Txs error:', error);
            set({ error: 'Failed to fetch transactions', isLoading: false });
        }
    },

    addTransaction: async (tx: InvestmentTransaction) => {
        await saveInvestmentTxToDB(tx);
        const holdingId = tx.holding_id;
        const currentTxs = get().transactionsByHolding[holdingId] || [];
        set(state => ({
            transactionsByHolding: {
                ...state.transactionsByHolding,
                [holdingId]: [tx, ...currentTxs].sort((a, b) =>
                    new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
                )
            }
        }));
    },

    deleteTransaction: async (id: string, holdingId: string) => {
        await deleteInvestmentTxFromDB(id);
        const currentTxs = get().transactionsByHolding[holdingId] || [];
        set(state => ({
            transactionsByHolding: {
                ...state.transactionsByHolding,
                [holdingId]: currentTxs.filter(tx => tx.id !== id)
            }
        }));
    }
}));
