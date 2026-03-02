import { create } from 'zustand';
import { SIPPlan } from '@/types';
import {
    fetchSIPsFromDB,
    saveSIPToDB,
    updateSIPInDB,
    deleteSIPFromDB,
} from '@/db/repository/sipRepository';

interface SIPStore {
    sips: SIPPlan[];
    isLoading: boolean;
    error: string | null;
    lastUpdated: number | null;

    fetchSIPs: () => Promise<void>;
    addSIP: (sip: SIPPlan) => Promise<SIPPlan>;
    updateSIP: (sip: SIPPlan) => Promise<SIPPlan>;
    removeSIP: (id: string) => Promise<void>;

    getTotalInvested: () => number;
    getMonthlyInvestment: () => number;
    getCurrentValue: () => number;
    getReturns: () => number;
    getXIRR: () => number;
}

export const useSIPStore = create<SIPStore>((set, get) => ({
    sips: [],
    isLoading: false,
    error: null,
    lastUpdated: null,

    fetchSIPs: async () => {
        set({ isLoading: true });
        try {
            const sips = await fetchSIPsFromDB();
            set({ sips, isLoading: false, lastUpdated: Date.now() });
        } catch (error) {
            console.error('Fetch SIPs error:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to fetch SIPs', isLoading: false });
        }
    },

    addSIP: async (sip: SIPPlan) => {
        const newSIP = { ...sip, id: sip.id || new Date().toISOString() };
        await saveSIPToDB(newSIP);

        const currentSIPs = [...get().sips];
        set({ sips: [newSIP, ...currentSIPs], lastUpdated: Date.now() });

        return newSIP;
    },

    updateSIP: async (sip: SIPPlan) => {
        const updatedSIP = await updateSIPInDB(sip);

        const updatedSIPs = get().sips.map(s =>
            s.id === sip.id ? updatedSIP : s
        );

        set({ sips: updatedSIPs, lastUpdated: Date.now() });
        return updatedSIP;
    },

    removeSIP: async (id: string) => {
        await deleteSIPFromDB(id);

        const filteredSIPs = get().sips.filter(s => s.id !== id);
        set({ sips: filteredSIPs, lastUpdated: Date.now() });
    },

    getTotalInvested: () => {
        return get().sips.reduce((sum, sip) => sum + sip.totalInvested, 0);
    },

    getMonthlyInvestment: () => {
        return get().sips.reduce((sum, sip) => {
            // Normalize to monthly
            let monthlyAmount = sip.amount;
            switch (sip.frequency) {
                case 'daily': monthlyAmount = sip.amount * 30; break;
                case 'weekly': monthlyAmount = sip.amount * 4.33; break;
                case 'quarterly': monthlyAmount = sip.amount / 3; break;
                case 'yearly': monthlyAmount = sip.amount / 12; break;
            }
            return sum + (sip.status === 'active' ? monthlyAmount : 0);
        }, 0);
    },

    getCurrentValue: () => {
        return get().sips.reduce((sum, sip) => {
            // If nav and units exist, current value is nav * units.
            // If lacking data, fallback to totalInvested to avoid dropping the portfolio value.
            if (sip.nav != null && sip.units != null && sip.nav > 0 && sip.units > 0) {
                return sum + (sip.nav * sip.units);
            }
            return sum + sip.totalInvested;
        }, 0);
    },

    getReturns: () => {
        const invested = get().getTotalInvested();
        const current = get().getCurrentValue();
        return current - invested;
    },

    getXIRR: () => {
        // TODO: Implement actual XIRR array calculation based on cashflows.
        // For right now, returning a mock / simple annualized return placeholder.
        const invested = get().getTotalInvested();
        const current = get().getCurrentValue();
        if (invested === 0) return 0;

        return ((current - invested) / invested) * 100; // simple absolute return % for now
    },
}));
