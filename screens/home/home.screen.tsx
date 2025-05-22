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
import { readHistoricalSMS, startSMSListener } from '@/services/smsParser';
import ExpenseChartWidget from '@/components/charts/ExpenseChartWidget';
import CustomLineChart, { PieChart } from '@/components/charts/CustomLineChart';
import BarChart from '@/components/charts/ExpenseChartWidget';
import { generateRandomChartData } from '@/components/charts/barchartData';
import LineChart from '@/components/charts/CustomLineChart';
import ReportChart from '@/components/charts/ReportChart';

const HomeScreen = () => {
    const { colors } = useTheme();
    const { transactions, fetchTransactions } = useTransactionStore();
    const { budgets, fetchBudgets } = useBudgetStore();
    const { recurringTransactions } = useRecurringTransactionStore();
    const { categories, fetchCategories } = useCategoryStore();
    let top5Transactions = transactions.slice(0, 5);

    useEffect(() => {
        fetchTransactions();
        fetchCategories();
        fetchBudgets();
    }, [])
    useEffect(() => {
        let subscription;

        const setupSMS = async () => {
            subscription = await startSMSListener();
        };

        setupSMS();

        return () => {
            // Clean up on component unmount
            if (subscription) {
                subscription.remove();
            }
        };
    }, []);

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

    // Calculate savings balance - assuming all income transactions of category 'Savings'
    // or we could track specific account transactions if your data model supports it
    const savingsBalance = useMemo(() => {
        return transactions
            .filter(t =>
                (t.type === 'income' && t.category.name === 'Savings') ||
                (t.type === 'transfer' && t.toAccount?.name === 'Savings')
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

    return (
        <View style={{ flex: 1, gap: 16 }}>
            {/* <View style={{ height: tokens.spacing.xxl }} /> */}
            <TotalBalance />
            <ExtraInfo />
            {/* <ExpenseChartWidget /> */}
            {/* <View style={{ paddingHorizontal: tokens.spacing.md, }}>
                <View style={{ backgroundColor: colors.card, borderRadius: tokens.borderRadius.md }}>
                    <CustomLineChart
                        data={data}
                        lineColor="#7269E3"
                        gradientColors={["#8F85FF", "#6E88F720"]}
                        chartHeight={250}
                        yLabelCount={5}
                        curved={true}
                        showDots={true}
                        animate={true}
                        labelColor={colors.subtitle}
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
    )
}

export default HomeScreen

const styles = StyleSheet.create({})