import { Budget, Transaction } from "@/types";
import { getEndDateForFrequency } from "./date";

export const getBudgetPeriodDates = (budget: Budget, targetDate: Date = new Date()) => {
    const start = new Date(budget.startDate);
    let periodStart: Date;
    let periodEnd: Date;

    // Reset target date hours to start of day to ensure consistent comparison
    targetDate = new Date(targetDate.setHours(0, 0, 0, 0));

    switch (budget.frequency) {
        case 'daily':
            periodStart = new Date(targetDate);
            periodEnd = new Date(targetDate);
            periodEnd.setHours(23, 59, 59, 999);
            break;

        case 'weekly':
            const startDay = start.getDay();
            const targetDay = targetDate.getDay();
            const diff = targetDate.getDate() - targetDay + startDay;
            periodStart = new Date(targetDate);
            periodStart.setDate(diff);
            periodStart.setHours(0, 0, 0, 0);
            periodEnd = new Date(periodStart);
            periodEnd.setDate(periodEnd.getDate() + 6);
            periodEnd.setHours(23, 59, 59, 999);
            break;

        case 'monthly':
            periodStart = new Date(
                targetDate.getFullYear(),
                targetDate.getMonth(),
                start.getDate(),
                0, 0, 0, 0
            );
            periodEnd = new Date(periodStart);
            periodEnd.setMonth(periodEnd.getMonth() + 1);
            periodEnd.setDate(periodEnd.getDate() - 1);
            periodEnd.setHours(23, 59, 59, 999);
            break;

        case 'yearly':
            periodStart = new Date(
                targetDate.getFullYear(),
                start.getMonth(),
                start.getDate(),
                0, 0, 0, 0
            );
            periodEnd = new Date(periodStart);
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            periodEnd.setDate(periodEnd.getDate() - 1);
            periodEnd.setHours(23, 59, 59, 999);
            break;
    }

    return { periodStart, periodEnd };
};

export const isTransactionInBudgetPeriod = (
    transaction: Transaction,
    budget: Budget
): boolean => {
    const { periodStart, periodEnd } = getBudgetPeriodDates(budget, new Date(transaction.date));
    const transactionDate = new Date(transaction.date);

    // Reset transaction date hours to ensure consistent comparison
    transactionDate.setHours(0, 0, 0, 0);

    return (
        budget.category.id === transaction.category.id &&
        transaction.type === 'expense' &&
        transactionDate >= periodStart &&
        transactionDate <= periodEnd
    );
};

export const recalculateBudgetSpent = (
    budget: Budget,
    transactions: Transaction[]
): number => {
    const relevantTransactions = transactions.filter(t =>
        t.type === 'expense' &&
        t.category.id === budget.category.id &&
        isTransactionInBudgetPeriod(t, budget)
    );

    const total = relevantTransactions.reduce((sum, t) => sum + t.amount, 0);
    return Number(total.toFixed(2)); // Ensure we don't get floating point errors
};

export const adjustBudgetsForTransaction = (
    budgets: Budget[],
    transaction: Transaction,
    operation: 'add' | 'update' | 'remove',
    oldTransaction?: Transaction,
    allTransactions?: Transaction[]
): Budget[] => {
    if (transaction.type !== 'expense') return budgets;

    return budgets.map(budget => {
        // Always recalculate the total spent for the current period
        const currentTransactions = allTransactions || [];
        const transactionsToCalculate = operation === 'add'
            ? [...currentTransactions, transaction]
            : operation === 'remove'
                ? currentTransactions.filter(t => t.id !== transaction.id)
                : currentTransactions;

        const newSpent = recalculateBudgetSpent(budget, transactionsToCalculate);
        const progress = Number(((newSpent / budget.limit) * 100).toFixed(2));

        return { ...budget, spent: newSpent, progress };
    });
};

export const adjustBudgetsForBulkTransactions = (
    budgets: Budget[],
    transactions: Transaction[],
    operation: 'add' | 'remove' | 'update',
    oldTransactions?: Transaction[],
    allTransactions?: Transaction[]
): Budget[] => {
    if (!transactions.some(t => t.type === 'expense')) return budgets;

    return budgets.map(budget => {
        const currentTransactions = allTransactions || [];
        let transactionsToCalculate: Transaction[];

        switch (operation) {
            case 'add':
                transactionsToCalculate = [...currentTransactions, ...transactions];
                break;
            case 'remove':
                const transactionIds = transactions.map(t => t.id);
                transactionsToCalculate = currentTransactions.filter(
                    t => !transactionIds.includes(t.id)
                );
                break;
            case 'update':
                transactionsToCalculate = currentTransactions;
                break;
            default:
                transactionsToCalculate = currentTransactions;
        }

        const newSpent = recalculateBudgetSpent(budget, transactionsToCalculate);
        const progress = Number(((newSpent / budget.limit) * 100).toFixed(2));

        return { ...budget, spent: newSpent, progress };
    });
};