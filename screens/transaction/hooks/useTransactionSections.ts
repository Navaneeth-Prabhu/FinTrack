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
// Note: date-fns and Intl are expensive in loops.
// We use a module-level cache to remember exactly how an ISO string maps to its key and label.
// Since transaction timestamps rarely change, this O(1) cache takes parsing time to near zero.
const dateCache = new Map<string, { key: string; label: string }>();

function getDateKeyAndLabel(isoDate: string): { key: string; label: string } {
    if (dateCache.has(isoDate)) {
        return dateCache.get(isoDate)!;
    }

    const date = new Date(isoDate);

    // Get local date parts padded to 2 digits
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const key = `${year}-${month}-${day}`;

    // Label logic using local date
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[date.getMonth()];
    const dayNum = date.getDate();
    const currentYear = new Date().getFullYear().toString();

    const label = year === currentYear
        ? `${monthName} ${dayNum}`          // "Feb 19"
        : `${dayNum} ${monthName} ${year}`; // "19 Feb 2024"

    const result = { key, label };
    dateCache.set(isoDate, result);
    return result;
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

    // Sort YYYY-MM-DD keys descending (native string comparison is vastly faster than parseISO)
    return Object.keys(grouped)
        .sort((a, b) => b.localeCompare(a))
        .map(key => ({
            title: grouped[key].title,
            data: grouped[key].data.sort((a, b) => b.date.localeCompare(a.date)),
            totalIncome: grouped[key].totalIncome,
            totalExpense: grouped[key].totalExpense,
            isUpcoming: false,
        }));
};

export const useTransactionSections = (
    transactions: Transaction[],
    recurringTransactions?: RecurringTransaction[],
    daysLimit?: number,
) => {
    // Stable "now" reference that only changes if the actual calendar day changes
    const todayStr = new Date().toDateString();

    const upcomingSection = useMemo(() => {
        if (!recurringTransactions || recurringTransactions.length === 0) return null;

        const now = startOfDay(new Date(todayStr));
        const limitDate = daysLimit !== undefined ? addDays(now, daysLimit) : null;
        const upcomingTransactions: Transaction[] = [];

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

        if (upcomingTransactions.length > 0) {
            return {
                title: 'Upcoming',
                data: upcomingTransactions.sort((a, b) => a.date.localeCompare(b.date)),
                totalIncome: upcomingTransactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0),
                totalExpense: upcomingTransactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0),
                isUpcoming: true,
            };
        }
        return null;
    }, [recurringTransactions, daysLimit]);

    const completedSections = useMemo(() => {
        return groupTransactionsByDate(transactions);
    }, [transactions]);

    const sections = useMemo(() => {
        const combined = [...completedSections];
        if (upcomingSection) {
            combined.unshift(upcomingSection);
        }
        return combined;
    }, [completedSections, upcomingSection]);

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