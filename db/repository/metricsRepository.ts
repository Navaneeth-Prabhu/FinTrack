import { Transaction } from '@/types';
import { initDatabase } from '../services/sqliteService';

export interface DashboardMetrics {
    totalIncome: number;
    totalExpenses: number;
    currentMonthSpending: number;
    previousMonthSpending: number;
    expensesByCategory: Record<string, number>;
    expensesByBudgetCategory: Record<string, number>;
    hasRegularIncome: boolean;
    hasRegularExpenses: boolean;
    thirtyDayCategorySpending: { categoryName: string; total: number; color: string }[];
    totalThirtyDayExpenses: number;
    recentTransactions: Transaction[];
    savingsBalance: number;
    currentBalance: number;
    todaySpending: number;
}

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
    const db = await initDatabase();

    // 1. Total Income & Expenses
    const totalsRows = await db.getAllAsync<{ type: string; total: number }>(
        `SELECT type, SUM(amount) as total FROM transactions GROUP BY type`
    );
    const totalIncome = totalsRows.find(r => r.type === 'income')?.total || 0;
    const totalExpenses = totalsRows.find(r => r.type === 'expense')?.total || 0;
    const currentBalance = totalIncome - totalExpenses;

    // Dates for current and previous month
    const now = new Date();
    const currentMonthStartISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const currentMonthEndISO = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const prevMonthStartISO = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevMonthEndISO = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

    // 2. Current Month & Previous Month Spending
    const monthlySpendingRows = await db.getAllAsync<{ period: string; total: number }>(
        `SELECT 
            CASE 
                WHEN date >= ? AND date <= ? THEN 'current'
                WHEN date >= ? AND date <= ? THEN 'previous'
                ELSE 'other'
            END as period,
            SUM(amount) as total
         FROM transactions
         WHERE type = 'expense'
         GROUP BY period`,
        [currentMonthStartISO, currentMonthEndISO, prevMonthStartISO, prevMonthEndISO]
    );

    const currentMonthSpending = monthlySpendingRows.find(r => r.period === 'current')?.total || 0;
    const previousMonthSpending = monthlySpendingRows.find(r => r.period === 'previous')?.total || 0;

    // Today Spending
    const todayStartISO = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEndISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    const todaySpendingRows = await db.getAllAsync<{ total: number }>(
        `SELECT SUM(amount) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ?`,
        [todayStartISO, todayEndISO]
    );
    const todaySpending = todaySpendingRows[0]?.total || 0;

    // 3. Expenses By Category (All Time for diversity score)
    const categoryTotalsRows = await db.getAllAsync<{ name: string; total: number; id: string }>(
        `SELECT c.name, c.id, SUM(t.amount) as total 
         FROM transactions t
         JOIN categories c ON t.categoryId = c.id
         WHERE t.type = 'expense'
         GROUP BY c.id`
    );
    const expensesByCategory: Record<string, number> = {};
    const expensesByBudgetCategory: Record<string, number> = {}; // Current month only (for budgets)

    categoryTotalsRows.forEach(row => {
        expensesByCategory[row.name] = row.total;
    });

    // 4. Budget Expenses (Current Month by Category ID)
    const budgetCategoryRows = await db.getAllAsync<{ id: string; total: number }>(
        `SELECT t.categoryId as id, SUM(t.amount) as total 
         FROM transactions t
         WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ?
         GROUP BY t.categoryId`,
        [currentMonthStartISO, currentMonthEndISO]
    );
    budgetCategoryRows.forEach(row => {
        if (row.id) {
            expensesByBudgetCategory[row.id] = row.total;
        }
    });

    // 5. Financial Consistency (Has recurring income/expenses)
    const recurringRows = await db.getAllAsync<{ type: string; count: number }>(
        `SELECT type, COUNT(*) as count FROM transactions WHERE recurringId IS NOT NULL GROUP BY type`
    );
    const hasRegularIncome = (recurringRows.find(r => r.type === 'income')?.count || 0) > 0;
    const hasRegularExpenses = (recurringRows.find(r => r.type === 'expense')?.count || 0) > 0;

    // 6. Last 30 Days Category Spending (For Smart Alerts & CategoryCard)
    const thirtyDaysAgoISO = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDayCategorySpending = await db.getAllAsync<{ categoryName: string; total: number; color: string }>(
        `SELECT c.name as categoryName, c.color, SUM(t.amount) as total 
         FROM transactions t
         JOIN categories c ON t.categoryId = c.id
         WHERE t.type = 'expense' AND t.date >= ?
         GROUP BY c.id`,
        [thirtyDaysAgoISO]
    );

    const totalThirtyDayExpenses = thirtyDayCategorySpending.reduce((sum, item) => sum + item.total, 0);

    // 7. Recent Transactions (Top 5 for dashboard list)
    const recentTransactionsRows = await db.getAllAsync<any>(
        `SELECT t.*, c.name as categoryName, c.icon as categoryIcon, c.color as categoryColor, c.type as categoryType
         FROM transactions t
         JOIN categories c ON t.categoryId = c.id
         ORDER BY t.date DESC
         LIMIT 5`
    );

    const recentTransactions = recentTransactionsRows.map(row => ({
        id: row.id,
        amount: row.amount,
        date: row.date,
        description: row.description,
        type: row.type,
        paidTo: row.paidTo,
        paidBy: row.paidBy,
        categoryId: row.categoryId,
        recurringId: row.recurringId,
        accountId: row.accountId,
        lastModified: row.lastModified,
        createdAt: row.createdAt,
        mode: row.mode,
        source: { type: row.sourceType, rawData: row.sourceRawData || undefined },
        category: {
            id: row.categoryId,
            name: row.categoryName,
            icon: row.categoryIcon,
            color: row.categoryColor,
            type: row.categoryType
        }
    }));

    // 8. Savings Balance
    const savingsRows = await db.getAllAsync<{ total: number }>(
        `SELECT SUM(t.amount) as total
         FROM transactions t
         LEFT JOIN categories c ON t.categoryId = c.id
         LEFT JOIN accounts a ON t.toAccountId = a.id
         WHERE (t.type = 'income' AND (LOWER(c.name) LIKE '%saving%' OR LOWER(a.name) LIKE '%saving%' OR LOWER(t.mode) LIKE '%saving%'))
            OR (t.type = 'transfer' AND LOWER(a.name) LIKE '%saving%')
            OR (t.type = 'investment')`
    );
    const savingsBalance = savingsRows[0]?.total || 0;

    return {
        totalIncome,
        totalExpenses,
        currentMonthSpending,
        previousMonthSpending,
        expensesByCategory,
        expensesByBudgetCategory,
        hasRegularIncome,
        hasRegularExpenses,
        thirtyDayCategorySpending,
        totalThirtyDayExpenses,
        recentTransactions,
        savingsBalance,
        currentBalance,
        todaySpending
    };
};

export interface ChartDataPoint { label: string; value: number }

export const getChartMetrics = async (period: 'week' | 'month' | 'year', type: 'income' | 'expense'): Promise<ChartDataPoint[]> => {
    const db = await initDatabase();
    const now = new Date();

    if (period === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const rows = await db.getAllAsync<{ day: string; total: number }>(
            `SELECT strftime('%w', date) as day, SUM(amount) as total 
             FROM transactions 
             WHERE type = ? AND date >= ? AND date <= ?
             GROUP BY day`,
            [type, startOfWeek.toISOString(), endOfWeek.toISOString()]
        );

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days.map((dayLabel, index) => {
            const row = rows.find(r => parseInt(r.day) === index);
            return { label: dayLabel, value: row ? row.total : 0 };
        });

    } else if (period === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const daysInMonth = endOfMonth.getDate();

        const rows = await db.getAllAsync<{ day: string; total: number }>(
            `SELECT strftime('%d', date) as day, SUM(amount) as total 
             FROM transactions 
             WHERE type = ? AND date >= ? AND date <= ?
             GROUP BY day`,
            [type, startOfMonth.toISOString(), endOfMonth.toISOString()]
        );

        return Array.from({ length: daysInMonth }, (_, i) => {
            const dayStr = (i + 1).toString().padStart(2, '0');
            const row = rows.find(r => r.day === dayStr);
            return { label: (i + 1).toString(), value: row ? row.total : 0 };
        });

    } else if (period === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const rows = await db.getAllAsync<{ month: string; total: number }>(
            `SELECT strftime('%m', date) as month, SUM(amount) as total 
             FROM transactions 
             WHERE type = ? AND date >= ? AND date <= ?
             GROUP BY month`,
            [type, startOfYear.toISOString(), endOfYear.toISOString()]
        );

        return months.map((monthLabel, index) => {
            const monthStr = (index + 1).toString().padStart(2, '0');
            const row = rows.find(r => r.month === monthStr);
            return { label: monthLabel, value: row ? row.total : 0 };
        });
    }
    return [];
};
