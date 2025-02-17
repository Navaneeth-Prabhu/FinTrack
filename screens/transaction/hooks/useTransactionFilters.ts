// src/hooks/useTransactionFilters.ts
import { useState, useMemo } from 'react';
import { isWithinInterval } from 'date-fns';
import { AccountType, ActiveFilter, DateRange, Transaction, TransactionType } from '@/src/types';

interface FilterState {
  transactionType: TransactionType;
  accountType: AccountType;
  categories: string[];
}

export const useTransactionFilters = (transactions: Transaction[], dateRange: DateRange) => {
  // Current active filters
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  
  // Applied filter state (used for actual filtering)
  const [appliedFilterState, setAppliedFilterState] = useState<FilterState>({
    transactionType: 'all',
    accountType: 'all',
    categories: []
  });

  // Temporary filter state (used while selecting filters)
  const [tempFilterState, setTempFilterState] = useState<FilterState>({
    transactionType: 'all',
    accountType: 'all',
    categories: []
  });

  // Filter transactions based on applied filters only
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction: Transaction) => {
      const transactionDate = new Date(transaction.date);
      const dateMatch = isWithinInterval(transactionDate, dateRange);
      const typeMatch = appliedFilterState.transactionType === 'all' || 
                       transaction.type === appliedFilterState.transactionType;
      const categoryMatch = appliedFilterState.categories.length === 0 || 
                          appliedFilterState.categories.includes(transaction.category.name);
      
      return dateMatch && typeMatch && categoryMatch;
    });
  }, [transactions, dateRange, appliedFilterState]);

  // Handle temporary filter changes (while selecting)
  const handleFilterChange = (filterType: string, value: string) => {
    setTempFilterState(prev => {
      const newState = { ...prev };
      if (filterType === 'category') {
        const categories = [...prev.categories];
        const index = categories.indexOf(value);
        if (index > -1) {
          categories.splice(index, 1);
        } else {
          categories.push(value);
        }
        newState.categories = categories;
      } else {
        newState[filterType as keyof FilterState] = value as any;
      }
      return newState;
    });
  };

  // Apply the temporary filters
  const handleApplyFilters = () => {
    const newFilters: ActiveFilter[] = [];
    
    if (tempFilterState.transactionType !== 'all') {
      newFilters.push({
        id: `type-${tempFilterState.transactionType}`,
        label: tempFilterState.transactionType,
        type: 'transactionType',
        value: tempFilterState.transactionType
      });
    }

    if (tempFilterState.accountType !== 'all') {
      newFilters.push({
        id: `account-${tempFilterState.accountType}`,
        label: tempFilterState.accountType,
        type: 'accountType',
        value: tempFilterState.accountType
      });
    }

    tempFilterState.categories.forEach(category => {
      newFilters.push({
        id: `category-${category}`,
        label: category,
        type: 'category',
        value: category
      });
    });

    // Update the applied filter state and active filters
    setAppliedFilterState(tempFilterState);
    setActiveFilters(newFilters);
  };

  // Clear all filters
  const handleClearFilters = () => {
    const clearedState = {
      transactionType: 'all',
      accountType: 'all',
      categories: []
    };
    setTempFilterState(clearedState);
    setAppliedFilterState(clearedState);
    setActiveFilters([]);
  };

  // Remove a single filter
  const handleRemoveFilter = (filterId: string) => {
    const filter = activeFilters.find(f => f.id === filterId);
    if (filter) {
      const newAppliedState = { ...appliedFilterState };
      const newTempState = { ...tempFilterState };

      if (filter.type === 'category') {
        newAppliedState.categories = appliedFilterState.categories.filter(c => c !== filter.value);
        newTempState.categories = tempFilterState.categories.filter(c => c !== filter.value);
      } else {
        newAppliedState[filter.type] = 'all';
        newTempState[filter.type] = 'all';
      }

      setAppliedFilterState(newAppliedState);
      setTempFilterState(newTempState);
      setActiveFilters(prev => prev.filter(f => f.id !== filterId));
    }
  };

  return {
    filterState: tempFilterState, // Used for displaying selected filters in the modal
    activeFilters, // Used for displaying active filter chips
    filteredTransactions,
    handleFilterChange,
    handleApplyFilters,
    handleClearFilters,
    handleRemoveFilter
  };
};