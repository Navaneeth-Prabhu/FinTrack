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
          borderBottomColor: colors.subtitle,
        },
      ]}
    >
      <ThemedText variant="body2" style={[{ fontWeight: 'bold', color: colors.subtitle }]}>
        {formattedDate}
      </ThemedText>
      <View style={styles.balanceContainer}>
        <ThemedText variant="body2" style={[{ fontWeight: 'bold', color: colors.subtitle }]}>
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
    borderBottomWidth: 0.7,
    marginVertical: 8,
    paddingVertical: 4,
  },
  balanceContainer: {
    flexDirection: 'row',
    gap: 10,
  },
});