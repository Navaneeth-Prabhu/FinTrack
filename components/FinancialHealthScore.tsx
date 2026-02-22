// src/components/FinancialHealthScore.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Transaction, Budget } from '../types';
import { format } from 'date-fns';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from './common/ThemedText';
import { tokens } from '@/constants/theme';

interface FinancialHealthScoreProps {
    transactions: Transaction[];
    budgets: Budget[];
    onTipPress: (category: string) => void;
}

const FinancialHealthScore: React.FC<FinancialHealthScoreProps> = ({
    transactions,
    budgets,
    onTipPress,
}) => {

    const { colors } = useTheme();
    const scores = useMemo(() => {
        // Calculate Budget Management score
        const budgetScore = budgets.reduce((acc, budget) => {
            // If spending is within budget, give full points
            const ratio = budget.spent / budget.limit;
            return acc + (ratio <= 1 ? 25 : Math.max(0, 25 - (ratio - 1) * 50));
        }, 0) / Math.max(1, budgets.length);

        // Calculate Savings Rate
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const savingsRate = totalIncome > 0
            ? Math.min(100, Math.max(0, (totalIncome - totalExpenses) / totalIncome * 100))
            : 0;

        const savingsScore = savingsRate >= 20 ? 25 : (savingsRate / 20) * 25;

        // Calculate Expense Diversity
        const expensesByCategory = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => {
                const category = t.category.name;
                acc[category] = (acc[category] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);

        const categoryCount = Object.keys(expensesByCategory).length;
        const totalExpenseAmount = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);

        // Check if any category exceeds 50% of total expenses
        const hasUnbalancedCategory = Object.values(expensesByCategory)
            .some(amount => totalExpenseAmount > 0 && amount / totalExpenseAmount > 0.5);

        const diversityScore = categoryCount >= 4 && !hasUnbalancedCategory ? 25 :
            hasUnbalancedCategory ? 10 : (categoryCount / 4) * 25;

        // Calculate Financial Consistency (regular income/expense patterns)
        // Simple implementation: check if there are recurring transactions
        const hasRegularIncome = transactions.some(t => t.type === 'income' && t.recurringId);
        const hasRegularExpenses = transactions.some(t => t.type === 'expense' && t.recurringId);

        const consistencyScore = (hasRegularIncome && hasRegularExpenses) ? 25 :
            (hasRegularIncome || hasRegularExpenses) ? 15 : 0;

        // Total score
        const totalScore = Math.round(budgetScore + savingsScore + diversityScore + consistencyScore);

        return {
            total: totalScore,
            components: [
                {
                    name: 'Budget Management',
                    score: Math.round(budgetScore),
                    icon: '📊',
                },
                {
                    name: 'Savings Rate',
                    score: Math.round(savingsScore),
                    icon: '💰',
                },
                {
                    name: 'Expense Diversity',
                    score: Math.round(diversityScore),
                    icon: '🔄',
                },
                {
                    name: 'Financial Consistency',
                    score: Math.round(consistencyScore),
                    icon: '📆',
                },
            ],
        };
    }, [transactions, budgets]);

    // Determine status color
    const getStatusColor = (score: number) => {
        if (score >= 80) return '#4CAF50'; // Green
        if (score >= 60) return '#FFC107'; // Yellow
        if (score >= 40) return '#FF9800'; // Orange
        return '#F44336'; // Red
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <View style={styles.header}>
                <ThemedText variant='h2'>Financial Health Score</ThemedText>
                <Text style={[
                    styles.scoreValue,
                    { color: getStatusColor(scores.total) }
                ]}>
                    {scores.total}
                </Text>
            </View>

            <View style={styles.components}>
                {scores.components.map((component) => (
                    <TouchableOpacity
                        key={component.name}
                        style={styles.componentItem}
                        onPress={() => onTipPress(component.name)}
                    >
                        <Text style={styles.componentIcon}>{component.icon}</Text>
                        <ThemedText style={[styles.componentName, { color: colors.text }]}>{component.name}</ThemedText>
                        <Text style={[
                            styles.componentScore,
                            { color: getStatusColor(component.score * 4) }
                        ]}>
                            {component.score}/25
                        </Text>
                    </TouchableOpacity>
                ))}
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
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
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
    scoreValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    components: {
        marginTop: 8,
    },
    componentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    componentIcon: {
        fontSize: 18,
        marginRight: 12,
    },
    componentName: {
        flex: 1,
        fontSize: 15,
        color: '#555',
    },
    componentScore: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default FinancialHealthScore;
