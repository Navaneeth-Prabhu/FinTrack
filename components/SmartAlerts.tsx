// src/components/SmartAlerts.tsx
import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Transaction, RecurringTransaction } from '../types';
import { format, addDays, isWithinInterval, startOfDay, endOfDay, isFuture } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/theme';

interface SmartAlertsProps {
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  onAlertPress?: (alertId: string) => void;
}

type Alert = {
  id: string;
  type: 'bill' | 'spending' | 'savings';
  title: string;
  description: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return '#F44336';
    case 'medium': return '#FFC107';
    case 'low': return '#4CAF50';
    default: return '#757575';
  }
};

const getIconByType = (type: string) => {
  switch (type) {
    case 'bill': return '📅';
    case 'spending': return '📊';
    case 'savings': return '💰';
    default: return '📌';
  }
};

const SmartAlerts: React.FC<SmartAlertsProps> = ({
  transactions,
  recurringTransactions,
  onAlertPress,
}) => {

  const { colors } = useTheme();
  const alerts = useMemo(() => {
    const result: Alert[] = [];
    const now = new Date();

    // Generate bill payment alerts
    recurringTransactions
      .filter(rt => rt.type === 'expense' && rt.isActive)
      .forEach(bill => {
        const dueDate = new Date(bill.startDate);
        if (isFuture(dueDate) && isWithinInterval(dueDate, {
          start: startOfDay(now),
          end: endOfDay(addDays(now, 7))
        })) {
          result.push({
            id: `bill-${bill.id}`,
            type: 'bill',
            title: `${bill.category.name} payment due`,
            description: `Payment of $${bill.amount.toFixed(2)} is due on ${format(dueDate, 'MMM dd')}`,
            dueDate: bill.startDate,
            priority: isWithinInterval(dueDate, {
              start: startOfDay(now),
              end: endOfDay(addDays(now, 2))
            }) ? 'high' : 'medium',
          });
        }
      });

    // Detect unusual spending patterns
    const recentTransactions = transactions
      .filter(t => t.type === 'expense')
      .filter(t => {
        const transactionDate = new Date(t.date);
        return isWithinInterval(transactionDate, {
          start: startOfDay(addDays(now, -30)),
          end: endOfDay(now)
        });
      });

    const expensesByCategory = recentTransactions.reduce((acc, t) => {
      const category = t.category.name;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(t);
      return acc;
    }, {} as Record<string, Transaction[]>);

    Object.entries(expensesByCategory).forEach(([category, transactions]) => {
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      if (totalAmount > 500) {
        result.push({
          id: `spending-${category}`,
          type: 'spending',
          title: `High ${category} spending`,
          description: `You've spent $${totalAmount.toFixed(2)} on ${category} in the last 30 days`,
          priority: 'medium',
        });
      }
    });

    const totalExpenses = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
    const foodExpenses = expensesByCategory['Food']?.reduce((sum, t) => sum + t.amount, 0) || 0;

    if (totalExpenses > 0 && (foodExpenses / totalExpenses) > 0.3) {
      result.push({
        id: 'savings-food',
        type: 'savings',
        title: 'Potential savings on Food',
        description: 'Your food expenses are higher than recommended. Consider meal planning to reduce costs.',
        priority: 'low',
      });
    }

    return result;
  }, [transactions, recurringTransactions]);

  const renderAlert = useCallback(({ item }: { item: Alert }) => (
    <TouchableOpacity
      style={styles.alertItem}
      onPress={() => onAlertPress?.(item.id)}
    >
      <View style={[styles.alertDot, { backgroundColor: getPriorityColor(item.priority) }]} />
      <Text style={styles.alertIcon}>{getIconByType(item.type)}</Text>
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>{item.title}</Text>
        <Text style={styles.alertDescription}>{item.description}</Text>
        {item.dueDate && (
          <Text style={styles.alertDate}>
            Due: {format(new Date(item.dueDate), 'MMM dd, yyyy')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  ), [onAlertPress]);

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Alerts</Text>
        {alerts.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{alerts.length}</Text>
          </View>
        )}
      </View>

      {alerts.length > 0 ? (
        <FlatList
          data={alerts}
          renderItem={renderAlert}
          keyExtractor={item => item.id}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No alerts at this time</Text>
        </View>
      )}
    </View>
  );
};

export default SmartAlerts;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    marginHorizontal: tokens.spacing.md
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  badge: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  alertIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  alertDate: {
    fontSize: 13,
    color: '#888',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#888',
    fontSize: 15,
  },
});