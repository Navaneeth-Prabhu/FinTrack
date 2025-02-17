import { useMemo } from 'react';
import { addDays, compareAsc, format, parseISO } from 'date-fns';
import { Transaction, RecurringTransaction } from '@/types';

interface Section {
    title: string;
    data: Transaction[];
    totalIncome: number;
    totalExpense: number;
    isUpcoming: boolean;
}


export const groupTransactionsByDate = (transactions: Transaction[]): Section[] => {
    const grouped = transactions.reduce((acc, transaction: any) => {
        const dateKey = transaction.isUpcoming ? 'upcoming' : format(parseISO(transaction.date), 'yyyy-MM-dd');

        if (!acc[dateKey]) {
            acc[dateKey] = {
                data: [],
                totalIncome: 0,
                totalExpense: 0,
                isUpcoming: transaction.isUpcoming
            };
        }

        acc[dateKey].data.push(transaction);

        if (transaction.type === 'income') {
            acc[dateKey].totalIncome += transaction.amount;
        } else if (transaction.type === 'expense') {
            acc[dateKey].totalExpense += transaction.amount;
        }

        return acc;
    }, {} as Record<string, Omit<Section, 'title'>>);

    return Object.keys(grouped)
        .sort((a, b) => {
            if (a === 'upcoming') return -1;
            if (b === 'upcoming') return 1;
            return compareAsc(parseISO(b), parseISO(a));
        })
        .map(date => ({
            title: date,
            ...grouped[date]
        }));
};


export const useTransactionSections = (
    transactions: Transaction[],
    recurringTransactions?: RecurringTransaction[]
) => {
    //   const upcomingTransactions = useMemo(() => {
    //     if (!recurringTransactions) return [];

    //     const today = new Date();
    //     const fiveDaysFromNow = addDays(today, 10);

    //     return recurringTransactions
    //       .filter(rt => {
    //         const nextDate = parseISO(rt.next_processing_date);
    //         return nextDate >= today && nextDate <= fiveDaysFromNow;
    //       })
    //       .map(rt => {
    //         const originalTransaction = transactions.find(t => t.id === rt.transaction_id);
    //         if (!originalTransaction) return null;

    //         return {
    //           ...originalTransaction,
    //           date: rt.next_processing_date,
    //           id: `upcoming-${rt.transaction_id}`,
    //           isUpcoming: true,
    //           frequency: rt.frequency
    //         };
    //       })
    //       .filter(Boolean);
    //   }, [recurringTransactions, transactions]);

    const sections = useMemo(() => {
        const allTransactions = [...transactions];
        return groupTransactionsByDate(allTransactions);
    }, [transactions]);

    const totals = useMemo(() => ({
        income: transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0),
        expense: transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0)
    }), [transactions]);

    return { sections, totals };
};