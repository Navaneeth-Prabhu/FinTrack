// src/screens/transaction/hooks/useTransactionSections.ts
import { useMemo } from 'react';
import { Transaction, RecurringTransaction } from '@/types';
import { format, add, isAfter, isBefore, startOfDay, compareAsc, parseISO, addDays } from 'date-fns';

interface Section {
    title: string;
    data: Transaction[];
    totalIncome: number;
    totalExpense: number;
    isUpcoming?: boolean;
}

export const groupTransactionsByDate = (transactions: Transaction[]): Section[] => {
    const grouped = transactions.reduce((acc, transaction) => {
        const transactionDate = parseISO(transaction.date);
        const now = new Date();
        const isCurrentYear = transactionDate.getFullYear() === now.getFullYear();
        const dateKey = format(transactionDate, 'yyyy-MM-dd');
        const displayDate = isCurrentYear
            ? format(transactionDate, 'MMM d') // "February 24"
            : format(transactionDate, 'd MMM yyyy'); // "24 Feb 2025"

        if (!acc[dateKey]) {
            acc[dateKey] = {
                data: [],
                totalIncome: 0,
                totalExpense: 0,
                isUpcoming: false,
                title: displayDate,
            };
        }

        acc[dateKey].data.push(transaction);

        if (transaction.type === 'income') {
            acc[dateKey].totalIncome += transaction.amount;
        } else if (transaction.type === 'expense') {
            acc[dateKey].totalExpense += transaction.amount;
        }

        return acc;
    }, {} as Record<string, { data: Transaction[]; totalIncome: number; totalExpense: number; isUpcoming: boolean; title: string }>);

    return Object.keys(grouped)
        .map(dateKey => ({
            title: grouped[dateKey].title,
            data: grouped[dateKey].data.sort((a, b) => b.date.localeCompare(a.date)), // Latest first within section
            totalIncome: grouped[dateKey].totalIncome,
            totalExpense: grouped[dateKey].totalExpense,
            isUpcoming: grouped[dateKey].isUpcoming,
        }))
        .sort((a, b) => compareAsc(parseISO(b.data[0].date), parseISO(a.data[0].date))); // Newest section first
};

export const useTransactionSections = (
    transactions: Transaction[],
    recurringTransactions?: RecurringTransaction[],
    daysLimit?: number // Optional parameter for upcoming limit
) => {
    const sections = useMemo(() => {
        const now = startOfDay(new Date());
        const limitDate = daysLimit !== undefined ? addDays(now, daysLimit) : null; // No limit if unspecified
        const upcomingTransactions: Transaction[] = [];

        // Generate next upcoming transaction for each recurring transaction
        if (recurringTransactions) {
            recurringTransactions.forEach(rt => {
                if (!rt.isActive) return;

                let currentDate = rt.lastGeneratedDate
                    ? add(new Date(rt.lastGeneratedDate), {
                        days: rt.frequency === 'daily' ? rt.interval : 0,
                        weeks: rt.frequency === 'weekly' ? rt.interval : 0,
                        months: rt.frequency === 'monthly' ? rt.interval : 0,
                        years: rt.frequency === 'yearly' ? rt.interval : 0,
                    })
                    : new Date(rt.startDate);
                const endDate = rt.endDate ? new Date(rt.endDate) : null;
                const time = rt.time || '00:00';

                // Find the next instance after now
                while ((!endDate || isBefore(currentDate, endDate)) && isBefore(currentDate, now)) {
                    currentDate = add(currentDate, {
                        days: rt.frequency === 'daily' ? rt.interval : 0,
                        weeks: rt.frequency === 'weekly' ? rt.interval : 0,
                        months: rt.frequency === 'monthly' ? rt.interval : 0,
                        years: rt.frequency === 'yearly' ? rt.interval : 0,
                    });
                }

                const dateWithTime = new Date(currentDate);
                const [hours, minutes] = time.split(':');
                dateWithTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

                if (isAfter(dateWithTime, now) && (!limitDate || isBefore(dateWithTime, limitDate))) {
                    upcomingTransactions.push({
                        id: `${rt.id}-${dateWithTime.toISOString()}`,
                        amount: rt.amount,
                        type: rt.type,
                        category: transactions.find(t => t.category.id === rt.categoryId)?.category || {
                            id: rt.categoryId,
                            name: 'Unknown',
                        },
                        date: dateWithTime.toISOString(),
                        paidTo: rt.type === 'expense' ? rt.payee : undefined,
                        paidBy: rt.type === 'income' ? rt.payee : undefined,
                        mode: rt.mode || 'auto',
                        createdAt: now.toISOString(),
                        lastModified: now.toISOString(),
                        source: { type: 'auto' },
                        note: rt.description,
                        recurringId: rt.id,
                    });
                }
            });
        }

        // Group all completed transactions (no date filter)
        const completedSections = groupTransactionsByDate(transactions);

        // Add "Upcoming" section if there are upcoming transactions
        const allSections = completedSections;
        if (upcomingTransactions.length > 0) {
            allSections.unshift({
                title: 'Upcoming',
                data: upcomingTransactions.sort((a, b) => a.date.localeCompare(b.date)), // Earliest upcoming first
                totalIncome: upcomingTransactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0),
                totalExpense: upcomingTransactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0),
                isUpcoming: true,
            });
        }

        return allSections;
    }, [transactions, recurringTransactions, daysLimit]);

    const totals = useMemo(() => ({
        income: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    }), [transactions]);

    return { sections, totals };
};