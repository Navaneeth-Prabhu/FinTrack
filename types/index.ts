// src/types.ts
export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  date: string;
  createdAt: string;
  lastModified: string;
  paidTo?: string;
  paidBy?: string;
  category: Category;
  source: {
    type: string;
    rawData?: string,
  };
  mode: string
  note?: string;
  // selectedTags?: string[], // Array of tags for additional categorization
  location?: {
    coordinates: number, // [longitude, latitude]
  },
  recurringId?: string | null,
  attachments?: {
    type: string | null | undefined,
    url: string,
  },
  fromAccount?: {
    id: string,
    name: string,
  },
  toAccount?: {
    id: string,
    name: string,
  },
  // Metadata for sync with other systems
  externalIds?: [{
    system: string, // e.g., 'ynab', 'mint', etc.
    id: string,
  }],
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  color: string;
}

export interface Budget {
  id: string;
  limit: number;              // Total spending limit per period
  category: Category;         // Category this budget applies to
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'; // Period type
  periodLength?: number;      // Optional: days for custom frequency (like Cashew)
  startDate: string;          // When the budget begins
  endDate?: string | null;    // Optional end date for non-recurring or capped recurring budgets
  isRecurring: boolean;       // Whether the budget repeats
  // Removed: spent, progress (calculated dynamically from transactions)
  // Optional fields from your original:
  name?: string;              // User-defined name (e.g., "Groceries")
  notifications?: {
    enabled: boolean;
    thresholds: number[];     // Alert at 50%, 80%, etc.
  };
}
export interface RecurringTransaction {
  id: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category: Category;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Added
  startDate: string;
  endDate?: string;
  description?: string;
  payee?: string;
  time?: string;
  lastGeneratedDate?: string; // Should be string | undefined, not null
  isActive: number; // INTEGER in SQLite, so use number
  createdAt: string;
  lastModified: string;
  mode?: string
}

export type TimeView = 'Day' | 'Week' | 'Month' | 'Year' | 'Custom';
