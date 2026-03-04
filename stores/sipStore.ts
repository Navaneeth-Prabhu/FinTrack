import { create } from 'zustand';
import { SIPPlan, InvestmentTransaction } from '@/types';
import {
    fetchSIPsFromDB,
    saveSIPToDB,
    updateSIPInDB,
    deleteSIPFromDB,
} from '@/db/repository/sipRepository';
import { useInvestmentTxStore } from './investmentTxStore';
import { amfiNavService } from '@/services/amfiNavService';

// Simple ID generator for local SQLite inserts
const generateId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

interface SIPStore {
    sips: SIPPlan[];
    isLoading: boolean;
    error: string | null;
    lastUpdated: number | null;

    fetchSIPs: () => Promise<void>;
    addSIP: (sip: SIPPlan) => Promise<SIPPlan>;
    updateSIP: (sip: SIPPlan) => Promise<SIPPlan>;
    removeSIP: (id: string) => Promise<void>;
    recordAllotment: (sipId: string, amount: number, nav?: number, units?: number) => Promise<void>;
    fetchLatestPrices: () => Promise<void>;

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

    recordAllotment: async (sipId: string, amount: number, nav?: number, units?: number) => {
        const sip = get().sips.find(s => s.id === sipId);
        if (!sip) throw new Error('SIP not found');

        const now = new Date().toISOString();

        // 1. Create Transaction
        const tx: InvestmentTransaction = {
            id: generateId(),
            holding_id: sipId,
            holding_type: 'sip',
            event_type: 'allotment',
            amount: amount,
            nav: nav,
            units: units,
            event_date: now,
            updated_at: now,
            created_at: now,
        };

        await useInvestmentTxStore.getState().addTransaction(tx);

        // 2. Update SIP Totals
        const updatedSIP = {
            ...sip,
            totalInvested: sip.totalInvested + amount,
            units: (sip.units || 0) + (units || 0),
            nav: nav || sip.nav,
            lastModified: now,
            priceUpdatedAt: nav ? now : sip.priceUpdatedAt,
        };

        await get().updateSIP(updatedSIP);
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
            return sum + (sip.currentValue || (sip.nav != null && sip.units != null ? sip.nav * sip.units : sip.totalInvested));
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

    fetchLatestPrices: async () => {
        const sips = get().sips;
        let updatedCount = 0;

        for (const sip of sips) {
            if (sip.schemeCode) {
                try {
                    const navData = await amfiNavService.getNavBySchemeCode(sip.schemeCode);
                    if (navData && navData.netAssetValue !== sip.nav) {
                        const now = new Date().toISOString();

                        // 1. Record a price update transaction
                        const tx: InvestmentTransaction = {
                            id: generateId(),
                            holding_id: sip.id,
                            holding_type: 'sip',
                            event_type: 'price_update',
                            amount: 0,
                            price: navData.netAssetValue,
                            event_date: now,
                            updated_at: now,
                            created_at: now,
                            source: 'amfi_auto_fetch'
                        };
                        await useInvestmentTxStore.getState().addTransaction(tx);

                        // 2. Update SIP NAV and implicitly Current Value
                        const updatedSIP = {
                            ...sip,
                            nav: navData.netAssetValue,
                            priceUpdatedAt: now,
                            lastModified: now,
                        };
                        await get().updateSIP(updatedSIP);
                        updatedCount++;
                    }
                } catch (e) {
                    console.error(`Failed to fetch NAV for scheme ${sip.schemeCode}`, e);
                }
            }
        }

        if (updatedCount > 0) {
            console.log(`Auto-updated NAVs for ${updatedCount} SIPs.`);
        }
    },
}));
