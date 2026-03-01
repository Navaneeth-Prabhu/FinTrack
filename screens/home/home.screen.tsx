import { Alert, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useMemo } from 'react'
import { useMetricsStore } from '@/stores/metricsStore';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { Card } from '@/components/common/Card';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/theme';
import { useCategoryStore } from '@/stores/categoryStore';
import CategoryCard from '@/components/category/CategoryCard';
import { endOfMonth, isWithinInterval, startOfMonth, subMonths } from 'date-fns';
import FinancialSummaryCard from '@/components/FinancialSummaryCard';
import { useBudgetStore } from '@/stores/budgetStore';
import FinancialHealthScore from '@/components/FinancialHealthScore';
import SmartAlerts from '@/components/SmartAlerts';
import { useRecurringTransactionStore } from '@/stores/recurringTransactionStore';
import SmartBalanceForecast from '@/components/SmartBalanceForecast';
import SmartBudgetInterface from '@/components/SmartBudgetInterface';
import TotalBalance from '@/components/TotalBalance';
import { ExtraInfo } from '@/components/ExtraInfo';
// SMS functionality is handled centrally via smsService.ts and initialized in _layout.tsx
import ReportChart from '@/components/charts/ReportChart';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { AccountsList } from '@/components/accounts/AccountsList';
import { InsightsBanner } from '@/components/common/InsightsBanner';

const HomeScreen = () => {
    const { colors, isDark } = useTheme();

    // Fetch aggregated sqlite metrics instead of the entire transaction array
    const { dashboardMetrics, fetchDashboardMetrics } = useMetricsStore();
    const { budgets, fetchBudgets } = useBudgetStore();
    const { recurringTransactions } = useRecurringTransactionStore();
    const { fetchCategories } = useCategoryStore();

    // Get the natively fetched recent 5 transactions
    let top5Transactions = dashboardMetrics?.recentTransactions || [];

    useEffect(() => {
        const loadData = async () => {
            try {
                await Promise.all([
                    fetchDashboardMetrics(),
                    fetchCategories(),
                    fetchBudgets()
                ]);
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };
        loadData();
    }, []);
    // SMS listener removed - SMS functionality is centralized in smsService.ts
    // and initialized in app/_layout.tsx via initializeSMSFeatures()

    const handleTipPress = (category: string) => {
        // Here you would navigate to a detailed tips screen
        // For now, just show an alert with additional tips
        const tips = {
            'Budget Management': [
                'Review your highest expense categories and look for ways to reduce them',
                'Set up budget alerts to notify you when youre approaching your limit',
                'Use the 50/30/20 rule: 50% for needs, 30% for wants, 20% for savings'
            ],
            'Savings Rate': [
                'Set up automatic transfers to savings on payday',
                'Try the "pay yourself first" method by saving before spending',
                'Look for areas to reduce spending and redirect to savings'
            ],
            'Expense Diversity': [
                'Track spending in each category to identify imbalances',
                'Aim for balanced spending across essentials, lifestyle, and future goals',
                'Avoid having any single category dominate your expenses'
            ],
            'Financial Consistency': [
                'Schedule regular bill payments to avoid late fees',
                'Set up recurring transfers for savings and investments',
                'Review your finances on a weekly basis to stay on track'
            ]
        };

        Alert.alert(
            `${category} Tips`,
            tips[category as keyof typeof tips].join('\n\n'),
            [{ text: 'Got it!' }]
        );
    };


    // Detect light theme by checking if background color is very bright (e.g., starts with #f or #e)
    const isLightTheme = /^#(f|e|c|d)/i.test(colors.background);

    return (
        <View style={{ flex: 1 }}>
            {isLightTheme && (
                <LinearGradient
                    colors={["#8662e6", "#f7f7f7", "transparent"]}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', zIndex: 0 }}
                    pointerEvents="none"
                />
            )}
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View style={{ flex: 1, gap: 24 }}>
                <View style={{ height: tokens.spacing.xxl }} />
                <TotalBalance />
                <ExtraInfo />

                {/* Account Balances List Component */}
                <AccountsList />

                {/* Smart Insights generated from offline local transactions */}
                <InsightsBanner />

                <ReportChart />
                <View style={{
                    backgroundColor: colors.background, borderRadius: tokens.borderRadius.md, overflow: 'hidden',
                    marginHorizontal: tokens.spacing.md,
                }}>
                    {
                        top5Transactions.map((item, index) => (
                            <View
                                key={item.id}
                                style={{
                                    borderBottomColor: colors.background,
                                    borderBottomWidth: index === top5Transactions.length - 1 ? 0 : 2,
                                    backgroundColor: colors.card,
                                    paddingHorizontal: tokens.spacing.md,
                                    paddingVertical: 4,

                                }}>
                                <TransactionItem
                                    key={item.id}
                                    transaction={item}
                                    dateFormate={'MMM dd, yyyy'}
                                // isUpcoming={section.isUpcoming}
                                />
                            </View>
                        ))
                    }
                </View>

                <CategoryCard type='30Days' />

                <FinancialSummaryCard
                    budgets={budgets}
                    savingsBalance={dashboardMetrics?.savingsBalance || 0}
                />

                <FinancialHealthScore
                    budgets={budgets}
                    onTipPress={handleTipPress}
                />

                <SmartAlerts
                    recurringTransactions={recurringTransactions}
                />

                <SmartBalanceForecast
                    transactions={dashboardMetrics?.recentTransactions || []}
                    recurringTransactions={recurringTransactions}
                    currentBalance={dashboardMetrics?.currentBalance || 0}
                />
            </View>
        </View>
    )
}

export default HomeScreen

const styles = StyleSheet.create({})
