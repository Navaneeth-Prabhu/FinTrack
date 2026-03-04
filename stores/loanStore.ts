import { create } from 'zustand';
import { Loan, InvestmentTransaction } from '@/types';
import {
    fetchLoansFromDB,
    saveLoanToDB,
    updateLoanInDB,
    deleteLoanFromDB,
} from '@/db/repository/loanRepository';
import { useInvestmentTxStore } from './investmentTxStore';

// Simple ID generator for local SQLite inserts
const generateId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

interface LoanStore {
    loans: Loan[];
    isLoading: boolean;
    error: string | null;
    lastUpdated: number | null;

    fetchLoans: () => Promise<void>;
    addLoan: (loan: Loan) => Promise<Loan>;
    updateLoan: (loan: Loan) => Promise<Loan>;
    removeLoan: (id: string) => Promise<void>;
    recordPayment: (loanId: string, amount: number) => Promise<void>;

    getTotalOutstanding: () => number;
    getTotalEMI: () => number;
}

export const useLoanStore = create<LoanStore>((set, get) => ({
    loans: [],
    isLoading: false,
    error: null,
    lastUpdated: null,

    fetchLoans: async () => {
        set({ isLoading: true });
        try {
            const loans = await fetchLoansFromDB();
            set({ loans, isLoading: false, lastUpdated: Date.now() });
        } catch (error) {
            console.error('Fetch Loans error:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to fetch Loans', isLoading: false });
        }
    },

    addLoan: async (loan: Loan) => {
        const newLoan = { ...loan, id: loan.id || new Date().toISOString() };
        await saveLoanToDB(newLoan);

        const currentLoans = [...get().loans];
        set({ loans: [newLoan, ...currentLoans], lastUpdated: Date.now() });

        return newLoan;
    },

    updateLoan: async (loan: Loan) => {
        const updatedLoan = await updateLoanInDB(loan);

        const updatedLoans = get().loans.map(l =>
            l.id === loan.id ? updatedLoan : l
        );

        set({ loans: updatedLoans, lastUpdated: Date.now() });
        return updatedLoan;
    },

    removeLoan: async (id: string) => {
        await deleteLoanFromDB(id);

        const filteredLoans = get().loans.filter(l => l.id !== id);
        set({ loans: filteredLoans, lastUpdated: Date.now() });
    },

    recordPayment: async (loanId: string, amount: number) => {
        const loan = get().loans.find(l => l.id === loanId);
        if (!loan) throw new Error('Loan not found');

        const now = new Date().toISOString();

        // 1. Create Transaction
        const tx: InvestmentTransaction = {
            id: generateId(),
            holding_id: loanId,
            holding_type: 'other', // loan isn't explicitly in holding_type strictly
            event_type: 'payment',
            amount: amount,
            event_date: now,
            updated_at: now,
            created_at: now,
        };

        await useInvestmentTxStore.getState().addTransaction(tx);

        // 2. Update Loan Outstanding
        // Prevent outstanding from dropping below 0
        const newOutstanding = Math.max(0, loan.outstanding - amount);
        const updatedLoan: Loan = {
            ...loan,
            outstanding: newOutstanding,
            status: newOutstanding === 0 ? 'closed' : loan.status,
            lastModified: now,
        };

        await get().updateLoan(updatedLoan);
    },

    getTotalOutstanding: () => {
        return get().loans
            .filter(l => l.status === 'active')
            .reduce((sum, loan) => sum + loan.outstanding, 0);
    },

    getTotalEMI: () => {
        return get().loans
            .filter(l => l.status === 'active')
            .reduce((sum, loan) => sum + loan.emiAmount, 0);
    },
}));
