import { Category } from '@/types';
import { initDatabase } from '../services/sqliteService';

export const saveCategoryToDB = async (category: Category): Promise<void> => {
  const db = await initDatabase();
  await db.runAsync(
    `INSERT INTO categories (id, name, icon, type, color, orderId)
     VALUES (?, ?, ?, ?, ?, ?);`,
    category.id,
    category.name,
    category.icon,
    category.type,
    category.color,
    category.order ?? 0
  );
};

export const fetchCategoriesFromDB = async (): Promise<Category[]> => {
  const db = await initDatabase();
  const categories = await db.getAllAsync(`SELECT * FROM categories ORDER BY orderId`);

  return categories.map((row: any) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    type: row.type,
    color: row.color,
    order: row.orderId,
  }));
};

export const updateCategoryInDB = async (category: Category): Promise<Category> => {
  const db = await initDatabase();
  await db.runAsync(
    `UPDATE categories 
     SET name = ?, 
         icon = ?, 
         type = ?, 
         color = ?,
         orderId = ?
     WHERE id = ?`,
    category.name,
    category.icon,
    category.type,
    category.color,
    category.order ?? 0,
    category.id
  );

  // Fetch and return the updated category
  const categories = await fetchCategoriesFromDB();
  return categories.find(c => c.id === category.id)!;
};

export const updateCategoriesOrderInDB = async (categories: Category[]) => {
  const db = await initDatabase();

  // Use a transaction for atomic updates
  await db.runAsync('BEGIN TRANSACTION');
  try {
    for (const category of categories) {
      await db.runAsync(
        `UPDATE categories SET orderId = ? WHERE id = ?`,
        category.order ?? 0,
        category.id
      );
    }
    await db.runAsync('COMMIT');
  } catch (error) {
    await db.runAsync('ROLLBACK');
    throw error;
  }
};

export const deleteCategoryFromDB = async (id: string): Promise<void> => {
  const db = await initDatabase();
  await db.runAsync('DELETE FROM categories WHERE id = ?', id);
};