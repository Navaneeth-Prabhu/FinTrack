import { useState } from 'react';
import { Transaction } from '@/types';
import { importTransactionsFromGmail, checkAuthStatus, authenticateGmail, signOutGmail } from '@/services/emailParser';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTransactionStore } from '@/stores/transactionStore';

interface EmailImportState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  isImporting: boolean;
  error: string | null;
  lastImported: Transaction[] | null;
}

export const useEmailImport = () => {
  const [state, setState] = useState<EmailImportState>({
    isAuthenticated: false,
    isAuthenticating: false,
    isImporting: false,
    error: null,
    lastImported: null,
  });

  const { categories } = useCategoryStore();
  const { saveBulkTransactions } = useTransactionStore();

  const checkAuth = async () => {
    const isAuthenticated = await checkAuthStatus();
    setState(prev => ({ ...prev, isAuthenticated }));
    return isAuthenticated;
  };

  const authenticate = async () => {
    setState(prev => ({ ...prev, isAuthenticating: true, error: null }));
    const success = await authenticateGmail();
    setState(prev => ({ ...prev, isAuthenticating: false, isAuthenticated: success }));
    return success;
  };

  const signOut = async () => {
    await signOutGmail();
    setState(prev => ({ ...prev, isAuthenticated: false, lastImported: null }));
  };

  const importTransactions = async (): Promise<Transaction[]> => {
    setState(prev => ({ ...prev, isImporting: true, error: null }));
    try {
      if (!(await checkAuth())) throw new Error('Not authenticated with Gmail');
      const transactions = await importTransactionsFromGmail(categories);
      const savedTransactions = await saveBulkTransactions(transactions);
      setState(prev => ({ ...prev, isImporting: false, lastImported: savedTransactions }));
      return savedTransactions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import transactions';
      setState(prev => ({ ...prev, isImporting: false, error: errorMessage }));
      throw error;
    }
  };

  return { ...state, authenticate, signOut, checkAuth, importTransactions };
};

export default useEmailImport;