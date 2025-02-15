import { initDatabase } from "../services/sqliteService";
import { Budget } from "@/types";

export const saveBudgetToDB = async (budget: Budget): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync(
        `INSERT INTO budgets (id, amount, frequency, startDate, endDate, spent, progress, categoryId) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        budget.id,
        budget.limit,
        budget.frequency,
        budget.startDate,
        budget.endDate,
        budget.spent,
        budget.progress,~
        budget.category.id,
    );
};

export const fetchBudgetsFromDB = async (): Promise<Budget[]> => {
    const db = await initDatabase();
    try {
        const budgets = await db.getAllAsync(`
            SELECT 
            b.id,
            b.amount,
            b.frequency,
            b.startDate,
            b.endDate,
            b.spent,
            b.progress,
            b.categoryId,
            c.name as categoryName,
            c.icon as categoryIcon,
            c.type as categoryType,
            c.color as categoryColor
            FROM budgets b
            LEFT JOIN categories c
            ON b.categoryId = c.id
        `);

        console.log('Raw budgets from DB:', budgets);

        const mappedBudgets = budgets.map((row: any) => ({
            id: row.id,
            limit: row.amount,
            frequency: row.frequency,
            startDate: row.startDate,
            endDate: row.endDate,
            spent: row.spent,
            progress: row.progress,
            category: {
                id: row.categoryId || "unknown",
                name: row.categoryName || "Uncategorized",
                icon: row.categoryIcon || "❓",
                type: row.categoryType || "unknown",
                color: row.categoryColor || "#000000",
            },
        }));

        return mappedBudgets;
    } catch (error) {
        console.error('Error fetching budgets:', error);
        throw error;
    }
};

export const updateBudgetInDB = async (budget: Budget): Promise<Budget> => {
    const db = await initDatabase();
    await db.runAsync(
        `UPDATE budgets 
       SET amount = ?, 
           categoryId = ?, 
           period = ?, 
           startDate = ?, 
           endDate = ?, 
           name = ?
       WHERE id = ?`,
        budget.amount,
        budget.categoryId,
        budget.period,
        budget.startDate,
        budget.endDate || null,
        budget.name || null,
        budget.id
    );

    // Fetch and return the updated budget
    const budgets = await fetchBudgetsFromDB();
    return budgets.find(b => b.id === budget.id)!;
};


export const deleteBudgetFromDB = async (id: string): Promise<void> => {
    const db = await initDatabase();
    await db.runAsync('DELETE FROM budgets WHERE id = ?', id);
};
