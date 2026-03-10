// SMSImportButton.jsx
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { importSMSTransactionsToStore } from '@/utils/SMSTransactionUtil';

const SMSImportButton = ({ style }: { style?: any }) => {
  const [loading, setLoading] = useState(false);

  // Get the category and transaction store functions
  const categories = useCategoryStore(state => state.categories);
  const saveBulkTransactions = useTransactionStore(state => state.saveBulkTransactions);

  const handleImport = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'SMS import is only available on Android devices');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const importCount = await importSMSTransactionsToStore(categories, saveBulkTransactions);

      if (importCount > 0) {
        Alert.alert(
          'Import Successful',
          `Successfully imported ${importCount} transactions from your SMS messages.`
        );
      } else {
        Alert.alert(
          'No Transactions Found',
          'No new financial transactions were found in your SMS messages.'
        );
      }
    } catch (error) {
      console.error('Error during SMS import:', error);
      Alert.alert('Import Failed', 'There was an error importing transactions from SMS.');
    } finally {
      setLoading(false);
    }
  };

  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handleImport}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={styles.buttonText}>Import from SMS</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  }
});

export default SMSImportButton;