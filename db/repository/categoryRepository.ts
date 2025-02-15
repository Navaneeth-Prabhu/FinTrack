// src/database/categoryRepository.ts
import { Category } from '@/types';
import { initDatabase } from '../services/sqliteService';

export const saveCategoryToDB = async (category: Category): Promise<void> => {
  const db = await initDatabase();
  await db.runAsync(
    `INSERT INTO categories (id, name, icon, type, color)
     VALUES (?, ?, ?, ?, ?);`,
    category.id,
    category.name,
    category.icon,
    category.type,
    category.color
  );
};

export const fetchCategoriesFromDB = async (): Promise<Category[]> => {
  const db = await initDatabase();
  const categories = await db.getAllAsync(`SELECT * FROM categories`);
  
  return categories.map((row: any) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    type: row.type,
    color: row.color,
  }));
};

export const updateCategoryInDB = async (category: Category): Promise<Category> => {
  const db = await initDatabase();
  await db.runAsync(
    `UPDATE categories 
     SET name = ?, 
         icon = ?, 
         type = ?, 
         color = ?
     WHERE id = ?`,
    category.name,
    category.icon,
    category.type,
    category.color,
    category.id
  );

  // Fetch and return the updated category
  const categories = await fetchCategoriesFromDB();
  return categories.find(c => c.id === category.id)!;
};

export const deleteCategoryFromDB = async (id: string): Promise<void> => {
  const db = await initDatabase();
  await db.runAsync('DELETE FROM categories WHERE id = ?', id);
};