// src/components/transactions/TransactionList/ListFooter.tsx
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';

interface ListFooterProps {
  totals: {
    expense: number;
  };
  count: number;
  isFetchingMore?: boolean;
}

export const ListFooter: React.FC<ListFooterProps> = ({ totals, count, isFetchingMore }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {isFetchingMore ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
      ) : (
        <>
          <ThemedText style={[styles.text, { color: colors.subtitle }]}>
            total cash flow ${totals.expense.toLocaleString()}
          </ThemedText>
          <ThemedText style={[styles.text, { color: colors.subtitle }]}>
            {count} transactions
          </ThemedText>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 16,
  },
  text: {
    fontSize: 12,
  },
  loader: {
    marginVertical: 8,
  }
});