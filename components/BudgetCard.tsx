import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { Budget } from '@/types';
import { calculateIdealSpending, getEndDateForFrequency } from '@/utils/date';
import { ThemedText } from './common/ThemedText';
import { router } from 'expo-router';
import { differenceInDays, format, isAfter, isBefore, parseISO } from 'date-fns';
import { CategoryIcon } from './transactions/CategoryIcon';
import { fontSizes, tokens } from '@/constants/theme';

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
    progress: number;
}> = ({ spent, limit, idealSpending, progress }) => {
    const progressWidth = Math.min((spent / limit) * 100, 100);
    const idealPosition = Math.min((idealSpending / limit) * 100, 100);
    const isOnTrack = spent <= idealSpending;
    const { colors } = useTheme();
    return (
        <View style={styles.progressContainer}>
            <View style={[styles.progressBackground, { backgroundColor: colors.accent }]}>
                <View
                    style={[
                        styles.progressFill,
                        { width: `${progressWidth}%`, backgroundColor: isOnTrack ? colors.primary : '#FF6347' },
                    ]}
                >
                    <ThemedText style={styles.progressText}>{progress.toFixed(1)}</ThemedText>
                </View>
            </View>
            <View style={[styles.idealPointerContainer, { left: `${idealPosition}%` }]}>
                <ThemedText variant='caption'>Ideal</ThemedText>
                <View style={[styles.idealPointer, { borderColor: colors.text }]} />
            </View>
        </View>
    );
};

export const BudgetCard: React.FC<{ budget: Budget & { spent?: number; progress?: number } }> = ({ budget }) => {
    const { category, limit, spent, progress, startDate, frequency } = budget;
    const spentValue = spent ?? 0;
    const progressValue = progress ?? 0;
    const endDate = getEndDateForFrequency(startDate, frequency).toISOString();
    const idealSpending = calculateIdealSpending(limit, startDate, frequency);
    const isOnTrack = spentValue <= idealSpending;
    const dailySpending = calculateDailySpendingAllowance(limit, spentValue, startDate, frequency);

    const { colors } = useTheme();

    return (
        <TouchableOpacity style={[styles.card, { borderColor: colors.border }]} onPress={() => router.push(`/budget/${budget.id}`)}>
            <LinearGradient colors={[colors.card, colors.card]}>
                <View style={{ padding: 16 }}>

                    <View style={styles.header}>
                        <View style={styles.categoryContainer}>
                            <CategoryIcon category={category} />
                            <View>
                                <ThemedText variant='h3'
                                    style={{ fontSize: fontSizes.FONT22 }}>{category?.name}</ThemedText>
                                <ThemedText variant='body1'>
                                    <ThemedText style={{ fontWeight: tokens.fontWeight.semibold }}>
                                        ${(spent ?? 0).toFixed(2)}
                                    </ThemedText> of ${limit.toFixed(2)}</ThemedText>
                            </View>
                        </View>
                    </View>
                    <ProgressBarWithPointer spent={spentValue} limit={limit} idealSpending={idealSpending} progress={progressValue} />
                    {/* <ThemedText style={styles.progressText}>{progressValue.toFixed(1)}% Completed</ThemedText> */}
                    <View style={styles.dateContainer}>
                        <ThemedText style={styles.dateText}>{format(new Date(startDate), "d MMM")}</ThemedText>
                        <ThemedText style={styles.dateText}>{format(new Date(endDate), "d MMM")}</ThemedText>
                    </View>
                </View>
                <View style={{ backgroundColor: colors.accent, padding: 8 }}>
                    {dailySpending && (
                        <ThemedText style={[styles.dailySpendingText, { color: colors.accentForeground }]}>
                            You can spend ${dailySpending.dailyAllowance.toFixed(2)}/day for {dailySpending.remainingDays} days
                        </ThemedText>
                    )}
                </View>
                {/* <Text style={[styles.statusText, { color: isOnTrack ? '#32CD32' : '#FF6347' }]}>
                    {isOnTrack ? 'On Track' : 'Over Budget'}
                </Text> */}
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        marginVertical: 10,
        overflow: 'hidden',
        borderWidth: 1.5
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    categoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    category: {
        fontSize: 18,
        fontWeight: tokens.fontWeight.semibold,
        color: '#333',
    },
    progressContainer: {
        position: 'relative',
        marginTop: 10,
        height: 30,
    },
    progressBackground: {
        width: '100%',
        height: 20,
        backgroundColor: '#e0e0e0',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    idealPointerContainer: {
        position: 'absolute',
        bottom: 10,
        transform: [{ translateX: -10 }],
        alignItems: 'center',
    },
    idealPointer: {
        width: 0,
        height: 20,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderWidth: 2,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    pointerText: {
        fontSize: 10,
        color: '#333',
        marginTop: 2,
    },
    progressText: {
        fontSize: 12,
        color: '#111',
        textAlign: 'center',
    },
    dateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dateText: {
        fontSize: 12,
        color: '#777',
    },
    dailySpendingText: {
        fontSize: 12,
        textAlign: 'center',
    },
    statusText: {
        fontSize: 14,
        fontWeight: tokens.fontWeight.semibold,
        textAlign: 'center',
        marginTop: 10,
    },
});