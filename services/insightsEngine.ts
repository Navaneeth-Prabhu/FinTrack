import { Transaction, Loan } from '@/types';
import { isSameMonth, subMonths, addMonths, differenceInDays, setDate, isBefore, startOfDay } from 'date-fns';

export interface Insight {
    id: string;
    icon: string;
    title: string;
    subtitle: string;
    severity: 'info' | 'warning' | 'positive';
}

export const generateInsights = (transactions: Transaction[], loans: Loan[] = []): Insight[] => {
    const insights: Insight[] = [];
    const now = new Date();
    const today = startOfDay(now);

    // Helper: Filter to current month
    const thisMonthTxs = transactions.filter(t => isSameMonth(new Date(t.date), now));
    const lastMonthTxs = transactions.filter(t => isSameMonth(new Date(t.date), subMonths(now, 1)));

    // 1. Income vs Expense
    const thisMonthIncome = thisMonthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const thisMonthExpense = thisMonthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    if (thisMonthIncome > 0 || thisMonthExpense > 0) {
        const diff = thisMonthIncome - thisMonthExpense;
        insights.push({
            id: 'income-vs-expense',
            icon: diff >= 0 ? '✅' : '⚠️',
            title: diff >= 0 ? `You're saving ₹${diff.toLocaleString('en-IN')}` : `You spent ₹${Math.abs(diff).toLocaleString('en-IN')} more than you earned`,
            subtitle: 'This month so far',
            severity: diff >= 0 ? 'positive' : 'warning'
        });
    }

    // 2. Month-over-month spending
    const lastMonthExpense = lastMonthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    if (lastMonthExpense > 0 && thisMonthExpense > 0) {
        const percentChange = ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100;
        if (Math.abs(percentChange) > 5) { // Only show if more than 5% change
            insights.push({
                id: 'mom-spending',
                icon: percentChange > 0 ? '📈' : '📉',
                title: percentChange > 0 ? `Spending up ${Math.round(percentChange)}% vs last month` : `Spending down ${Math.round(Math.abs(percentChange))}% vs last month`,
                subtitle: `₹${thisMonthExpense.toLocaleString('en-IN')} vs ₹${lastMonthExpense.toLocaleString('en-IN')}`,
                severity: percentChange > 0 ? 'warning' : 'positive'
            });
        }
    }

    // 3. Top category
    const categoryTotals = thisMonthTxs
        .filter(t => t.type === 'expense' && t.category)
        .reduce((acc, t) => {
            const catName = t.category!.name;
            acc[catName] = (acc[catName] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    if (topCategory && topCategory[1] > 0) {
        insights.push({
            id: 'top-category',
            icon: '🛒',
            title: `${topCategory[0]} is your biggest expense`,
            subtitle: `₹${topCategory[1].toLocaleString('en-IN')} spent this month`,
            severity: 'info'
        });
    }

    // 4. Upcoming EMIs
    loans.filter(l => l.status === 'active').forEach(loan => {
        let emiDate = setDate(now, loan.emiDueDay);
        // If the day has already passed this month, consider next month
        if (isBefore(emiDate, today)) {
            emiDate = addMonths(emiDate, 1);
        }

        // If EMI date is within the next 7 days
        const diffDays = differenceInDays(emiDate, today);
        if (diffDays >= 0 && diffDays <= 7) {
            insights.push({
                id: `upcoming-emi-${loan.id}`,
                icon: '🔔',
                title: `EMI of ₹${loan.emiAmount.toLocaleString('en-IN')} due in ${diffDays === 0 ? 'today' : `${diffDays} days`}`,
                subtitle: loan.lender,
                severity: 'warning'
            });
        }
    });

    // 5. Highest single spend
    const highestSpend = [...thisMonthTxs]
        .filter(t => t.type === 'expense')
        .sort((a, b) => b.amount - a.amount)[0];

    if (highestSpend && highestSpend.amount > 0) {
        insights.push({
            id: 'highest-spend',
            icon: '💸',
            title: `Biggest spend: ₹${highestSpend.amount.toLocaleString('en-IN')}`,
            subtitle: `at ${highestSpend.paidTo || highestSpend.category?.name || 'Unknown'}`,
            severity: 'info'
        });
    }

    return insights;
};
