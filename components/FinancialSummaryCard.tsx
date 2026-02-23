// src/components/FinancialSummaryCard.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMetricsStore } from '@/stores/metricsStore';
import { Budget } from '../types';
import { ThemedText } from './common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/theme';

interface FinancialSummaryCardProps {
    budgets: Budget[];
    savingsBalance: number;
}

const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({
    budgets,
    savingsBalance,
}) => {
    const { colors } = useTheme();
    const { dashboardMetrics } = useMetricsStore();

    // Use fast pre-calculated metrics from SQLite
    const currentMonthSpending = dashboardMetrics?.currentMonthSpending || 0;
    const previousMonthSpending = dashboardMetrics?.previousMonthSpending || 0;

    // Calculate total budget and current-period spent from pre-aggregated SQL map
    const { totalBudget, totalSpent } = useMemo(() => {
        if (!dashboardMetrics) return { totalBudget: 0, totalSpent: 0 };

        return budgets.reduce((acc, budget) => {
            const spentForBudgetCategory = dashboardMetrics.expensesByBudgetCategory[budget.category.id] || 0;
            return {
                totalBudget: acc.totalBudget + budget.limit,
                totalSpent: acc.totalSpent + spentForBudgetCategory,
            };
        }, { totalBudget: 0, totalSpent: 0 });
    }, [budgets, dashboardMetrics]);

    // Calculate remaining budget
    const remainingBudget = totalBudget - totalSpent;

    // Calculate budget progress percentage
    const budgetProgressPercentage = totalBudget > 0
        ? Math.min((totalSpent / totalBudget) * 100, 100)
        : 0;

    // Determine spending trend
    const spendingTrend = currentMonthSpending - previousMonthSpending;
    const isSpendingIncreased = spendingTrend > 0;
    const spendingTrendIcon = isSpendingIncreased
        ? { name: 'arrow-up', color: '#DB5A42' }
        : { name: 'arrow-down', color: '#4CAF50' };

    // Format currency
    const formatCurrency = (amount: number) => {
        return `$${amount.toFixed(2)}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <ThemedText variant='h2'>Financial Summary</ThemedText>

            {/* Monthly Spending Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Monthly Spending</Text>
                    <View style={[styles.trendContainer, { backgroundColor: colors.accent }]}>
                        <Ionicons name={spendingTrendIcon.name as any} size={16} color={spendingTrendIcon.color} />
                        <ThemedText style={[styles.trendText, { color: spendingTrendIcon.color }]}>
                            {Math.abs(spendingTrend).toFixed(2)}
                        </ThemedText>
                    </View>
                </View>
                <ThemedText variant='h2'>{formatCurrency(currentMonthSpending)}</ThemedText>
            </View>

            {/* Budget Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Available Budget</Text>
                    <Text style={styles.remainingText}>{formatCurrency(remainingBudget)}</Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                    <View
                        style={[
                            styles.progressBar,
                            { width: `${budgetProgressPercentage}%` },
                            budgetProgressPercentage > 80 ? styles.progressBarWarning : {}
                        ]}
                    />
                </View>
                <View style={styles.budgetTextContainer}>
                    <Text style={styles.budgetText}>{formatCurrency(totalSpent)}</Text>
                    <Text style={styles.budgetText}>{formatCurrency(totalBudget)}</Text>
                </View>
            </View>

            {/* Savings Balance Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Savings Balance</Text>
                <ThemedText variant='h2'>{formatCurrency(savingsBalance)}</ThemedText>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.1,
        // shadowRadius: 4,
        // elevation: 2,
        marginHorizontal: tokens.spacing.md,
        // marginVertical: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#333333',
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 14,
        color: '#666666',
        fontWeight: '500',
    },
    amountText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333333',
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    progressBarWarning: {
        backgroundColor: '#FF9800',
    },
    budgetTextContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    budgetText: {
        fontSize: 12,
        color: '#666666',
    },
    remainingText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4CAF50',
    },
});

export default FinancialSummaryCard;
