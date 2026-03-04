import { create } from 'zustand';
import { Holding, InvestmentTransaction } from '@/types';
import {
    fetchHoldingsFromDB,
    saveHoldingToDB,
    updateHoldingInDB,
    deleteHoldingFromDB,
} from '@/db/repository/holdingsRepository';
import { useInvestmentTxStore } from './investmentTxStore';
import { amfiNavService } from '@/services/amfiNavService';

// Simple ID generator for local SQLite inserts
const generateId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

interface HoldingsStore {
    holdings: Holding[];
    isLoading: boolean;
    error: string | null;
    lastUpdated: number | null;

    fetchHoldings: () => Promise<void>;
    addHolding: (holding: Holding) => Promise<Holding>;
    updateHolding: (holding: Holding) => Promise<Holding>;
    removeHolding: (id: string) => Promise<void>;
    recordPriceUpdate: (holdingId: string, newPrice: number) => Promise<void>;
    fetchLatestPrices: () => Promise<void>;

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
        set(state => ({
            holdings: state.holdings.filter(h => h.id !== id),
            lastUpdated: Date.now()
        }));
    },

    recordPriceUpdate: async (holdingId: string, newPrice: number) => {
        const holding = get().holdings.find(h => h.id === holdingId);
        if (!holding) throw new Error('Holding not found');

        const now = new Date().toISOString();

        // 1. Create Transaction (Price Update)
        const tx: InvestmentTransaction = {
            id: generateId(),
            holding_id: holdingId,
            holding_type: holding.type,
            event_type: 'price_update',
            amount: 0,
            price: newPrice,
            event_date: now,
            updated_at: now,
            created_at: now,
        };

        await useInvestmentTxStore.getState().addTransaction(tx);

        // 2. Update Holding Current Price and Value
        const updatedHolding = {
            ...holding,
            current_price: newPrice,
            current_value: newPrice * holding.quantity,
            price_updated_at: now,
            updated_at: now,
        };

        await get().updateHolding(updatedHolding);
    },

    getTotalInvested: () => {
        return get().holdings.reduce((sum, h) => sum + (h.invested_amount || 0), 0);
    },

    getCurrentValue: () => {
        return get().holdings.reduce((sum, h) => sum + (h.current_value || h.invested_amount || 0), 0);
    },

    getReturns: () => {
        const invested = get().getTotalInvested();
        const current = get().getCurrentValue();
        return current - invested;
    },

    fetchLatestPrices: async () => {
        const holdings = get().holdings;
        let updatedCount = 0;

        for (const holding of holdings) {
            // We assume ticker acts as the Scheme Code for mutual funds.
            // If the user enters a valid 6-digit number, it could be an AMFI code.
            if (holding.ticker && /^\d{6}$/.test(holding.ticker)) {
                try {
                    const navData = await amfiNavService.getNavBySchemeCode(holding.ticker);
                    if (navData && navData.netAssetValue !== holding.current_price) {
                        await get().recordPriceUpdate(holding.id, navData.netAssetValue);
                        updatedCount++;
                    }
                } catch (e) {
                    console.error(`Failed to fetch NAV for holding ${holding.ticker}`, e);
                }
            }
        }

        if (updatedCount > 0) {
            console.log(`Auto-updated NAVs for ${updatedCount} Holdings.`);
        }
    },
}));
