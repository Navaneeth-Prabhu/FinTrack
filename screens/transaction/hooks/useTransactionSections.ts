// src/screens/transaction/hooks/useTransactionSections.ts
import { useMemo } from 'react';
import { Transaction, RecurringTransaction } from '@/types';
import { add, isAfter, isBefore, startOfDay, compareAsc, parseISO, addDays } from 'date-fns';

interface Section {
    title: string;
    data: Transaction[];
    totalIncome: number;
    totalExpense: number;
    isUpcoming?: boolean;
}

// ─── Fast date key + display label ───────────────────────────────────────────
// Avoids expensive parseISO + format per transaction by using string slicing.
// ISO date strings are always "YYYY-MM-DDTHH:mm:ss..." so slicing is safe.
function getDateKeyAndLabel(isoDate: string): { key: string; label: string } {
    const key = isoDate.slice(0, 10); // "YYYY-MM-DD"
    const currentYear = new Date().getFullYear().toString();
    const year = key.slice(0, 4);
    const month = key.slice(5, 7);
    const day = key.slice(8, 10);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[parseInt(month, 10) - 1];
    const dayNum = parseInt(day, 10);

    const label = year === currentYear
        ? `${monthName} ${dayNum}`          // "Feb 19"
        : `${dayNum} ${monthName} ${year}`; // "19 Feb 2024"

    return { key, label };
}

export const groupTransactionsByDate = (transactions: Transaction[]): Section[] => {
    const grouped: Record<string, {
        data: Transaction[];
        totalIncome: number;
        totalExpense: number;
        title: string;
    }> = {};

    for (const transaction of transactions) {
        const { key, label } = getDateKeyAndLabel(transaction.date);

        if (!grouped[key]) {
            grouped[key] = { data: [], totalIncome: 0, totalExpense: 0, title: label };
        }

        grouped[key].data.push(transaction);

        if (transaction.type === 'income') {
            grouped[key].totalIncome += transaction.amount;
        } else if (transaction.type === 'expense') {
            grouped[key].totalExpense += transaction.amount;
        }
    }

    return Object.keys(grouped)
        .map(key => ({
            title: grouped[key].title,
            data: grouped[key].data.sort((a, b) => b.date.localeCompare(a.date)),
            totalIncome: grouped[key].totalIncome,
            totalExpense: grouped[key].totalExpense,
            isUpcoming: false,
        }))
        .sort((a, b) => compareAsc(parseISO(b.data[0].date), parseISO(a.data[0].date)));
};

export const useTransactionSections = (
    transactions: Transaction[],
    recurringTransactions?: RecurringTransaction[],
    daysLimit?: number,
) => {
    const sections = useMemo(() => {
        const now = startOfDay(new Date());
        const limitDate = daysLimit !== undefined ? addDays(now, daysLimit) : null;
        const upcomingTransactions: Transaction[] = [];

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
                dateWithTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

                if (isAfter(dateWithTime, now) && (!limitDate || isBefore(dateWithTime, limitDate))) {
                    upcomingTransactions.push({
                        id: `${rt.id}-${dateWithTime.toISOString()}`,
                        amount: rt.amount,
                        type: rt.type,
                        category: rt.category || { id: '', name: 'Unknown', icon: '', type: rt.type, color: '' },
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

        const completedSections = groupTransactionsByDate(transactions);

        if (upcomingTransactions.length > 0) {
            completedSections.unshift({
                title: 'Upcoming',
                data: upcomingTransactions.sort((a, b) => a.date.localeCompare(b.date)),
                totalIncome: upcomingTransactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0),
                totalExpense: upcomingTransactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0),
                isUpcoming: true,
            });
        }

        return completedSections;
    }, [transactions, recurringTransactions, daysLimit]);

    // Single-pass totals — avoids iterating transactions twice
    const totals = useMemo(() => {
        let income = 0;
        let expense = 0;
        for (const t of transactions) {
            if (t.type === 'income') income += t.amount;
            else if (t.type === 'expense') expense += t.amount;
        }
        return { income, expense };
    }, [transactions]);

    return { sections, totals };
};