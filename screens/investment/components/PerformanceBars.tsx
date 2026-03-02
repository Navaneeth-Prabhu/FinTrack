import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { useSIPStore } from '@/stores/sipStore';
import { useHoldingsStore } from '@/stores/holdingsStore';
import { useTheme } from '@/hooks/useTheme';

export default function PerformanceBars() {
    const { sips } = useSIPStore();
    const { holdings } = useHoldingsStore();
    const { colors } = useTheme();

    const performanceData = useMemo(() => {
        const data: { id: string; name: string; returnsPercent: number; returnsAmount: number }[] = [];

        // SIPs Performance
        sips.forEach(sip => {
            if (sip.totalInvested > 0) {
                const currentValue = (sip.nav && sip.units && sip.nav > 0 && sip.units > 0)
                    ? sip.nav * sip.units
                    : sip.totalInvested;
                const returns = currentValue - sip.totalInvested;
                const returnsPercent = (returns / sip.totalInvested) * 100;

                data.push({
                    id: `sip_${sip.id}`,
                    name: sip.fundName,
                    returnsPercent,
                    returnsAmount: returns,
                });
            }
        });

        // Holdings Performance
        holdings.forEach(holding => {
            const isFixedIncome = ['fd', 'bond', 'ppf', 'nps'].includes(holding.type);
            const invested = isFixedIncome ? holding.avg_buy_price : holding.quantity * holding.avg_buy_price;
            if (invested > 0) {
                const currentPrice = holding.current_price || holding.avg_buy_price;
                const currentValue = isFixedIncome ? currentPrice : holding.quantity * currentPrice;
                const returns = currentValue - invested;
                const returnsPercent = (returns / invested) * 100;

                data.push({
                    id: `holding_${holding.id}`,
                    name: holding.name,
                    returnsPercent,
                    returnsAmount: returns,
                });
            }
        });

        // Filter out 0% returns
        const activeData = data.filter(d => Math.abs(d.returnsPercent) > 0.01);
        return activeData.sort((a, b) => b.returnsPercent - a.returnsPercent).slice(0, 5);
    }, [sips, holdings]);

    if (performanceData.length === 0) return null;

    const maxAbsReturn = Math.max(...performanceData.map(d => Math.abs(d.returnsPercent)));

    return (
        <View style={styles.container}>
            <ThemedText style={styles.title}>Returns by Holding</ThemedText>

            <View style={styles.list}>
                {performanceData.map((item) => {
                    const isPositive = item.returnsPercent >= 0;

                    // Specific color overrides based on the mockup context if needed, but we can compute:
                    // Usually we want a gradient from green to yellow to red. For simplicity:
                    let barColor = colors.success;
                    if (!isPositive) barColor = '#F87171'; // Red
                    else if (item.returnsPercent < 5) barColor = colors.warning;
                    else if (item.returnsPercent < 10) barColor = '#4ADE80'; // Lighter green

                    const barWidth = Math.max((Math.abs(item.returnsPercent) / maxAbsReturn) * 100, 2);

                    return (
                        <View key={item.id} style={styles.row}>
                            <ThemedText style={[styles.name, { color: colors.subtitle }]} numberOfLines={1}>
                                {item.name.replace(' (erstwhile Value Fund)', '').replace(' Asset', '')}
                            </ThemedText>

                            <View style={styles.barTrackContainer}>
                                <View style={[styles.barTrack, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                                    <View style={[
                                        styles.barFill,
                                        {
                                            backgroundColor: barColor,
                                            width: `${barWidth}%`,
                                        }
                                    ]} />
                                </View>
                            </View>

                            <ThemedText style={[styles.percentage, { color: barColor }]}>
                                {isPositive ? '+' : ''}{Math.round(item.returnsPercent)}%
                            </ThemedText>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 32,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 16,
        color: '#FFF',
    },
    list: {
        gap: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 24,
    },
    name: {
        flex: 1.2,
        fontSize: 13,
        fontWeight: '500',
        paddingRight: 12,
    },
    barTrackContainer: {
        flex: 2,
        height: 6,
        justifyContent: 'center',
    },
    barTrack: {
        width: '100%',
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 3,
    },
    percentage: {
        flex: 0.8,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'right',
        paddingLeft: 12,
    }
});
