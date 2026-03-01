import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';

interface TransactionAmountProps {
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'investment';
  isUpcoming?: boolean;
}

export const TransactionAmount: React.FC<TransactionAmountProps> = React.memo((
  { amount, type, isUpcoming }
) => {
  const { colors } = useTheme();

  return (
    <ThemedText variant='h3' style={[{ color: colors.text }]}>
      {type === 'income' ? '+' : '-'}
      ${amount.toFixed(2)}
    </ThemedText>
  );
});

const styles = StyleSheet.create({
  amount: {
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: 'bold',
    fontSize: 18,
  },
});