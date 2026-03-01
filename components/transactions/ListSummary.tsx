import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../common/ThemedText';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { fontSizes } from '@/constants/theme';

interface ListSummaryProps {
    totals: { income: number; expense: number };
    isCurrentMonth?: boolean;
    lastMonthTotals?: { income: number; expense: number } | null;
}

const ListSummary = ({ totals, isCurrentMonth = false, lastMonthTotals = null }: ListSummaryProps) => {
    const { format } = useCurrency();
    const { colors } = useTheme();

    const netTotal = totals.income - totals.expense;
    const isPositive = netTotal >= 0;

    const getDiffContent = (current: number, previous: number, type: 'income' | 'expense') => {
        if (!isCurrentMonth || !lastMonthTotals) return null;

        let diffPercent = 0;
        let isMore = false;

        if (previous > 0) {
            const diff = current - previous;
            diffPercent = Math.abs((diff / previous) * 100);
            isMore = diff > 0;
        } else if (current > 0) {
            diffPercent = 100;
            isMore = true;
        }

        if (diffPercent > 0) {
            let color;
            if (type === 'income') {
                color = isMore ? colors.income : colors.error;
            } else {
                color = isMore ? colors.error : colors.income;
            }
            const icon = isMore ? 'trending-up' : 'trending-down';

            return (
                <View style={[styles.diffBadge, { backgroundColor: color + '15' }]}>
                    <Ionicons name={icon} size={10} color={color} />
                    <ThemedText style={[styles.diffText, { color }]}>
                        {diffPercent.toFixed(0)}%
                    </ThemedText>
                </View>
            );
        }
        return null;
    };

    return (
        <View style={styles.container}>
            <View style={styles.mainRow}>
                <View style={styles.netBlock}>
                    <ThemedText style={[styles.netLabel, { color: colors.subtitle }]}>Net Balance</ThemedText>
                    <ThemedText style={[styles.netValue, { color: isPositive ? colors.income : colors.text }]}>
                        {format(netTotal)}
                    </ThemedText>
                </View>

                <View style={styles.statsBlock}>
                    <View style={styles.statItem}>
                        <View style={styles.statLabelRow}>
                            <Ionicons name="arrow-down" size={12} color={colors.income} />
                            <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>Income</ThemedText>
                        </View>
                        <View style={styles.statValueRow}>
                            <ThemedText style={[styles.statValue, { color: colors.text }]}>{format(totals.income)}</ThemedText>
                            {getDiffContent(totals.income, lastMonthTotals?.income || 0, 'income')}
                        </View>
                    </View>

                    <View style={styles.statItem}>
                        <View style={styles.statLabelRow}>
                            <Ionicons name="arrow-up" size={12} color={colors.error} />
                            <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>Expense</ThemedText>
                        </View>
                        <View style={styles.statValueRow}>
                            <ThemedText style={[styles.statValue, { color: colors.text }]}>{format(totals.expense)}</ThemedText>
                            {getDiffContent(totals.expense, lastMonthTotals?.expense || 0, 'expense')}
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default ListSummary;

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        paddingHorizontal: 0,
        marginBottom: 16,
    },
    mainRow: {
        flexDirection: 'column',
        gap: 16,
    },
    netBlock: {
        alignItems: 'flex-start',
        paddingHorizontal: 4,
    },
    netLabel: {
        fontSize: fontSizes.FONT12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    netValue: {
        fontSize: fontSizes.FONT32,
        fontWeight: '800',
        lineHeight: 42, // Fixes Android clipping
    },
    statsBlock: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 16,
        paddingHorizontal: 4,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(150, 150, 150, 0.25)',
    },
    statItem: {
        flex: 1,
    },
    statLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: fontSizes.FONT12,
        fontWeight: '500',
    },
    statValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statValue: {
        fontSize: fontSizes.FONT16,
        fontWeight: '700',
    },
    diffBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 2,
    },
    diffText: {
        fontSize: fontSizes.FONT10,
        fontWeight: '600',
    },
});