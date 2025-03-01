// // src/components/FinancialHealthScore.tsx
// import React, { useMemo } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { Transaction, Budget } from '../types';

// interface FinancialHealthScoreProps {
//     transactions: Transaction[];
//     budgets: Budget[];
//     onTipPress?: (category: string) => void;
// }

// type HealthMetric = {
//     category: string;
//     score: number;
//     status: 'excellent' | 'good' | 'fair' | 'poor';
//     tip: string;
//     icon: string;
// };

// const FinancialHealthScore: React.FC<FinancialHealthScoreProps> = ({
//     transactions,
//     budgets,
//     onTipPress,
// }) => {
//     // Calculate financial metrics and overall health score
//     const { overallScore, metrics } = useMemo(() => {
//         // Calculate budget utilization (lower is better)
//         const budgetUtilization = budgets.length > 0
//             ? budgets.reduce((sum, budget) => sum + (budget.spent / budget.limit), 0) / budgets.length
//             : 1;

//         const budgetScore = Math.min(100, Math.max(0, 100 - (budgetUtilization * 100)));

//         // Calculate savings rate (higher is better)
//         const totalIncome = transactions
//             .filter(t => t.type === 'income')
//             .reduce((sum, t) => sum + t.amount, 0);

//         const totalSavings = transactions
//             .filter(t => t.type === 'income' && t.category.name === 'Savings')
//             .reduce((sum, t) => sum + t.amount, 0);

//         const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) : 0;
//         const savingsScore = Math.min(100, savingsRate * 100);

//         // Calculate expense diversity (higher is better)
//         const expenseCategories = new Set(
//             transactions
//                 .filter(t => t.type === 'expense')
//                 .map(t => t.category.id)
//         );

//         const expenseDiversityScore = Math.min(100, expenseCategories.size * 10);

//         // Calculate consistency score based on recurring transactions
//         const recurringCount = transactions
//             .filter(t => t.recurringId !== undefined)
//             .length;

//         const consistencyScore = Math.min(100, recurringCount * 5);

//         // Define health metrics with calculated scores
//         const healthMetrics: HealthMetric[] = [
//             {
//                 category: 'Budget Management',
//                 score: Math.round(budgetScore),
//                 status: getStatus(budgetScore),
//                 tip: 'Try to stay under 80% of your monthly budget in each category.',
//                 icon: 'wallet-outline',
//             },
//             {
//                 category: 'Savings Rate',
//                 score: Math.round(savingsScore),
//                 status: getStatus(savingsScore),
//                 tip: 'Aim to save at least 20% of your monthly income.',
//                 icon: 'trending-up-outline',
//             },
//             {
//                 category: 'Expense Diversity',
//                 score: Math.round(expenseDiversityScore),
//                 status: getStatus(expenseDiversityScore),
//                 tip: 'Balance your spending across different categories.',
//                 icon: 'pie-chart-outline',
//             },
//             {
//                 category: 'Financial Consistency',
//                 score: Math.round(consistencyScore),
//                 status: getStatus(consistencyScore),
//                 tip: 'Set up recurring transactions for predictable expenses.',
//                 icon: 'repeat-outline',
//             },
//         ];

//         // Calculate overall score (weighted average)
//         const weights = [0.4, 0.3, 0.15, 0.15]; // Budget and savings weighted higher
//         const overall = healthMetrics.reduce(
//             (sum, metric, index) => sum + (metric.score * weights[index]),
//             0
//         );

//         return {
//             overallScore: Math.round(overall),
//             metrics: healthMetrics,
//         };
//     }, [transactions, budgets]);

//     // Helper function to determine status based on score
//     function getStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
//         if (score >= 80) return 'excellent';
//         if (score >= 60) return 'good';
//         if (score >= 40) return 'fair';
//         return 'poor';
//     }

//     // Helper function to get color based on status
//     function getStatusColor(status: 'excellent' | 'good' | 'fair' | 'poor'): string {
//         switch (status) {
//             case 'excellent': return '#4CAF50';
//             case 'good': return '#8BC34A';
//             case 'fair': return '#FFC107';
//             case 'poor': return '#F44336';
//         }
//     }

//     // Get overall status
//     const overallStatus = getStatus(overallScore);
//     const overallColor = getStatusColor(overallStatus);

//     // Find the metric with the lowest score for improvement focus
//     const focusArea = [...metrics].sort((a, b) => a.score - b.score)[0];

//     return (
//         <View style={styles.container}>
//             <Text style={styles.cardTitle}>Financial Health Score</Text>

//             {/* Score Circle */}
//             <View style={styles.scoreContainer}>
//                 <View style={[styles.scoreCircle, { borderColor: overallColor }]}>
//                     <Text style={[styles.scoreText, { color: overallColor }]}>{overallScore}</Text>
//                     <Text style={styles.scoreLabel}>{overallStatus}</Text>
//                 </View>
//             </View>

//             {/* Key Metrics */}
//             <View style={styles.metricsContainer}>
//                 {metrics.map((metric) => (
//                     <View key={metric.category} style={styles.metricRow}>
//                         <View style={styles.metricIconContainer}>
//                             <Ionicons name={metric.icon as any} size={18} color={getStatusColor(metric.status)} />
//                         </View>
//                         <View style={styles.metricDetails}>
//                             <View style={styles.metricHeader}>
//                                 <Text style={styles.metricTitle}>{metric.category}</Text>
//                                 <Text style={[styles.metricScore, { color: getStatusColor(metric.status) }]}>
//                                     {metric.score}
//                                 </Text>
//                             </View>
//                             <View style={[styles.progressBar, { backgroundColor: '#F0F0F0' }]}>
//                                 <View
//                                     style={[
//                                         styles.progressFill,
//                                         {
//                                             width: `${metric.score}%`,
//                                             backgroundColor: getStatusColor(metric.status)
//                                         }
//                                     ]}
//                                 />
//                             </View>
//                         </View>
//                     </View>
//                 ))}
//             </View>

//             {/* Improvement Tips */}
//             <View style={styles.tipsContainer}>
//                 <Text style={styles.tipsTitle}>Focus Area</Text>
//                 <View style={styles.tipCard}>
//                     <View style={styles.tipHeader}>
//                         <Ionicons
//                             name={focusArea.icon as any}
//                             size={20}
//                             color={getStatusColor(focusArea.status)}
//                         />
//                         <Text style={styles.tipCategory}>{focusArea.category}</Text>
//                     </View>
//                     <Text style={styles.tipText}>{focusArea.tip}</Text>
//                     <TouchableOpacity
//                         style={styles.tipButton}
//                         onPress={() => onTipPress?.(focusArea.category)}
//                     >
//                         <Text style={styles.tipButtonText}>Get More Tips</Text>
//                     </TouchableOpacity>
//                 </View>
//             </View>
//         </View>
//     );
// };

// const styles = StyleSheet.create({
//     container: {
//         backgroundColor: '#FFFFFF',
//         borderRadius: 16,
//         padding: 20,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         elevation: 2,
//         marginHorizontal: 16,
//         marginVertical: 8,
//     },
//     cardTitle: {
//         fontSize: 18,
//         fontWeight: '600',
//         marginBottom: 16,
//         color: '#333333',
//     },
//     scoreContainer: {
//         alignItems: 'center',
//         marginBottom: 20,
//     },
//     scoreCircle: {
//         width: 100,
//         height: 100,
//         borderRadius: 50,
//         borderWidth: 6,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     scoreText: {
//         fontSize: 32,
//         fontWeight: '700',
//     },
//     scoreLabel: {
//         fontSize: 14,
//         color: '#666666',
//         textTransform: 'capitalize',
//     },
//     metricsContainer: {
//         marginBottom: 20,
//     },
//     metricRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 14,
//     },
//     metricIconContainer: {
//         width: 32,
//         height: 32,
//         borderRadius: 16,
//         backgroundColor: '#F5F5F5',
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginRight: 12,
//     },
//     metricDetails: {
//         flex: 1,
//     },
//     metricHeader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginBottom: 4,
//     },
//     metricTitle: {
//         fontSize: 14,
//         color: '#333333',
//     },
//     metricScore: {
//         fontSize: 14,
//         fontWeight: '600',
//     },
//     progressBar: {
//         height: 4,
//         borderRadius: 2,
//         overflow: 'hidden',
//     },
//     progressFill: {
//         height: '100%',
//         borderRadius: 2,
//     },
//     tipsContainer: {
//         marginTop: 8,
//     },
//     tipsTitle: {
//         fontSize: 16,
//         fontWeight: '600',
//         marginBottom: 12,
//         color: '#333333',
//     },
//     tipCard: {
//         backgroundColor: '#F8F8F8',
//         borderRadius: 12,
//         padding: 16,
//     },
//     tipHeader: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 8,
//     },
//     tipCategory: {
//         fontSize: 15,
//         fontWeight: '600',
//         marginLeft: 8,
//         color: '#333333',
//     },
//     tipText: {
//         fontSize: 14,
//         color: '#666666',
//         marginBottom: 12,
//         lineHeight: 20,
//     },
//     tipButton: {
//         backgroundColor: '#F0F0F0',
//         borderRadius: 8,
//         padding: 10,
//         alignItems: 'center',
//     },
//     tipButtonText: {
//         fontSize: 14,
//         fontWeight: '500',
//         color: '#555555',
//     },
// });

// export default FinancialHealthScore;
// src/components/FinancialHealthScore.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Transaction, Budget } from '../types';
import { format } from 'date-fns';

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
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Financial Health Score</Text>
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
                        <Text style={styles.componentName}>{component.name}</Text>
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
