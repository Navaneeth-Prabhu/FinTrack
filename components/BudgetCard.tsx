import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { Budget } from '@/types';
import { useCategoryStore } from '@/stores/categoryStore';
import { calculateIdealSpending, getEndDateForFrequency, getNextPeriodEndDate } from '@/utils/date';
import { ThemedText } from './common/ThemedText';
import { useBudgetStore } from '@/stores/budgetStore';
import { router } from 'expo-router';

// Define interfaces
export interface Category {
    id: string;
    name: string;
    color?: string;
}

// export interface Budget {
//     id: string;
//     category: Category;
//     limit: number;
//     frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
//     progress: number; // Percentage (0-100)
//     spent: number;
//     startDate: string; // ISO date string
//     endDate: string; // ISO date string
// }

// Utility to calculate ideal spending based on current date
// const calculateIdealSpending = (
//     limit: number,
//     startDate: string,
//     endDate: string,
//     frequency: Budget['frequency']
// ): number => {
//     const start = new Date(startDate);
//     const end = new Date(endDate);
//     const now = new Date();

//     if (now < start || now > end) return 0;

//     const totalDurationMs = end.getTime() - start.getTime();
//     const elapsedDurationMs = now.getTime() - start.getTime();
//     const elapsedFraction = elapsedDurationMs / totalDurationMs;

//     // Simplified adjustment based on frequency
//     const idealFraction = elapsedFraction;
//     return Math.min(limit * idealFraction, limit);
// };

// Custom ProgressBarWithPointer component
const ProgressBarWithPointer: React.FC<{
    spent: number;
    limit: number;
    idealSpending: number;
}> = ({ spent, limit, idealSpending }) => {
    const progressWidth = Math.min((spent / limit) * 100, 100); // Cap at 100%
    const idealPosition = Math.min((idealSpending / limit) * 100, 100); // Ideal spending position
    const isOnTrack = spent <= idealSpending;
    const { colors } = useTheme()
    return (
        <View style={styles.progressContainer}>
            {/* Background Bar */}
            <View style={styles.progressBackground}>
                {/* Filled Progress */}
                <View
                    style={[
                        styles.progressFill,
                        {
                            width: `${progressWidth}%`,
                            backgroundColor: isOnTrack ? '#32CD32' : '#FF6347', // Green if on track, red if over
                        },
                    ]}
                />
            </View>
            {/* Ideal Spending Pointer */}
            <View
                style={[
                    styles.idealPointerContainer,
                    { left: `${idealPosition}%` },
                ]}
            >
                <View style={[styles.idealPointer, { borderBlockColor: colors.text }]} />
                <Text style={styles.pointerText}>Ideal</Text>
            </View>
        </View>
    );
};

// Reusable BudgetCard component
export const BudgetCard: React.FC<{ budget: Budget }> = ({ budget }) => {
    const {
        category,
        limit,
        spent,
        progress,
        startDate,
        frequency,
        isRecurring
    } = budget;

    // Calculate current period's end date
    const endDate = isRecurring
        ? getNextPeriodEndDate(startDate, frequency).toISOString()
        : budget.endDate || getEndDateForFrequency(startDate, frequency).toISOString();

    const idealSpending = calculateIdealSpending(limit, startDate, frequency);
    const isOnTrack = spent <= idealSpending;
    const { colors } = useTheme();
    const { removeBudget } = useBudgetStore();
    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/budget/${budget.id}`)}
        >
            <LinearGradient
                colors={[colors.card, colors.card]}
                style={styles.gradient}
            >
                {/* Category and Amount */}
                <View style={styles.header}>
                    <Text style={styles.category}>{category?.name}</Text>
                    <Text style={styles.amount}>
                        ${spent.toFixed(2)} / ${limit.toFixed(2)}
                    </Text>
                </View>

                {/* Custom Progress Bar */}
                <ProgressBarWithPointer
                    spent={spent}
                    limit={limit}
                    idealSpending={idealSpending}
                />

                {/* Progress Percentage */}
                <Text style={styles.progressText}>
                    {progress.toFixed(1)}% Completed
                </Text>

                {/* Dates */}
                <View style={styles.dateContainer}>
                    <Text style={styles.dateText}>
                        Start: {new Date(startDate).toLocaleDateString()}
                    </Text>
                    <Text style={styles.dateText}>
                        End: {new Date(endDate).toLocaleDateString()}
                    </Text>
                </View>

                {/* Spending Status */}
                <Text
                    style={[
                        styles.statusText,
                        { color: isOnTrack ? '#32CD32' : '#FF6347' },
                    ]}
                >
                    {isOnTrack ? 'On Track' : 'Over Budget'}
                </Text>

                <TouchableOpacity onPress={() => removeBudget(budget.id)}>
                    <ThemedText>Delete</ThemedText>
                </TouchableOpacity>
            </LinearGradient>
        </TouchableOpacity>
    );
};
// Styles
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
        height: 30, // Space for pointer
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
        transform: [{ translateX: -10 }], // Center the pointer
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
        borderBottomColor: '#FFFFFF', // Gold triangle
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
    statusText: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 10,
    },
});
