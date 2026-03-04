import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { usePortfolioSummary } from '@/hooks/usePortfolioSummary';
import { useTheme } from '@/hooks/useTheme';

const ASSET_COLORS: Record<string, string> = {
    'MF': '#FBBF24', // Yellow
    'Stocks': '#3B82F6', // Blue
    'FD': '#A855F7', // Purple
    'Gold': '#2DD4BF', // Teal
    'Other': '#8E8E93', // Gray
};

export default function AllocationBar() {
    const { colors } = useTheme();
    const { assetAllocation, currentValue } = usePortfolioSummary();

    const allocation = useMemo(() => {
        const total = currentValue;
        if (total === 0) return [];

        const items = [
            { label: 'MF', value: assetAllocation.mutualFunds, percentage: (assetAllocation.mutualFunds / total) * 100 },
            { label: 'Stocks', value: assetAllocation.stocks, percentage: (assetAllocation.stocks / total) * 100 },
            { label: 'FD', value: assetAllocation.fixedIncome, percentage: (assetAllocation.fixedIncome / total) * 100 },
            { label: 'Gold', value: assetAllocation.gold, percentage: (assetAllocation.gold / total) * 100 },
            { label: 'Other', value: assetAllocation.others, percentage: (assetAllocation.others / total) * 100 },
        ].filter(item => item.value > 0);

        return items.sort((a, b) => b.value - a.value);
    }, [assetAllocation, currentValue]);

    if (allocation.length === 0) {
        return (
            <View style={styles.emptyBar}>
                <ThemedText style={[styles.emptyText, { color: colors.subtitle }]}>No assets to display</ThemedText>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.allocationHeader}>
                <ThemedText style={[styles.allocationLabel, { color: colors.subtitle }]}>Asset Allocation</ThemedText>
                <ThemedText style={[styles.allocationCount, { color: colors.subtitle }]}>{allocation.length} asset types</ThemedText>
            </View>

            <View style={styles.barContainer}>
                {allocation.map((item, index) => {
                    const isFirst = index === 0;
                    const isLast = index === allocation.length - 1;
                    return (
                        <View
                            key={item.label}
                            style={[
                                styles.barSegment,
                                {
                                    backgroundColor: ASSET_COLORS[item.label],
                                    width: `${item.percentage}%`,
                                    borderTopLeftRadius: isFirst ? 4 : 0,
                                    borderBottomLeftRadius: isFirst ? 4 : 0,
                                    borderTopRightRadius: isLast ? 4 : 0,
                                    borderBottomRightRadius: isLast ? 4 : 0,
                                    marginRight: isLast ? 0 : 2
                                }
                            ]}
                        />
                    );
                })}
            </View>

            <View style={styles.legendRow}>
                {allocation.map((item) => (
                    <View key={item.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: ASSET_COLORS[item.label] }]} />
                        <ThemedText style={styles.legendText}>{item.label} {Math.round(item.percentage)}%</ThemedText>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    emptyBar: {
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 12,
        marginTop: 20,
    },
    allocationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    allocationLabel: {
        fontSize: 13,
    },
    allocationCount: {
        fontSize: 13,
    },
    barContainer: {
        height: 8,
        flexDirection: 'row',
        marginBottom: 16,
    },
    barSegment: {
        height: '100%',
    },
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#A1A1AA',
    }
});
