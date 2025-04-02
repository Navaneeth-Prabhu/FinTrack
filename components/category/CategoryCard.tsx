import { StyleSheet, TouchableOpacity, View } from 'react-native';
import React, { useMemo } from 'react';
import { endOfMonth, isWithinInterval, startOfMonth, subDays } from 'date-fns';
import { ThemedText } from '../common/ThemedText';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';
import { Transaction } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { useTransactionStore } from '@/stores/transactionStore';
import CategoryBar from './CategoryBar';
import { tokens } from '@/constants/theme';

// Define the data structure for category progress
interface CategoryProgress {
    label: string;
    value: number;
    color: string;
}

interface CategoryCardProps {
    month?: Date;
    type: 'Week' | '30Days' | 'Month';
}

// Separate utility functions from the component
const getCategoryTotals = (transactions: Transaction[], filterFn: (transaction: Transaction) => boolean): Record<string, { value: number; color: string }> => {
    const filteredTransactions = transactions.filter(filterFn);
    const categoryTotals: Record<string, { value: number; color: string }> = {};

    filteredTransactions.forEach(transaction => {
        const categoryName = transaction.category.name;
        const amount = transaction.amount;
        const categoryColor = transaction.category.color;

        if (categoryTotals[categoryName]) {
            categoryTotals[categoryName].value += amount;
        } else {
            categoryTotals[categoryName] = {
                value: amount,
                color: categoryColor
            };
        }
    });

    return categoryTotals;
};

const transformToProgressData = (categoryTotals: Record<string, { value: number; color: string }>): CategoryProgress[] => {
    return Object.keys(categoryTotals).map(key => ({
        label: key,
        value: categoryTotals[key].value,
        color: categoryTotals[key].color
    }));
};

const CategoryCard: React.FC<CategoryCardProps> = ({ month = new Date(), type }) => {
    const { colors } = useTheme();
    const { transactions } = useTransactionStore();
    // Use useMemo to prevent recalculations on every render
    const progressData = useMemo(() => {
        const isExpense = (transaction: Transaction) => transaction.type === "expense";

        if (type === 'Week') {
            const now = new Date();
            const sevenDaysAgo = subDays(now, 7);

            const isInLastWeek = (transaction: Transaction) => {
                const entryDate = new Date(transaction.date);
                return isWithinInterval(entryDate, { start: sevenDaysAgo, end: now }) && isExpense(transaction);
            };

            const categoryTotals = getCategoryTotals(transactions, isInLastWeek);
            return transformToProgressData(categoryTotals);
        }
        else if (type === '30Days') {
            const now = new Date();
            const thirtyDaysAgo = subDays(now, 30);

            const isInLast30Days = (transaction: Transaction) => {
                const entryDate = new Date(transaction.date);
                return isWithinInterval(entryDate, { start: thirtyDaysAgo, end: now }) && isExpense(transaction);
            };

            const categoryTotals = getCategoryTotals(transactions, isInLast30Days);
            return transformToProgressData(categoryTotals);
        }
        else {
            // Month view
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);

            const isInSelectedMonth = (transaction: Transaction) => {
                const entryDate = new Date(transaction.date);
                return isWithinInterval(entryDate, { start: monthStart, end: monthEnd }) && isExpense(transaction);
            };

            const categoryTotals = getCategoryTotals(transactions, isInSelectedMonth);
            return transformToProgressData(categoryTotals);
        }
    }, [transactions, type, month]); // Dependencies for useMemo

    // Only render if we have data
    if (progressData.length === 0) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border
                }
            ]}
        >
            <View style={styles.header}>
                <ThemedText
                    variant='h3'
                    style={{ color: colors.cardForeground, fontSize: 18 }}
                >
                    Category info
                </ThemedText>
                <TouchableOpacity onPress={() => router.push('/(routes)/category/categoryRecords')}>
                    <ThemedText
                        style={{ color: colors.cardForeground, fontSize: 14 }}
                    >
                        see more
                    </ThemedText>
                </TouchableOpacity>
            </View>
            <CategoryBar data={progressData} />
        </Animated.View>
    );
};

export default React.memo(CategoryCard);

const styles = StyleSheet.create({
    container: {
        padding: 16,
        justifyContent: 'center',
        borderRadius: 10,
        marginHorizontal: tokens.spacing.md
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 18
    }
});