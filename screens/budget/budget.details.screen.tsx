import React, { useMemo, useState, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Animated,
  Button,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { Budget, Transaction } from '@/types';
import { format, isBefore, isAfter, parseISO, addDays, differenceInDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useBudgetStore } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { getEndDateForFrequency, getNextPeriodEndDate } from '@/utils/date';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/common/ThemedText';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { LineChart, BarChart } from 'react-native-gifted-charts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BudgetDetailsScreen = () => {
  const { id } = useLocalSearchParams();
  const { budgets, isLoading: budgetsLoading, removeBudget } = useBudgetStore();
  const { transactions, isLoading: transactionsLoading } = useTransactionStore();
  const { colors } = useTheme();
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const [chartView, setChartView] = useState<'line' | 'bar'>('line');
  const [showInsights, setShowInsights] = useState(false);
  const navigation = useNavigation();

  // Find the budget by ID
  const budget = useMemo(() => {
    const found = budgets.find(b => b.id === (typeof id === 'string' ? id : String(id)));
    if (!found) console.log('No budget found for ID:', id);
    return found;
  }, [budgets, id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <>
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/budget/budgetForm',
              params: {
                editMode: 'true',
                budgetId: id
              }
            })}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="pencil" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              removeBudget(String(id));
              router.back();
            }}

            style={{ marginRight: 15 }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </>
      ),
    });
  }, [navigation, id, budget]);

  // Initialize selected period
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    if (!budget) return { start: new Date(), end: new Date() };



    const startDate = parseISO(budget.startDate);
    const now = new Date();
    let periodStart = startDate;
    let periodEnd = getEndDateForFrequency(budget.startDate, budget.frequency);

    // Adjust to current period if budget has started
    if (!isBefore(now, startDate)) {
      while (isBefore(getNextPeriodEndDate(periodStart.toISOString(), budget.frequency), now)) {
        periodStart = parseISO(getNextPeriodEndDate(periodStart.toISOString(), budget.frequency).toISOString());
        periodEnd = getEndDateForFrequency(periodStart.toISOString(), budget.frequency);
      }
    }

    return { start: periodStart, end: periodEnd };
  });

  if (budgetsLoading || transactionsLoading || !budget) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <ThemedText>{budgetsLoading || transactionsLoading ? 'Loading...' : 'Budget not found'}</ThemedText>
      </View>
    );
  }

  // Filter transactions for current period
  const periodTransactions = useMemo(() => {
    return transactions.filter(t =>
      t.type === 'expense' &&
      t.category.id === budget.category.id &&
      new Date(t.date).getTime() >= selectedPeriod.start.getTime() &&
      new Date(t.date).getTime() <= selectedPeriod.end.getTime()
    );
  }, [transactions, budget, selectedPeriod]);

  // Calculate total spent
  const totalSpent = useMemo(() =>
    periodTransactions.reduce((sum, t) => sum + t.amount, 0),
    [periodTransactions]
  );

  // Calculate daily average for the period
  const dailyAverage = useMemo(() => {
    const days = Math.max(1, differenceInDays(selectedPeriod.end, selectedPeriod.start) + 1);
    return totalSpent / days;
  }, [totalSpent, selectedPeriod]);

  // Calculate remaining budget
  const remainingBudget = budget.limit - totalSpent;

  // Get historical spending for chart
  const historicalData = useMemo(() => {
    // Get 6 previous periods
    const periods = [];
    let currentEndDate = selectedPeriod.end;

    for (let i = 0; i < 6; i++) {
      let periodEndDate, periodStartDate;

      if (budget.frequency === 'monthly') {
        periodEndDate = i === 0 ? currentEndDate : endOfMonth(subMonths(currentEndDate, i));
        periodStartDate = startOfMonth(periodEndDate);
      } else {
        // For other frequencies, calculate based on days
        const periodLength = differenceInDays(selectedPeriod.end, selectedPeriod.start);
        periodEndDate = i === 0 ? currentEndDate : addDays(currentEndDate, -(i * (periodLength + 1)));
        periodStartDate = addDays(periodEndDate, -periodLength);
      }

      // Skip periods before budget start date
      if (isBefore(periodStartDate, parseISO(budget.startDate))) continue;

      const periodSpending = transactions.filter(t =>
        t.type === 'expense' &&
        t.category.id === budget.category.id &&
        !isBefore(new Date(t.date), periodStartDate) &&
        !isAfter(new Date(t.date), periodEndDate)
      ).reduce((sum, t) => sum + t.amount, 0);

      periods.push({
        value: periodSpending,
        label: format(periodStartDate, 'MMM'),
        labelTextStyle: { color: colors.text },
        frontColor: budget.category.color,
        topLabelComponent: () => (
          <ThemedText style={{ fontSize: 10, marginBottom: 4 }}>
            ${periodSpending.toFixed(0)}
          </ThemedText>
        )
      });
    }

    return periods.reverse();
  }, [budget, selectedPeriod, transactions, colors]);

  // Calculate budget insights
  const insights = useMemo(() => {
    const currentRate = totalSpent / Math.max(1, differenceInDays(new Date(), selectedPeriod.start) + 1);
    const daysInPeriod = differenceInDays(selectedPeriod.end, selectedPeriod.start) + 1;
    const projectedTotal = currentRate * daysInPeriod;
    const averagePerTransaction = totalSpent / (periodTransactions.length || 1);

    const largestTransaction = periodTransactions.length > 0
      ? periodTransactions.reduce((max, t) => t.amount > max.amount ? t : max, periodTransactions[0])
      : null;

    const percentOfLimit = (totalSpent / budget.limit) * 100;

    return {
      projected: projectedTotal,
      overBudget: projectedTotal > budget.limit,
      projectedOverage: Math.max(0, projectedTotal - budget.limit),
      averagePerTransaction,
      largestTransaction,
      percentOfLimit,
      daysRemaining: differenceInDays(selectedPeriod.end, new Date()),
      dailyAllowance: remainingBudget / Math.max(1, differenceInDays(selectedPeriod.end, new Date())),
    };
  }, [budget, selectedPeriod, totalSpent, periodTransactions, remainingBudget]);

  // Navigation restrictions
  const canGoBack = useMemo(() => {
    const prevStart = parseISO(addDays(selectedPeriod.start, -1).toISOString());
    return !isBefore(prevStart, parseISO(budget.startDate));
  }, [selectedPeriod, budget]);

  const canGoForward = useMemo(() => {
    const nextEnd = getNextPeriodEndDate(selectedPeriod.end.toISOString(), budget.frequency);
    return !isAfter(nextEnd, new Date());
  }, [selectedPeriod, budget]);

  // Navigate period
  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && !canGoBack) return;
    if (direction === 'next' && !canGoForward) return;

    setSelectedPeriod(prev => {
      let newStart, newEnd;
      if (direction === 'prev') {
        newEnd = addDays(prev.start, -1);
        newStart = addDays(newEnd, -(differenceInDays(prev.end, prev.start)));
      } else {
        newStart = addDays(prev.end, 1);
        newEnd = getEndDateForFrequency(newStart.toISOString(), budget.frequency);
      }
      return { start: newStart, end: newEnd };
    });
  };

  // Format date range
  const dateRangeText = useMemo(() => {
    const start = format(selectedPeriod.start, 'MMM d');
    const end = budget.frequency === 'daily' ? '' : ` - ${format(selectedPeriod.end, 'MMM d')}`;
    return `${start}${end}`;
  }, [selectedPeriod, budget.frequency]);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    return budget.limit === 0 ? 0 : Math.min((totalSpent / budget.limit) * 100, 100);
  }, [totalSpent, budget]);

  // Animate progress bar
  React.useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: progressPercentage,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progressPercentage]);

  const progressBarWidth = progressAnimation.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const progressColorInterpolation = progressAnimation.interpolate({
    inputRange: [0, 50, 75, 100],
    outputRange: ['#4CAF50', '#2196F3', '#FF9800', '#F44336'],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.categoryHeader}>
            <View style={[styles.categoryIconContainer, { backgroundColor: budget.category.color }]}>
              <ThemedText style={styles.categoryIcon}>
                {budget.category.icon}
              </ThemedText>
            </View>
            <View>
              <ThemedText variant='h2'>{budget.category.name} Budget</ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                {budget.frequency.charAt(0).toUpperCase() + budget.frequency.slice(1)} budget
              </ThemedText>
            </View>
          </View>

          <View style={[styles.budgetSummary, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryLabel}>Spent</ThemedText>
              <ThemedText style={[styles.summaryValue, totalSpent > budget.limit ? { color: '#F44336' } : null]}>
                ${totalSpent.toFixed(2)}
              </ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryLabel}>Limit</ThemedText>
              <ThemedText style={styles.summaryValue}>${budget.limit.toFixed(2)}</ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryLabel}>Remaining</ThemedText>
              <ThemedText style={[styles.summaryValue, remainingBudget < 0 ? { color: '#F44336' } : { color: '#4CAF50' }]}>
                ${remainingBudget.toFixed(2)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressBarWidth,
                    backgroundColor: progressColorInterpolation,
                  },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <ThemedText style={[styles.progress, { color: colors.textSecondary }]}>
                {progressPercentage.toFixed(1)}% used
              </ThemedText>
              <ThemedText style={[styles.dailyAverage, { color: colors.textSecondary }]}>
                ${dailyAverage.toFixed(2)}/day
              </ThemedText>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.insightsToggle, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
            onPress={() => setShowInsights(!showInsights)}
          >
            <ThemedText>
              {showInsights ? 'Hide Budget Insights' : 'Show Budget Insights'}
            </ThemedText>
            <FontAwesome
              name={showInsights ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.text}
            />
          </TouchableOpacity>

          {showInsights && (
            <View style={[styles.insightsContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <ThemedText style={styles.insightTitle}>Budget Insights</ThemedText>

              <View style={styles.insightRow}>
                <View style={styles.insightItem}>
                  <ThemedText style={styles.insightLabel}>Projected Spending</ThemedText>
                  <ThemedText style={[
                    styles.insightValue,
                    insights.overBudget ? { color: '#F44336' } : { color: '#4CAF50' }
                  ]}>
                    ${insights.projected.toFixed(2)}
                  </ThemedText>
                  {insights.overBudget && (
                    <ThemedText style={[styles.insightAlert, { color: '#F44336' }]}>
                      Over by ${insights.projectedOverage.toFixed(2)}
                    </ThemedText>
                  )}
                </View>

                <View style={styles.insightItem}>
                  <ThemedText style={styles.insightLabel}>Daily Allowance Left</ThemedText>
                  <ThemedText style={styles.insightValue}>
                    ${insights.dailyAllowance.toFixed(2)}
                  </ThemedText>
                  <ThemedText style={[styles.insightSubtext, { color: colors.textSecondary }]}>
                    for {insights.daysRemaining} days
                  </ThemedText>
                </View>
              </View>

              <View style={styles.insightRow}>
                <View style={styles.insightItem}>
                  <ThemedText style={styles.insightLabel}>Avg. Transaction</ThemedText>
                  <ThemedText style={styles.insightValue}>
                    ${insights.averagePerTransaction.toFixed(2)}
                  </ThemedText>
                </View>

                {insights.largestTransaction && (
                  <View style={styles.insightItem}>
                    <ThemedText style={styles.insightLabel}>Largest Expense</ThemedText>
                    <ThemedText style={styles.insightValue}>
                      ${insights.largestTransaction.amount.toFixed(2)}
                    </ThemedText>
                    <ThemedText style={[styles.insightSubtext, { color: colors.textSecondary }]}>
                      {format(new Date(insights.largestTransaction.date), 'MMM d')}
                    </ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.recommendationContainer}>
                <ThemedText style={[styles.recommendationTitle, { color: colors.accent }]}>
                  Recommendations
                </ThemedText>
                <ThemedText style={styles.recommendation}>
                  {insights.overBudget
                    ? `To stay under budget, limit spending to $${(remainingBudget / insights.daysRemaining).toFixed(2)} per day.`
                    : insights.percentOfLimit > 75
                      ? `You're at ${insights.percentOfLimit.toFixed(0)}% of your budget. Consider reducing expenses.`
                      : `You're on track with your ${budget.category.name} budget.`
                  }
                </ThemedText>
              </View>
            </View>
          )}

          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <ThemedText style={styles.chartTitle}>Spending History</ThemedText>
              <View style={styles.chartToggle}>
                <TouchableOpacity
                  style={[
                    styles.chartToggleButton,
                    chartView === 'line' && { backgroundColor: colors.accent }
                  ]}
                  onPress={() => setChartView('line')}
                >
                  <ThemedText style={chartView === 'line' ? { color: '#fff' } : null}>Line</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.chartToggleButton,
                    chartView === 'bar' && { backgroundColor: colors.accent }
                  ]}
                  onPress={() => setChartView('bar')}
                >
                  <ThemedText style={chartView === 'bar' ? { color: '#fff' } : null}>Bar</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {chartView === 'line' ? (
              <LineChart
                data={historicalData}
                height={150}
                width={SCREEN_WIDTH - 40}
                hideDataPoints={false}
                color={budget.category.color}
                thickness={2}
                startFillColor={budget.category.color}
                endFillColor={colors.background}
                startOpacity={0.4}
                endOpacity={0.1}
                initialSpacing={10}
                endSpacing={10}
                spacing={SCREEN_WIDTH / 10}
                yAxisThickness={1}
                yAxisColor={colors.border}
                yAxisTextStyle={{ color: colors.textSecondary }}
                xAxisColor={colors.border}
                xAxisThickness={1}
                xAxisTextStyle={{ color: colors.textSecondary }}
                pointerConfig={{
                  pointerStripHeight: 140,
                  pointerStripColor: colors.border,
                  pointerStripWidth: 2,
                  pointerColor: budget.category.color,
                  radius: 5,
                  pointerLabelWidth: 100,
                  pointerLabelHeight: 30,
                }}
              />
            ) : (
              <BarChart
                data={historicalData}
                height={150}
                width={SCREEN_WIDTH - 40}
                barWidth={SCREEN_WIDTH / 15}
                spacing={SCREEN_WIDTH / 24}
                roundedTop
                xAxisThickness={1}
                xAxisColor={colors.border}
                yAxisThickness={1}
                yAxisColor={colors.border}
                yAxisTextStyle={{ color: colors.textSecondary }}
                xAxisTextStyle={{ color: colors.textSecondary }}
                noOfSections={4}
                initialSpacing={10}
                endSpacing={10}
              />
            )}
          </View>
        </View>

        <View style={styles.transactionsContainer}>
          <ThemedText style={styles.sectionTitle}>Transactions</ThemedText>
          {periodTransactions.length > 0 ? (
            periodTransactions.map(transaction => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
              />
            ))
          ) : (
            <View style={[styles.emptyContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <ThemedText style={styles.emptyText}>No transactions in this period</ThemedText>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.accent }]}
                onPress={() => router.push('/transactions/add')}
              >
                <ThemedText style={styles.addButtonText}>Add Transaction</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigatePeriod('prev')}
          style={[styles.arrowButton, !canGoBack && styles.disabledButton]}
          disabled={!canGoBack}
        >
          <FontAwesome name="angle-left" size={24} color={canGoBack ? colors.accent : colors.textSecondary} />
        </TouchableOpacity>
        <ThemedText style={styles.dateRange}>{dateRangeText}</ThemedText>
        <TouchableOpacity
          onPress={() => navigatePeriod('next')}
          style={[styles.arrowButton, !canGoForward && styles.disabledButton]}
          disabled={!canGoForward}
        >
          <FontAwesome name="angle-right" size={24} color={canGoForward ? colors.accent : colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  categoryIcon: {
    fontSize: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  budgetSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  progress: {
    fontSize: 14,
  },
  dailyAverage: {
    fontSize: 14,
  },
  insightsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
  },
  insightsContainer: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  insightItem: {
    flex: 1,
  },
  insightLabel: {
    fontSize: 12,
    marginBottom: 3,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  insightSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  insightAlert: {
    fontSize: 12,
    marginTop: 2,
  },
  recommendationContainer: {
    marginTop: 5,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 5,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  recommendation: {
    fontSize: 14,
    lineHeight: 20,
  },
  chartContainer: {
    marginBottom: 15,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartToggle: {
    flexDirection: 'row',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chartToggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  transactionsContainer: {
    padding: 15,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  emptyText: {
    marginBottom: 15,
    textAlign: 'center',
  },
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderTopWidth: 1,
  },
  arrowButton: {
    padding: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  dateRange: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default BudgetDetailsScreen;