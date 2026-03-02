import { create } from 'zustand';
import { Holding } from '@/types';
import {
    fetchHoldingsFromDB,
    saveHoldingToDB,
    updateHoldingInDB,
    deleteHoldingFromDB,
} from '@/db/repository/holdingsRepository';

interface HoldingsStore {
    holdings: Holding[];
    isLoading: boolean;
    error: string | null;
    lastUpdated: number | null;

    fetchHoldings: () => Promise<void>;
    addHolding: (holding: Holding) => Promise<Holding>;
    updateHolding: (holding: Holding) => Promise<Holding>;
    removeHolding: (id: string) => Promise<void>;

    getTotalInvested: () => number;
    getCurrentValue: () => number;
    getReturns: () => number;
}

export const useHoldingsStore = create<HoldingsStore>((set, get) => ({
    holdings: [],
    isLoading: false,
    error: null,
    lastUpdated: null,

    fetchHoldings: async () => {
        set({ isLoading: true });
        try {
            const holdings = await fetchHoldingsFromDB();
            set({ holdings, isLoading: false, lastUpdated: Date.now() });
        } catch (error) {
            console.error('Fetch Holdings error:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to fetch holdings', isLoading: false });
        }
    },

    addHolding: async (holding: Holding) => {
        const newHolding = {
            ...holding,
            id: holding.id || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        await saveHoldingToDB(newHolding);

        const currentHoldings = [...get().holdings];
        set({ holdings: [newHolding, ...currentHoldings], lastUpdated: Date.now() });

        return newHolding;
    },

    updateHolding: async (holding: Holding) => {
        const updatedHolding = await updateHoldingInDB(holding);

        const updatedHoldings = get().holdings.map(h =>
            h.id === holding.id ? updatedHolding : h
        );

        set({ holdings: updatedHoldings, lastUpdated: Date.now() });
        return updatedHolding;
    },

    removeHolding: async (id: string) => {
        await deleteHoldingFromDB(id);

        const filteredHoldings = get().holdings.filter(h => h.id !== id);
        set({ holdings: filteredHoldings, lastUpdated: Date.now() });
    },

    getTotalInvested: () => {
        return get().holdings.reduce((sum, h) => {
            // For FDs, principal is stored in avg_buy_price. For stocks/gold, it's quantity * avg_buy_price.
            if (h.type === 'fd' || h.type === 'bond' || h.type === 'ppf' || h.type === 'nps') {
                return sum + h.avg_buy_price;
            }
            return sum + (h.quantity * h.avg_buy_price);
        }, 0);
    },

    getCurrentValue: () => {
        return get().holdings.reduce((sum, h) => {
            if (h.type === 'fd' || h.type === 'bond' || h.type === 'ppf' || h.type === 'nps') {
                return sum + (h.current_price || h.avg_buy_price); // fallback to invested if no maturation amount computed
            }
            return sum + (h.quantity * h.current_price);
        }, 0);
    },

    getReturns: () => {
        const invested = get().getTotalInvested();
        const current = get().getCurrentValue();
        return current - invested;
    },
}));
