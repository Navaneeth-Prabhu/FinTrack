import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, Pressable, Dimensions, Text } from 'react-native';
import { addMonths, endOfMonth, format, isSameMonth, isSameYear, startOfMonth } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { useTransactionStore } from '@/stores/transactionStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { ThemedText } from '@/components/common/ThemedText';
import CategoryBar from '@/components/category/CategoryBar';
import { categoryIcons } from '@/constants/categories';

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
            const startDate = new Date(budget.startDate || "");
            const endDate = new Date(budget.endDate || "");
            return selectedDate >= startDate && (budget.endDate ? selectedDate <= endDate : true);
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
        const budgetCats: any[] = [];
        const noBudgetCats: any[] = [];

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
                    ...budget.category,
                    id,
                    totalSpent: 0,
                    count: 0,
                    allocatedBudget: budget.limit,
                    isBudget: true
                });
            }
        });

        // Calculate progress data
        const expenseTransactions = filtered.filter(t => t.type === "expense");
        const categoryTotals: Record<string, { value: number; color: string }> = {};
        expenseTransactions.forEach(t => {
            const catName = t.category.name;
            if (!categoryTotals[catName]) {
                categoryTotals[catName] = { value: 0, color: t.category.color };
            }
            categoryTotals[catName].value += t.amount;
        });

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

    const renderCategoryCard = ({ item }: { item: any }) => {
        const spendingPercentage = item.isBudget
            ? Math.min((item.totalSpent / item.allocatedBudget) * 100, 100)
            : 0;

        const progressColor = spendingPercentage >= 100 ? '#FF4444'
            : spendingPercentage >= 80 ? '#FFA500'
                : item.color;
        const IconComponent = categoryIcons.lucide.find(i => i.name === item.icon)?.component;

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.itemContainer,
                    { opacity: pressed ? 0.7 : 1 }
                ]}
                onPress={() => router.push({
                    pathname: '/(routes)/category/categoryDetails/[id]',
                    params: {
                        id: item.id,
                        month: selectedDate.toISOString(),
                        category: item.name
                    }
                })}
            >
                <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.iconWrapper}>
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
                            {IconComponent !== undefined ? (
                                <IconComponent strokeWidth={2} color={item.color} size={24} />
                            ) : (
                                <ThemedText style={{ color: item.color, fontSize: 20 }}>{item.icon}</ThemedText>
                            )}
                        </View>
                    </View>

                    <View style={styles.textGroup}>
                        <ThemedText
                            style={styles.name}
                            numberOfLines={1}
                            
                        >
                            {item.name}
                        </ThemedText>
                        <ThemedText style={[styles.amount, { color: item.color }]}>
                            {item.isBudget
                                ? `₹${item.totalSpent.toFixed(2)}/₹${item.allocatedBudget.toFixed(2)}`
                                : `₹${item.totalSpent.toFixed(2)}`}
                        </ThemedText>
                        <ThemedText style={styles.count}>{item.count} transaction(s)</ThemedText>
                    </View>
                </View>
            </Pressable>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.View style={[styles.chartContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
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
                <Pressable onPress={() => handleMonthChange(-1)}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </Pressable>
                <ThemedText style={styles.monthText}>
                    {format(selectedDate, 'MMMM yyyy')}
                </ThemedText>
                <Pressable onPress={() => handleMonthChange(1)}>
                    <Ionicons name="chevron-forward" size={24} color={colors.text} />
                </Pressable>
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
        minHeight: 150,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    iconWrapper: {
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconContainer: {
        width: '100%',
        height: 44,
        padding: 4,
        borderRadius: 12,
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
    textGroup: {
        justifyContent: 'flex-start',
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    amount: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 0,
    },
    count: {
        fontSize: 12,
        opacity: 0.6,
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