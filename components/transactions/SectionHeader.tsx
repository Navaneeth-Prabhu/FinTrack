// src/components/transactions/TransactionList/SectionHeader.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { formatDateString } from '@/utils/date';

interface SectionHeaderProps {
  section: {
    title: string;
    totalIncome: number;
    totalExpense: number;
    isUpcoming: boolean;
  };
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ section }) => {
  const netBalance = section.totalIncome - section.totalExpense;

  const { colors } = useTheme();
  const formattedDate = section.isUpcoming
    ? 'UPCOMING'
    : formatDateString(section.title, {
        dateFormat: 'MMM dd, yyyy',
        includeTime: false,
        excludeYearIfCurrent: true,
      });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.subtitle,
        },
      ]}
    >
      <ThemedText style={[styles.date, { color: colors.subtitle }]}>
        {formattedDate}
      </ThemedText>
      <View style={styles.balanceContainer}>
        <ThemedText style={[styles.balance, { color: colors.subtitle }]}>
          ${netBalance.toFixed(2)}
        </ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  balanceContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  balance: {
    fontWeight: '600',
    fontSize: 12,
  },
});