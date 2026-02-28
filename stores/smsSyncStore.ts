import { create } from 'zustand';

interface SmsSyncState {
    isSyncing: boolean;
    totalMessages: number;
    currentProgress: number;
    statusMessage: string;

    startSync: (total: number, message?: string) => void;
    updateProgress: (current: number, message?: string) => void;
    endSync: () => void;
}

export const useSmsSyncStore = create<SmsSyncState>((set) => ({
    isSyncing: false,
    totalMessages: 0,
    currentProgress: 0,
    statusMessage: '',

    startSync: (total, message = 'Preparing SMS Sync...') => {
        // Show modal for ANY batch — even 1 message, to give user feedback
        const shouldShow = total > 0;
        set({
            isSyncing: shouldShow,
            totalMessages: total,
            currentProgress: 0,
            statusMessage: message,
        });
    },

    updateProgress: (current, message) => {
        set((state) => ({
            currentProgress: current,
            statusMessage: message ?? state.statusMessage,
        }));
    },

    endSync: () => {
        set({
            isSyncing: false,
            totalMessages: 0,
            currentProgress: 0,
            statusMessage: '',
        });
    },
}));
