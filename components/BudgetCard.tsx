import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { Budget } from '@/types';
import { calculateIdealSpending, getEndDateForFrequency } from '@/utils/date';
import { ThemedText } from './common/ThemedText';
import { useBudgetStore } from '@/stores/budgetStore';
import { router } from 'expo-router';
import { differenceInDays, isAfter, isBefore, parseISO } from 'date-fns';

export const calculateDailySpendingAllowance = (
    limit: number,
    spent: number,
    startDate: string,
    frequency: Budget['frequency']
): { dailyAllowance: number; remainingDays: number } | null => {
    const start = parseISO(startDate);
    const now = new Date();
    const end = getEndDateForFrequency(startDate, frequency);

    // If period hasn’t started, hasn’t ended, or limit is exceeded, return null
    if (isBefore(now, start) || isAfter(now, end) || spent >= limit) {
        return null;
    }

    const remainingAmount = limit - spent;
    const remainingDays = differenceInDays(end, now);

    // If no days remain, return null (avoid division by zero)
    if (remainingDays <= 0) return null;

    const dailyAllowance = remainingAmount / remainingDays;
    return { dailyAllowance, remainingDays };
};

const ProgressBarWithPointer: React.FC<{
    spent: number;
    limit: number;
    idealSpending: number;
}> = ({ spent, limit, idealSpending }) => {
    const progressWidth = Math.min((spent / limit) * 100, 100);
    const idealPosition = Math.min((idealSpending / limit) * 100, 100);
    const isOnTrack = spent <= idealSpending;
    const { colors } = useTheme();
    return (
        <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
                <View
                    style={[
                        styles.progressFill,
                        { width: `${progressWidth}%`, backgroundColor: isOnTrack ? '#32CD32' : '#FF6347' },
                    ]}
                />
            </View>
            <View style={[styles.idealPointerContainer, { left: `${idealPosition}%` }]}>
                <View style={[styles.idealPointer, { borderBottomColor: colors.text }]} />
                <Text style={styles.pointerText}>Ideal</Text>
            </View>
        </View>
    );
};

export const BudgetCard: React.FC<{ budget: Budget }> = ({ budget }) => {
    const { category, limit, spent, progress, startDate, frequency } = budget;
    const endDate = getEndDateForFrequency(startDate, frequency).toISOString();
    const idealSpending = calculateIdealSpending(limit, startDate, frequency);
    const isOnTrack = spent <= idealSpending;
    const dailySpending = calculateDailySpendingAllowance(limit, spent, startDate, frequency);

    const { colors } = useTheme();
    const { removeBudget } = useBudgetStore();

    return (
        <TouchableOpacity style={styles.card} onPress={() => router.push(`/budget/${budget.id}`)}>
            <LinearGradient colors={[colors.card, colors.card]} style={styles.gradient}>
                <View style={styles.header}>
                    <Text style={styles.category}>{category?.name}</Text>
                    <Text style={styles.amount}>${spent.toFixed(2)} / ${limit.toFixed(2)}</Text>
                </View>
                <ProgressBarWithPointer spent={spent} limit={limit} idealSpending={idealSpending} />
                <Text style={styles.progressText}>{progress.toFixed(1)}% Completed</Text>
                <View style={styles.dateContainer}>
                    <Text style={styles.dateText}>Start: {new Date(startDate).toLocaleDateString()}</Text>
                    <Text style={styles.dateText}>End: {new Date(endDate).toLocaleDateString()}</Text>
                </View>
                {dailySpending && (
                    <Text style={styles.dailySpendingText}>
                        You can spend ${dailySpending.dailyAllowance.toFixed(2)}/day for {dailySpending.remainingDays} days
                    </Text>
                )}
                <Text style={[styles.statusText, { color: isOnTrack ? '#32CD32' : '#FF6347' }]}>
                    {isOnTrack ? 'On Track' : 'Over Budget'}
                </Text>
                <TouchableOpacity onPress={() => removeBudget(budget.id)}>
                    <ThemedText>Delete</ThemedText>
                </TouchableOpacity>
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        marginVertical: 10,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    gradient: {
        padding: 15,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    category: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    amount: {
        fontSize: 16,
        color: '#666',
    },
    progressContainer: {
        position: 'relative',
        marginVertical: 10,
        height: 30,
    },
    progressBackground: {
        width: '100%',
        height: 10,
        backgroundColor: '#e0e0e0',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 5,
    },
    idealPointerContainer: {
        position: 'absolute',
        top: 0,
        transform: [{ translateX: -10 }],
        alignItems: 'center',
    },
    idealPointer: {
        width: 0,
        height: 20,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderBottomWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#FFFFFF',
    },
    pointerText: {
        fontSize: 10,
        color: '#333',
        marginTop: 2,
    },
    progressText: {
        fontSize: 14,
        color: '#555',
        textAlign: 'center',
        marginVertical: 5,
    },
    dateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    dateText: {
        fontSize: 12,
        color: '#777',
    },
    dailySpendingText: {
        fontSize: 12,
        color: '#444',
        textAlign: 'center',
        marginTop: 5,
    },
    statusText: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 10,
    },
});