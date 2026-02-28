import { create } from 'zustand';
import { Account } from '@/types';
import {
    fetchAccountsFromDB,
    saveAccountToDB,
    updateAccountInDB,
    deleteAccountFromDB,
    updateAccountBalance
} from '@/db/repository/accountRepository';

interface AccountState {
    accounts: Account[];
    isLoading: boolean;
    error: string | null;

    fetchAccounts: () => Promise<void>;
    addAccount: (account: Account) => Promise<Account>;
    editAccount: (account: Account) => Promise<Account>;
    removeAccount: (id: string) => Promise<void>;
    adjustBalance: (id: string, amountChange: number) => Promise<void>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
    accounts: [],
    isLoading: false,
    error: null,

    fetchAccounts: async () => {
        try {
            set({ isLoading: true, error: null });
            const accounts = await fetchAccountsFromDB();
            set({ accounts, isLoading: false });
        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to fetch accounts'
            });
        }
    },

    addAccount: async (account: Account) => {
        try {
            const FinalAccount = { ...account, lastModified: account.lastModified || new Date().toISOString() };
            await saveAccountToDB(FinalAccount);
            set(state => ({
                accounts: [...state.accounts, FinalAccount]
            }));
            return FinalAccount;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to add account'
            });
            throw error;
        }
    },

    editAccount: async (account: Account) => {
        try {
            const FinalAccount = { ...account, lastModified: new Date().toISOString() };
            await updateAccountInDB(FinalAccount);
            set(state => ({
                accounts: state.accounts.map(a => a.id === FinalAccount.id ? FinalAccount : a)
            }));
            return FinalAccount;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update account'
            });
            throw error;
        }
    },

    removeAccount: async (id: string) => {
        try {
            await deleteAccountFromDB(id);
            set(state => ({
                accounts: state.accounts.filter(a => a.id !== id)
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to remove account'
            });
            throw error;
        }
    },

    adjustBalance: async (id: string, amountChange: number) => {
        try {
            await updateAccountBalance(id, amountChange);
            const now = new Date().toISOString();
            set(state => ({
                accounts: state.accounts.map(a =>
                    a.id === id ? { ...a, balance: a.balance + amountChange, lastModified: now } : a
                )
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to adjust account balance'
            });
            throw error;
        }
    }
}));
