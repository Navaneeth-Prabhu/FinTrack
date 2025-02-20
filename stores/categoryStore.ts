// src/store/categoryStore.ts
import { create } from 'zustand';
import {
  deleteCategoryFromDB,
  fetchCategoriesFromDB,
  saveCategoryToDB,
  updateCategoryInDB
} from '@/db/repository/categoryRepository';
import { useTransactionStore } from './transactionStore';
import { Category } from '@/types';

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCategories: () => Promise<void>;
  saveCategory: (category: Category) => Promise<Category>;
  updateCategory: (category: Category) => Promise<Category>;
  removeCategory: (id: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    try {
      set({ isLoading: true, error: null });
      const categories = await fetchCategoriesFromDB();
      set({ categories, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories'
      });
    }
  },

  saveCategory: async (category: Category) => {
    try {
      await saveCategoryToDB(category);
      set(state => ({
        categories: [...state.categories, category]
      }));
      return category;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save category'
      });
      throw error;
    }
  },

  updateCategory: async (category: Category) => {
    try {
      const updatedCategory = await updateCategoryInDB(category);
      set(state => ({
        categories: state.categories.map(c =>
          c.id === updatedCategory.id ? updatedCategory : c
        )
      }));

      // Update related transactions
      const { updateTransactionsWithCategory } = useTransactionStore.getState();
      await updateTransactionsWithCategory(updatedCategory);

      return updatedCategory;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update category'
      });
      throw error;
    }
  },

  removeCategory: async (id: string) => {
    try {
      await deleteCategoryFromDB(id);
      set(state => ({
        categories: state.categories.filter(c => c.id !== id)
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove category'
      });
      throw error;
    }
  },
}));