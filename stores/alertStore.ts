// stores/alertStore.ts
// Zustand store for SMS alert management.
// Backed by SQLite via alertRepository.

import { create } from 'zustand';
import { SMSAlert } from '@/types';
import {
    fetchAlertsFromDB,
    insertAlertToDB,
    markAlertReadInDB,
    markAllAlertsReadInDB,
    deleteAlertFromDB,
} from '@/db/repository/alertRepository';

interface AlertStore {
    alerts: SMSAlert[];
    unreadCount: number;
    isLoading: boolean;

    fetchAlerts: () => Promise<void>;
    addAlert: (alert: Omit<SMSAlert, 'id' | 'createdAt' | 'isRead'>) => Promise<SMSAlert>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    deleteAlert: (id: string) => Promise<void>;
}

function countUnread(alerts: SMSAlert[]): number {
    return alerts.filter(a => !a.isRead).length;
}

export const useAlertStore = create<AlertStore>((set, get) => ({
    alerts: [],
    unreadCount: 0,
    isLoading: false,

    fetchAlerts: async () => {
        set({ isLoading: true });
        try {
            const alerts = await fetchAlertsFromDB();
            set({ alerts, unreadCount: countUnread(alerts), isLoading: false });
        } catch (err) {
            console.error('[AlertStore] fetchAlerts error:', err);
            set({ isLoading: false });
        }
    },

    addAlert: async (alertData) => {
        const newAlert = await insertAlertToDB(alertData);
        const alerts = [newAlert, ...get().alerts];
        set({ alerts, unreadCount: countUnread(alerts) });
        return newAlert;
    },

    markRead: async (id) => {
        await markAlertReadInDB(id);
        const alerts = get().alerts.map(a => a.id === id ? { ...a, isRead: true } : a);
        set({ alerts, unreadCount: countUnread(alerts) });
    },

    markAllRead: async () => {
        await markAllAlertsReadInDB();
        const alerts = get().alerts.map(a => ({ ...a, isRead: true }));
        set({ alerts, unreadCount: 0 });
    },

    deleteAlert: async (id) => {
        await deleteAlertFromDB(id);
        const alerts = get().alerts.filter(a => a.id !== id);
        set({ alerts, unreadCount: countUnread(alerts) });
    },
}));
