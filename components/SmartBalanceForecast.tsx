// src/components/SmartBalanceForecast.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Transaction, RecurringTransaction } from '../types';
import { format, addDays, parseISO, isSameDay } from 'date-fns';
// import { LineChart } from 'react-native-chart-kit';

interface SmartBalanceForecastProps {
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  currentBalance: number;
}

interface ForecastDay {
  date: Date;
  balance: number;
  events: Array<{
    type: 'income' | 'expense';
    amount: number;
    description: string;
  }>;
}

const SmartBalanceForecast: React.FC<SmartBalanceForecastProps> = ({
  transactions,
  recurringTransactions,
  currentBalance,
}) => {
  const forecast = useMemo(() => {
    const days: ForecastDay[] = [];
    const today = new Date();
    let runningBalance = currentBalance;

    // Initialize the 30-day forecast period
    for (let i = 0; i < 30; i++) {
      const forecastDate = addDays(today, i);
      days.push({
        date: forecastDate,
        balance: runningBalance,
        events: [],
      });
    }

    // Add recurring transactions to the forecast
    recurringTransactions.forEach(rt => {
      if (!rt.isActive) return;

      const startDate = parseISO(rt.startDate);
      // This is a simplified calculation that doesn't handle all recurrence patterns
      // In a real app, you'd need more sophisticated logic based on rt.frequency and rt.interval

      for (let i = 0; i < 30; i++) {
        const forecastDate = addDays(today, i);

        // Monthly recurrence - same day of month
        if (rt.frequency === 'monthly' && forecastDate.getDate() === startDate.getDate()) {
          const day = days[i];
          day.events.push({
            type: rt.type as 'income' | 'expense',
            amount: rt.amount,
            description: rt.category.name,
          });

          // Update balance
          if (rt.type === 'income') {
            runningBalance += rt.amount;
          } else if (rt.type === 'expense') {
            runningBalance -= rt.amount;
          }

          // Update all future days with new balance
          for (let j = i; j < 30; j++) {
            days[j].balance = runningBalance;
          }
        }

        // Weekly recurrence - same day of week
        if (rt.frequency === 'weekly' && forecastDate.getDay() === startDate.getDay()) {
          const day = days[i];
          day.events.push({
            type: rt.type as 'income' | 'expense',
            amount: rt.amount,
            description: rt.category.name,
          });

          // Update balance
          if (rt.type === 'income') {
            runningBalance += rt.amount;
          } else if (rt.type === 'expense') {
            runningBalance -= rt.amount;
          }

          // Update all future days with new balance
          for (let j = i; j < 30; j++) {
            days[j].balance = runningBalance;
          }
        }
      }
    });

    // Add known future transactions
    transactions.forEach(transaction => {
      const transactionDate = parseISO(transaction.date);

      // Only include future transactions
      if (transactionDate > today) {
        const daysDiff = Math.floor((transactionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 0 && daysDiff < 30) {
          const day = days[daysDiff];
          day.events.push({
            type: transaction.type as 'income' | 'expense',
            amount: transaction.amount,
            description: transaction.category.name,
          });

          // Update balance
          let balanceChange = 0;
          if (transaction.type === 'income') {
            balanceChange = transaction.amount;
          } else if (transaction.type === 'expense') {
            balanceChange = -transaction.amount;
          }

          // Update this day and all future days
          for (let j = daysDiff; j < 30; j++) {
            days[j].balance += balanceChange;
          }
        }
      }
    });

    return days;
  }, [transactions, recurringTransactions, currentBalance]);

  // Identify key dates for highlighting (large expenses or income)
  const keyDates = useMemo(() => {
    return forecast
      .filter(day => day.events.length > 0)
      .filter(day => {
        // Find days with significant transactions (over $100)
        return day.events.some(event => event.amount > 100);
      })
      .map(day => ({
        date: day.date,
        balance: day.balance,
        events: day.events,
      }));
  }, [forecast]);

  // Prepare data for the chart
  const chartData = {
    labels: forecast
      .filter((_, index) => index % 5 === 0 || index === 29) // Show every 5 days + last day
      .map(day => format(day.date, 'MMM d')),
    datasets: [
      {
        data: forecast.map(day => Math.max(0, day.balance)), // Ensure no negative values for chart display
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#4CAF50',
    },
  };

  const { width } = useWindowDimensions();
  const screenWidth = width - 32;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Balance Forecast</Text>

      <View style={styles.chartContainer}>
        {/* <LineChart
          data={chartData}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          yAxisSuffix="$"
        /> */}
      </View>

      <Text style={styles.sectionTitle}>Key Dates</Text>
      <View style={styles.keyDates}>
        {keyDates.slice(0, 3).map((day, index) => {
          // Calculate total impact for the day
          const impact = day.events.reduce((total, event) => {
            return total + (event.type === 'income' ? event.amount : -event.amount);
          }, 0);

          return (
            <View key={day.date.getTime().toString()} style={styles.keyDateItem}>
              <View style={styles.dateContainer}>
                <Text style={styles.dateDay}>{format(day.date, 'd')}</Text>
                <Text style={styles.dateMonth}>{format(day.date, 'MMM')}</Text>
              </View>
              <View style={styles.keyDateDetails}>
                <Text style={styles.keyDateTitle}>
                  {impact > 0 ? 'Income' : 'Expense'}: ${Math.abs(impact).toFixed(0)}
                </Text>
                <Text style={styles.keyDateSubtitle}>
                  {day.events.map(e => e.description).join(', ')}
                </Text>
                <Text style={[
                  styles.projectedBalance,
                  { color: day.balance > 0 ? '#4CAF50' : '#F44336' }
                ]}>
                  Projected: ${day.balance.toFixed(0)}
                </Text>
              </View>
            </View>
          );
        })}

        {keyDates.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No significant financial events in the next 30 days</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    // margin: 16,
    marginTop: 0,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chartContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 12,
  },
  keyDates: {
    marginTop: 8,
  },
  keyDateItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dateMonth: {
    fontSize: 12,
    color: '#666',
  },
  keyDateDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  keyDateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  keyDateSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  projectedBalance: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
  },
});

export default SmartBalanceForecast;