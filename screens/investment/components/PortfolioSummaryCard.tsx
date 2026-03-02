import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency } from '@/hooks/useCurrency';
import { useSIPStore } from '@/stores/sipStore';
import { useHoldingsStore } from '@/stores/holdingsStore';
import AllocationBar from './AllocationBar';

export default function PortfolioSummaryCard() {
    const { colors } = useTheme();
    const { format } = useCurrency();

    const sipInvested = useSIPStore(state => state.getTotalInvested());
    const sipCurrent = useSIPStore(state => state.getCurrentValue());

    const holdingsInvested = useHoldingsStore(state => state.getTotalInvested());
    const holdingsCurrent = useHoldingsStore(state => state.getCurrentValue());

    const totalInvested = sipInvested + holdingsInvested;
    const currentTotal = sipCurrent + holdingsCurrent;
    const returns = currentTotal - totalInvested;
    const returnsPercent = totalInvested > 0 ? (returns / totalInvested) * 100 : 0;

    const isPositive = returns >= 0;
    const returnColor = isPositive ? colors.success : colors.error;

    // Hardcoded XIRR for now as we don't have a reliable global XIRR calculator combining both yet
    const xirr = 14.2;

    return (
        <View style={styles.headerContainer}>
            {/* Total Portfolio Hero Card */}
            <View style={[styles.heroCard, { backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }]}>
                <ThemedText style={[styles.heroSubtitle, { color: colors.subtitle }]}>TOTAL PORTFOLIO VALUE</ThemedText>
                <ThemedText style={styles.heroAmount}>
                    {format(currentTotal)}
                </ThemedText>

                <View style={[
                    styles.returnsPill,
                    {
                        backgroundColor: isPositive ? 'rgba(76, 217, 100, 0.15)' : 'rgba(255, 77, 77, 0.15)',
                        borderColor: isPositive ? 'rgba(76, 217, 100, 0.3)' : 'rgba(255, 77, 77, 0.3)',
                        borderWidth: 1
                    }
                ]}>
                    <ThemedText style={{ color: returnColor, fontWeight: '700', fontSize: 13 }}>
                        {isPositive ? '▲ +' : '▼ '}{returnsPercent.toFixed(1)}% ({format(returns)} gain)
                    </ThemedText>
                </View>

                <View style={styles.heroGrid}>
                    <View style={[styles.heroGridBox, { backgroundColor: '#222', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }]}>
                        <ThemedText style={[styles.heroGridLabel, { color: colors.subtitle }]}>Invested</ThemedText>
                        <ThemedText style={styles.heroGridValue}>{format(totalInvested)}</ThemedText>
                    </View>
                    <View style={[styles.heroGridBox, { backgroundColor: '#222', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }]}>
                        <ThemedText style={[styles.heroGridLabel, { color: colors.subtitle }]}>Returns</ThemedText>
                        <ThemedText style={[styles.heroGridValue, { color: returnColor }]}>
                            {isPositive ? '+' : ''}
                            {format(returns)}
                        </ThemedText>
                    </View>
                    <View style={[styles.heroGridBox, { backgroundColor: '#222', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }]}>
                        <ThemedText style={[styles.heroGridLabel, { color: colors.subtitle }]}>XIRR</ThemedText>
                        <ThemedText style={[styles.heroGridValue, { color: colors.warning }]}>{xirr.toFixed(1)}%</ThemedText>
                    </View>
                </View>
            </View>

            <View style={styles.allocationSection}>
                <AllocationBar />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        marginBottom: 8,
    },
    heroCard: {
        padding: 24,
        borderRadius: 20,
        marginBottom: 24,
    },
    heroSubtitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
    },
    heroAmount: {
        fontSize: 40,
        lineHeight: 48,
        fontWeight: '700',
        marginBottom: 16,
        color: '#FFF',
    },
    returnsPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 24,
    },
    heroGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    heroGridBox: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
    },
    heroGridLabel: {
        fontSize: 11,
        marginBottom: 8,
    },
    heroGridValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    allocationSection: {
        marginBottom: 12,
    }
});
