import { create } from 'zustand';
import { Loan } from '@/types';
import {
    fetchLoansFromDB,
    saveLoanToDB,
    updateLoanInDB,
    deleteLoanFromDB,
} from '@/db/repository/loanRepository';

interface LoanStore {
    loans: Loan[];
    isLoading: boolean;
    error: string | null;
    lastUpdated: number | null;

    fetchLoans: () => Promise<void>;
    addLoan: (loan: Loan) => Promise<Loan>;
    updateLoan: (loan: Loan) => Promise<Loan>;
    removeLoan: (id: string) => Promise<void>;

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
