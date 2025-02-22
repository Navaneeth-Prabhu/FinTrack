import { initDatabase } from "../services/sqliteService";
import { Budget } from "@/types";

export const saveBudgetToDB = async (budget: Budget): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync(
        `INSERT INTO budgets (
            id, 
            budget_limit, 
            frequency, 
            startDate, 
            endDate, 
            spent, 
            progress, 
            categoryId, 
            isRecurring
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [  // Use array for parameters
            budget.id,
            budget.limit,
            budget.frequency,
            budget.startDate,
            budget.endDate || null,
            budget.spent,
            budget.progress,
            budget.category.id,
            budget.isRecurring ? 1 : 0  // Convert boolean to integer for SQLite
        ]
    );
};

export const fetchBudgetsFromDB = async (): Promise<Budget[]> => {
    const db = await initDatabase();
    try {
        const budgets = await db.getAllAsync(`
            SELECT 
                b.id,
                b.budget_limit as budget_limit,
                b.frequency,
                b.startDate,
                b.endDate,
                b.spent,
                b.progress,
                b.isRecurring,
                b.categoryId,
                c.name as categoryName,
                c.icon as categoryIcon,
                c.type as categoryType,
                c.color as categoryColor
            FROM budgets b
            LEFT JOIN categories c ON b.categoryId = c.id
        `);

        return budgets.map((row: any) => ({
            id: row.id,
            limit: row.budget_limit,  // Changed from amount to budget_limit
            frequency: row.frequency,
            startDate: row.startDate,
            endDate: row.endDate,
            spent: row.spent || 0,
            progress: row.progress || 0,
            category: {
                id: row.categoryId || "unknown",
                name: row.categoryName || "Uncategorized",
                icon: row.categoryIcon || "❓",
                type: row.categoryType || "unknown",
                color: row.categoryColor || "#000000",
            },
            isRecurring: Boolean(row.isRecurring)  // Convert integer to boolean
        }));
    } catch (error) {
        console.error('Error fetching budgets:', error);
        throw error;
    }
};

export const updateBudgetInDB = async (budget: Budget): Promise<Budget> => {
    const db = await initDatabase();
    await db.runAsync(
        `UPDATE budgets 
        SET budget_limit = ?, 
            categoryId = ?, 
            frequency = ?,
            spent = ?,
            progress = ?,
            startDate = ?, 
            endDate = ?,
            isRecurring = ?
        WHERE id = ?`,
        [  // Use array for parameters
            budget.limit,
            budget.category.id,
            budget.frequency,
            budget.spent,
            budget.progress,
            budget.startDate,
            budget.endDate || null,
            budget.isRecurring ? 1 : 0,
            budget.id
        ]
    );

    // Fetch and return the updated budget
    const budgets = await fetchBudgetsFromDB();
    return budgets.find(b => b.id === budget.id)!;
};


export const deleteBudgetFromDB = async (id: string): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync('DELETE FROM budgets WHERE id = ?', id);
};
