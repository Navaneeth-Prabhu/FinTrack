import { initDatabase } from "../services/sqliteService";
import { Budget } from "@/types";

// Save a new budget (no spent/progress)
export const saveBudgetToDB = async (budget: Budget): Promise<void> => {
    const db = await initDatabase();
    try {
        await db.runAsync(
            `INSERT INTO budgets (
          id, 
          budget_limit, 
          frequency, 
          period_length,
          startDate, 
          endDate, 
          categoryId, 
          isRecurring,
          name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                budget.id,
                budget.limit,
                budget.frequency,
                budget.periodLength || null,
                budget.startDate,
                budget.endDate || null,
                budget.category.id,
                budget.isRecurring ? 1 : 0,
                budget.name || null,
            ]
        );
        console.log('Budget saved to DB:', budget);
    } catch (error) {
        console.error('Error saving budget to DB:', error);
        throw error; // Ensure the error propagates
    }
};
// Fetch budgets with current period spending
export const fetchBudgetsFromDB = async (): Promise<Budget[]> => {
    const db = await initDatabase();
    try {
        const budgets = await db.getAllAsync(`
      SELECT 
        b.id,
        b.budget_limit AS budget_limit,
        b.frequency,
        b.period_length AS periodLength,
        b.startDate,
        b.endDate,
        b.isRecurring,
        b.name,
        b.categoryId,
        c.name AS categoryName,
        c.icon AS categoryIcon,
        c.type AS categoryType,
        c.color AS categoryColor
      FROM budgets b
      LEFT JOIN categories c ON b.categoryId = c.id
    `);

        return budgets.map((row: any) => ({
            id: row.id,
            limit: row.budget_limit,
            frequency: row.frequency,
            periodLength: row.periodLength || undefined,
            startDate: row.startDate,
            endDate: row.endDate,
            isRecurring: Boolean(row.isRecurring),
            name: row.name || undefined,
            category: {
                id: row.categoryId || "unknown",
                name: row.categoryName || "Uncategorized",
                icon: row.categoryIcon || "❓",
                type: row.categoryType || "unknown",
                color: row.categoryColor || "#000000",
            },
        }));
    } catch (error) {
        console.error('Error fetching budgets:', error);
        throw error;
    }
};

// Update an existing budget
export const updateBudgetInDB = async (budget: Budget): Promise<Budget> => {
    const db = await initDatabase();
    await db.runAsync(
        `UPDATE budgets 
    SET budget_limit = ?, 
        frequency = ?, 
        period_length = ?,
        startDate = ?, 
        endDate = ?, 
        categoryId = ?, 
        isRecurring = ?,
        name = ?
        WHERE id = ?`,
        [
            budget.limit,
            budget.frequency,
            budget.periodLength || null,
            budget.startDate,
            budget.endDate || null,
            budget.category.id,
            budget.isRecurring ? 1 : 0,
            budget.name || null,
            budget.id,
        ]
    );

    const budgets = await fetchBudgetsFromDB();
    return budgets.find(b => b.id === budget.id)!;
};

// Delete a budget
export const deleteBudgetFromDB = async (id: string): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
};

// Calculate spending for a budget's current period
export const calculateBudgetSpent = async (
    budget: Budget,
    start: Date,
    end: Date
): Promise<number> => {
    const db = await initDatabase();
    const result = await db.getFirstAsync<{ totalSpent: number }>(`
    SELECT COALESCE(SUM(t.amount), 0) AS totalSpent
    FROM transactions t
    WHERE t.type = 'expense'
      AND t.categoryId = ?
      AND t.date >= ?
      AND t.date <= ?
  `, [
        budget.category.id,
        start.toISOString(),
        end.toISOString(),
    ]);
    return result?.totalSpent || 0;
};