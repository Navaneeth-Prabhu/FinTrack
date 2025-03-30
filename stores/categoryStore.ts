import { create } from 'zustand';
import {
  deleteCategoryFromDB,
  fetchCategoriesFromDB,
  saveCategoryToDB,
  updateCategoryInDB,
  updateCategoriesOrderInDB  // You'll need to implement this
} from '@/db/repository/categoryRepository';
import { useTransactionStore } from './transactionStore';

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  color: string;
  order?: number;  // Add order field
}

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCategories: () => Promise<void>;
  saveCategory: (category: Category) => Promise<Category>;
  updateCategory: (category: Category) => Promise<Category>;
  removeCategory: (id: string) => Promise<void>;
  reorderCategories: (categories: Category[]) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    try {
      set({ isLoading: true, error: null });
      const categories = await fetchCategoriesFromDB();

      // Ensure categories are sorted by order
      const sortedCategories = categories.sort((a, b) =>
        (a.order ?? Infinity) - (b.order ?? Infinity)
      );

      set({ categories: sortedCategories, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories'
      });
    }
  },

  saveCategory: async (category: Category) => {
    try {
      // If no order is specified, set it to the end
      const categoriesCount = get().categories.length;
      const categoryWithOrder = {
        ...category,
        order: category.order ?? categoriesCount
      };

      await saveCategoryToDB(categoryWithOrder);
      set(state => ({
        categories: [...state.categories, categoryWithOrder]
          .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
      }));
      return categoryWithOrder;
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
      set(state => {
        const updatedCategories = state.categories.map(c =>
          c.id === updatedCategory.id ? updatedCategory : c
        ).sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

        return { categories: updatedCategories };
      });

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
      set(state => {
        const updatedCategories = state.categories
          .filter(c => c.id !== id)
          .map((category, index) => ({
            ...category,
            order: index  // Reassign orders after deletion
          }));

        return { categories: updatedCategories };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove category'
      });
      throw error;
    }
  },

  reorderCategories: async (categories: Category[]) => {
    try {
      // Explicitly set order for all categories
      const categoriesWithOrder = categories.map((category, index) => ({
        ...category,
        order: index
      }));

      // Update in database with explicit ordering
      await updateCategoriesOrderInDB(categoriesWithOrder);

      // Update local state with sorted categories
      set({
        categories: categoriesWithOrder.sort((a, b) =>
          (a.order ?? Infinity) - (b.order ?? Infinity)
        )
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to reorder categories'
      });
      throw error;
    }
  }
}));