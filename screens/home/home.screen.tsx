import { Alert, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useMemo } from 'react'
import { useTransactionStore } from '@/stores/transactionStore'
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
import ExpenseChartWidget from '@/components/charts/ExpenseChartWidget';
import CustomLineChart from '@/components/charts/CustomLineChart';
import BarChart from '@/components/charts/ExpenseChartWidget';
import { generateRandomChartData } from '@/components/charts/barchartData';
import LineChart from '@/components/charts/CustomLineChart';
import ReportChart from '@/components/charts/ReportChart';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'react-native';

const HomeScreen = () => {
    const { colors } = useTheme();
    const { transactions, fetchTransactions } = useTransactionStore();
    const { budgets, fetchBudgets } = useBudgetStore();
    const { recurringTransactions } = useRecurringTransactionStore();
    const { categories, fetchCategories } = useCategoryStore();
    let top5Transactions = transactions.slice(0, 5);

    useEffect(() => {
        const loadData = async () => {
            try {
                await Promise.all([
                    fetchTransactions(),
                    fetchCategories(),
                    fetchBudgets()
                ]);
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };
        loadData();
    }, [])
    // SMS listener removed - SMS functionality is centralized in smsService.ts
    // and initialized in app/_layout.tsx via initializeSMSFeatures()

    // Calculate previous month's spending using date-fns
    const previousMonthSpending = useMemo(() => {
        const now = new Date();
        const previousMonth = subMonths(now, 1);
        const previousMonthStart = startOfMonth(previousMonth);
        const previousMonthEnd = endOfMonth(previousMonth);

        return transactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                return (
                    t.type === 'expense' &&
                    isWithinInterval(transactionDate, {
                        start: previousMonthStart,
                        end: previousMonthEnd
                    })
                );
            })
            .reduce((sum, t) => sum + t.amount, 0);
    }, [transactions]);

    // Calculate savings balance from savings/investment related inflows.
    const savingsBalance = useMemo(() => {
        const hasSavingsKeyword = (value?: string | null) =>
            value?.toLowerCase().includes('saving') ?? false;

        return transactions
            .filter(t =>
                (t.type === 'income' && (
                    hasSavingsKeyword(t.category?.name) ||
                    hasSavingsKeyword(t.toAccount?.name) ||
                    hasSavingsKeyword(t.mode)
                )) ||
                (t.type === 'transfer' && hasSavingsKeyword(t.toAccount?.name)) ||
                t.type === 'investment'
            )
            .reduce((sum, t) => sum + t.amount, 0);
    }, [transactions]);

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

    const data = [
        { label: 'Jan', value: 125 },
        { label: 'Feb', value: 220 },
        { label: 'Mar', value: 180 },
        { label: 'Apr', value: 250 },
        { label: 'May', value: 310 },
        { label: 'Jun', value: 190 },
        { label: 'Jul', value: 270 },
    ];

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
            <StatusBar translucent backgroundColor="#8662e6" barStyle={isLightTheme ? 'dark-content' : 'light-content'} />
            <View style={{ flex: 1, gap: 24 }}>
                <View style={{ height: tokens.spacing.xxl }} />
                <TotalBalance />
                <ExtraInfo />
                {/* <ExpenseChartWidget /> */}
                {/* <View style={{ paddingHorizontal: tokens.spacing.md, }}>
                    <View style={{ backgroundColor: colors.card, borderRadius: tokens.borderRadius.md }}>
                        <CustomLineChart
                            data={data}
                            lineColor={colors.primary}
                            gradientColors={["#8662e6", "#6E88F720"]}
                            chartHeight={250}
                            yLabelCount={5}
                            curved={true}
                            showDots={true}
                            animate={true}
                            labelColor={colors.subtitle}
                            titleColor={colors.text}
                        />
                    </View>
                </View> */}
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
                    transactions={transactions}
                    budgets={budgets}
                    savingsBalance={savingsBalance}
                    previousMonthSpending={previousMonthSpending}
                />

                <FinancialHealthScore
                    transactions={transactions}
                    budgets={budgets}
                    onTipPress={handleTipPress}
                />

                <SmartAlerts
                    transactions={transactions}
                    recurringTransactions={recurringTransactions}
                />

                {/* <SmartBalanceForecast
                    transactions={transactions}
                    recurringTransactions={recurringTransactions}
                    currentBalance={savingsBalance}
                /> */}

                {/* <SmartBudgetInterface /> */}
            </View>
        </View>
    )
}

export default HomeScreen

const styles = StyleSheet.create({})
