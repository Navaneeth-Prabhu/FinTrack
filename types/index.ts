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
  mode: {
    id: string;
    name?: string;
    type: string;
  };
  note?: string;
  selectedTags?: string[], // Array of tags for additional categorization
  location?: {
    coordinates: number, // [longitude, latitude]
  },
  recurringTransactionId?: string,
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
  limit: number;
  spent: number;
  category: Category;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string | null;
  progress: number;
  // name?: string;
  // notifications: {              // Budget alerts
  //   enabled: boolean;
  //   thresholds: number[];      // Alert at 50%, 80%, 90% etc.
  // };
  isRecurring: boolean;
}

export interface RecurringTransaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  description?: string;
  payee?: string;
}