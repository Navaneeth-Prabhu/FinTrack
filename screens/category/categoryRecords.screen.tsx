import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Dimensions, Text } from 'react-native';
import { addMonths, endOfMonth, format, isSameMonth, isSameYear, isWithinInterval, startOfMonth } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { useTransactionStore } from '@/stores/transactionStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { ThemedText } from '@/components/common/ThemedText';
import CategoryBar from '@/components/category/CategoryBar';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width / 2 - 24;

const CategoryRecordScreen = () => {
    const { colors } = useTheme();
    const router = useRouter();
    const { transactions } = useTransactionStore();
    const { budgets } = useBudgetStore();
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Memoized data calculations
    const {
        filteredTransactions,
        activeBudgets,
        budgetCategories,
        noBudgetCategories,
        progressData
    } = useMemo(() => {
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);

        // Filter transactions
        const filtered = transactions.filter((item) => {
            const transactionDate = new Date(item.date);
            return isSameMonth(transactionDate, selectedDate) &&
                isSameYear(transactionDate, selectedDate);
        });

        // Filter active budgets
        const active = budgets.filter((budget) => {
            const startDate = new Date(budget.startDate);
            const endDate = new Date(budget.endDate);
            return selectedDate >= startDate && selectedDate <= endDate;
        });

        // Build budget map and transaction map
        const budgetMap = new Map(active.map(b => [b.category.id, b]));
        const transactionMap = new Map();

        filtered.forEach(t => {
            const categoryId = t.category.id;
            const existing = transactionMap.get(categoryId) || {
                totalSpent: 0,
                count: 0,
                ...t.category
            };
            existing.totalSpent += t.amount;
            existing.count += 1;
            transactionMap.set(categoryId, existing);
        });

        // Categorize transactions
        const budgetCats = [];
        const noBudgetCats = [];

        transactionMap.forEach((data, id) => {
            const budget = budgetMap.get(id);
            const category = {
                id,
                ...data,
                allocatedBudget: budget?.limit || 0,
                isBudget: !!budget
            };
            (budget ? budgetCats : noBudgetCats).push(category);
        });

        // Add budgets with no transactions
        budgetMap.forEach((budget, id) => {
            if (!transactionMap.has(id)) {
                budgetCats.push({
                    id,
                    ...budget.category,
                    totalSpent: 0,
                    count: 0,
                    allocatedBudget: budget.limit,
                    isBudget: true
                });
            }
        });

        // Calculate progress data
        const expenseTransactions = filtered.filter(t => t.type === "expense");
        const categoryTotals = expenseTransactions.reduce((acc, t) => {
            const catName = t.category.name;
            acc[catName] = acc[catName] || { value: 0, color: t.category.color };
            acc[catName].value += t.amount;
            return acc;
        }, {});

        const progress = Object.entries(categoryTotals).map(([label, data]) => ({
            label,
            ...data
        }));

        return {
            filteredTransactions: filtered,
            activeBudgets: active,
            budgetCategories: budgetCats,
            noBudgetCategories: noBudgetCats,
            progressData: progress
        };
    }, [transactions, budgets, selectedDate]);

    const handleMonthChange = (months: number) => {
        setSelectedDate(prev => addMonths(prev, months));
    };

    const renderCategoryCard = ({ item }) => {
        const spendingPercentage = item.isBudget
            ? Math.min((item.totalSpent / item.allocatedBudget) * 100, 100)
            : 0;

        const progressColor = spendingPercentage >= 100 ? '#FF4444'
            : spendingPercentage >= 80 ? '#FFA500'
                : item.color;

        return (
            <TouchableOpacity
                style={styles.itemContainer}
                onPress={() => router.push({
                    pathname: '/(routes)category/categoryDetails/[id]',
                    params: {
                        id: item.id,
                        month: selectedDate.toISOString(),
                        category: item.name
                    }
                })}
            >
                <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.themeBorder }]}>
                    <View style={[
                        styles.iconContainer,
                        { borderColor: item.color, backgroundColor: colors.card }
                    ]}>
                        {item.isBudget && (
                            <View style={[styles.progressFill, {
                                width: `${spendingPercentage}%`,
                                backgroundColor: progressColor,
                                opacity: 0.6
                            }]} />
                        )}
                        <Text style={[styles.icon, { color: item.isBudget ? item.color : colors.text }]}>
                            {item.icon}
                        </Text>
                    </View>
                    <ThemedText style={styles.name}>{item.name}</ThemedText>
                    <ThemedText style={styles.amount}>
                        {item.isBudget
                            ? `₹${item.totalSpent.toFixed(2)}/₹${item.allocatedBudget.toFixed(2)}`
                            : `Spent: ₹${item.totalSpent.toFixed(2)}`}
                    </ThemedText>
                    <ThemedText style={styles.count}>{item.count} transaction(s)</ThemedText>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.chartContainer, { borderColor: colors.border }]}>
                <CategoryBar data={progressData} />
            </Animated.View>
            <FlatList
                data={[...budgetCategories, ...noBudgetCategories]}
                renderItem={renderCategoryCard}
                keyExtractor={item => item.id}
                numColumns={2}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={styles.columnWrapper}
            />
            <View style={styles.monthNavigation}>
                <TouchableOpacity onPress={() => handleMonthChange(-1)}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <ThemedText style={styles.monthText}>
                    {format(selectedDate, 'MMMM yyyy')}
                </ThemedText>
                <TouchableOpacity onPress={() => handleMonthChange(1)}>
                    <Ionicons name="chevron-forward" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    chartContainer: {
        borderWidth: 1,
        padding: 16,
        borderRadius: 8,
        marginBottom: 10,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    itemContainer: {
        width: ITEM_WIDTH,
        margin: 5,
    },
    item: {
        flex: 1,
        height: 170,
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        justifyContent: 'space-between',
    },
    iconContainer: {
        padding: 10,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    progressFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
    },
    icon: {
        fontSize: 24,
        zIndex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 8,
    },
    amount: {
        fontSize: 14,
        marginTop: 4,
    },
    count: {
        fontSize: 12,
        marginTop: 4,
        opacity: 0.7,
    },
    monthNavigation: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        paddingBottom: 28,
    },
    monthText: {
        flex: 1,
        textAlign: 'center',
    },
});

export default CategoryRecordScreen;