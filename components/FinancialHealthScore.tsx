// src/components/FinancialHealthScore.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useMetricsStore } from '@/stores/metricsStore';
import { Budget } from '../types';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from './common/ThemedText';
import { tokens } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface FinancialHealthScoreProps {
    budgets: Budget[];
    onTipPress: (category: string) => void;
}

const FinancialHealthScore: React.FC<FinancialHealthScoreProps> = ({
    budgets,
    onTipPress,
}) => {
    const { colors, isDark } = useTheme();
    const { dashboardMetrics } = useMetricsStore();

    const scores = useMemo(() => {
        if (!dashboardMetrics) {
            return { total: 0, components: [] };
        }

        const {
            totalIncome,
            totalExpenses,
            expensesByCategory,
            expensesByBudgetCategory,
            hasRegularIncome,
            hasRegularExpenses
        } = dashboardMetrics;

        // Calculate Budget Management score
        const budgetScore = budgets.length > 0 ? budgets.reduce((acc, budget) => {
            const spent = expensesByBudgetCategory[budget.category.id] || 0;
            const ratio = spent / budget.limit;
            return acc + (ratio <= 1 ? 25 : Math.max(0, 25 - (ratio - 1) * 50));
        }, 0) / Math.max(1, budgets.length) : 0;

        // Calculate Savings Rate
        const savingsRate = totalIncome > 0
            ? Math.min(100, Math.max(0, (totalIncome - totalExpenses) / totalIncome * 100))
            : 0;

        const savingsScore = savingsRate >= 20 ? 25 : (savingsRate / 20) * 25;

        // Calculate Expense Diversity
        const categoryCount = Object.keys(expensesByCategory).length;
        const totalExpenseAmount = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);

        const hasUnbalancedCategory = Object.values(expensesByCategory)
            .some(amount => totalExpenseAmount > 0 && amount / totalExpenseAmount > 0.5);

        const diversityScore = categoryCount >= 4 && !hasUnbalancedCategory ? 25 :
            hasUnbalancedCategory ? 10 : (categoryCount / 4) * 25;

        // Calculate Financial Consistency
        const consistencyScore = (hasRegularIncome && hasRegularExpenses) ? 25 :
            (hasRegularIncome || hasRegularExpenses) ? 15 : 0;

        const totalScore = Math.round(budgetScore + savingsScore + diversityScore + consistencyScore);

        return {
            total: totalScore,
            components: [
                {
                    name: 'Budget Management',
                    score: Math.round(budgetScore),
                    icon: 'chart-pie',
                    color: '#8B5CF6', // Purple
                },
                {
                    name: 'Savings Rate',
                    score: Math.round(savingsScore),
                    icon: 'piggy-bank',
                    color: '#10B981', // Emerald
                },
                {
                    name: 'Expense Diversity',
                    score: Math.round(diversityScore),
                    icon: 'chart-donut',
                    color: '#F59E0B', // Amber
                },
                {
                    name: 'Financial Consistency',
                    score: Math.round(consistencyScore),
                    icon: 'calendar-check',
                    color: '#3B82F6', // Blue
                },
            ],
        };
    }, [dashboardMetrics, budgets]);

    // Determine status text and colors
    const getStatusInfo = (score: number) => {
        if (score >= 80) return { text: 'Excellent', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' }; // Emerald
        if (score >= 60) return { text: 'Good', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' }; // Blue
        if (score >= 40) return { text: 'Fair', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' }; // Amber
        return { text: 'Needs Work', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' }; // Red
    };

    const statusInfo = getStatusInfo(scores.total);

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: colors.card,
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            }
        ]}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="heart-pulse" size={24} color={colors.text} />
                    </View>
                    <View>
                        <ThemedText style={styles.title}>Financial Health</ThemedText>
                        <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
                            <Text style={[styles.badgeText, { color: statusInfo.color }]}>
                                {statusInfo.text}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Main Score Display */}
                <View style={styles.scoreCircleContainer}>
                    <View style={[styles.scoreCircleBg, { borderColor: statusInfo.bg }]}>
                        <Text style={[styles.scoreValue, { color: statusInfo.color }]}>
                            {scores.total}
                        </Text>
                        <Text style={styles.scoreSubtext}>/ 100</Text>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.components}>
                {scores.components.map((component, index) => (
                    <TouchableOpacity
                        key={component.name}
                        style={[
                            styles.componentItem,
                            index === scores.components.length - 1 && styles.lastComponentItem
                        ]}
                        onPress={() => onTipPress(component.name)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.componentIconWrapper}>
                            <View style={[styles.componentIconBg, { backgroundColor: component.color + '20' }]}>
                                <MaterialCommunityIcons
                                    name={component.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                                    size={20}
                                    color={component.color}
                                />
                            </View>
                            <ThemedText style={[styles.componentName, { color: colors.text }]}>
                                {component.name}
                            </ThemedText>
                        </View>

                        <View style={styles.componentScoreWrapper}>
                            <Text style={[
                                styles.componentScore,
                                { color: getStatusInfo(component.score * 4).color }
                            ]}>
                                {component.score}
                            </Text>
                            <Text style={styles.componentScoreMax}>/25</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        padding: 20,
        marginHorizontal: tokens.spacing.md,
        marginVertical: tokens.spacing.sm,
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(150, 150, 150, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    scoreCircleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreCircleBg: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent', // The border creates the ring
    },
    scoreValue: {
        fontSize: 26,
        fontWeight: '800',
        lineHeight: 30,
    },
    scoreSubtext: {
        fontSize: 10,
        color: '#888',
        fontWeight: '600',
        marginTop: -2,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(150, 150, 150, 0.15)',
        marginBottom: 16,
    },
    components: {
        gap: 12,
    },
    componentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    lastComponentItem: {
        borderBottomWidth: 0,
    },
    componentIconWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    componentIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    componentName: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    componentScoreWrapper: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    componentScore: {
        fontSize: 16,
        fontWeight: '800',
    },
    componentScoreMax: {
        fontSize: 12,
        color: '#aaa',
        fontWeight: '600',
        marginLeft: 2,
    },
});

export default FinancialHealthScore;
