// src/types.ts
export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'investment';
  date: string;
  createdAt: string;
  lastModified: string;
  paidTo?: string | null | undefined; // Payee for income or transfer transactions
  paidBy?: string | null | undefined; // Payer for expense or transfer transactions
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
  recurringId?: string | undefined,
  attachments?: {
    type: string | null | undefined,
    url: string,
  },
  selectedTags?: string,
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
  refNumber?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense' | 'transfer' | 'investment';
  color: string;
  order?: number;  // Add order field
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
  type: 'income' | 'expense' | 'transfer' | 'investment';
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
  mode?: string;
  fromAccount?: {
    id: string,
    name: string,
  },
  toAccount?: {
    id: string,
    name: string,
  }
}

export type TimeView = 'Day' | 'Week' | 'Month' | 'Year' | 'Custom';

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'credit_card' | 'wallet' | 'investment' | 'other';
  balance: number;
  currency: string;
  isIncludeInNetWorth: boolean;
  color?: string;
  icon?: string;
  provider?: string;
  accountNumber?: string;
  lastModified?: string;
}

export interface SIPPlan {
  id: string; // UUID
  name: string; // User-defined name
  fundName: string; // Actual fund name
  amount: number; // Monthly/periodic amount
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string; // ISO date
  nextDueDate: string; // ISO date
  sipDay: number; // Day of month for monthly SIPs
  totalInvested: number; // Computed or derived
  units?: number; // Optional units held
  nav?: number; // Optional current NAV
  status: 'active' | 'paused' | 'completed';
  notes?: string;
  categoryId: string; // Linked category (usually 'investment')
  createdAt: string; // ISO date
  lastModified: string; // ISO date
  priceUpdatedAt?: string; // ISO date when nav/units were last updated
}

export interface Loan {
  id: string; // UUID
  lender: string; // Bank/institution name
  loanType: 'home' | 'car' | 'personal' | 'education' | 'other';
  principal: number; // Total loan amount
  outstanding: number; // Remaining amount
  emiAmount: number; // Monthly EMI
  emiDueDay: number; // Day of month
  tenureMonths: number; // Total duration
  startDate: string; // ISO date
  status: 'active' | 'closed' | 'defaulted';
  source: 'manual' | 'sms' | 'scraped';
  notes?: string;
  createdAt: string; // ISO date
  lastModified: string; // ISO date
}

export interface SMSAlert {
  id: string;
  /** Classification of the alert */
  type: 'sip_confirmation' | 'emi_deduction' | 'account_balance' | 'loan_alert';
  title: string;
  /** Full parsed body text shown to the user */
  body: string;
  amount?: number;
  bank?: string;
  accountLast4?: string;
  smsId?: string;
  isRead: boolean;
  createdAt: string; // ISO date
}

export interface Holding {
  id: string;
  user_id?: string;
  type: 'stock' | 'fd' | 'bond' | 'gold' | 'crypto' | 'ppf' | 'nps' | 'other';
  name: string;
  ticker?: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  buy_date: string;
  notes?: string;
  price_updated_at?: string;
  is_deleted?: number;
  updated_at: string;
}
