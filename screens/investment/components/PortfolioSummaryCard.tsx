import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency } from '@/hooks/useCurrency';
import { usePortfolioSummary } from '@/hooks/usePortfolioSummary';
import AllocationBar from './AllocationBar';
import { useSIPStore } from '@/stores/sipStore';

export default function PortfolioSummaryCard() {
    const { colors, isDark } = useTheme();
    const { format } = useCurrency();

    const { totalInvested, currentValue, totalReturns, totalReturnsPercent } = usePortfolioSummary();
    // Calculate live XIRR from the SIP store
    const { getXIRR } = useSIPStore();

    const isPositive = totalReturns >= 0;
    const returnColor = isPositive ? colors.success : colors.error;
    const xirr = getXIRR();

    const heroBg = isDark ? '#1A1A1A' : colors.card;
    const heroBorder = isDark ? 'rgba(255,255,255,0.06)' : colors.border;
    const gridBoxBg = isDark ? '#222' : colors.background;
    const gridBoxBorder = isDark ? 'rgba(255,255,255,0.06)' : colors.border;

    return (
        <View style={styles.headerContainer}>
            {/* Total Portfolio Hero Card */}
            <View style={[styles.heroCard, { backgroundColor: heroBg, borderColor: heroBorder, borderWidth: 1 }]}>
                <ThemedText style={[styles.heroSubtitle, { color: colors.subtitle }]}>TOTAL PORTFOLIO VALUE</ThemedText>
                <ThemedText style={[styles.heroAmount, { color: colors.text }]}>
                    {format(currentValue)}
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
                        {isPositive ? '▲ +' : '▼ '}{totalReturnsPercent.toFixed(1)}% ({format(totalReturns)} gain)
                    </ThemedText>
                </View>

                <View style={styles.heroGrid}>
                    <View style={[styles.heroGridBox, { backgroundColor: gridBoxBg, borderColor: gridBoxBorder, borderWidth: 1 }]}>
                        <ThemedText style={[styles.heroGridLabel, { color: colors.subtitle }]}>Invested</ThemedText>
                        <ThemedText style={[styles.heroGridValue, { color: colors.text }]}>{format(totalInvested)}</ThemedText>
                    </View>
                    <View style={[styles.heroGridBox, { backgroundColor: gridBoxBg, borderColor: gridBoxBorder, borderWidth: 1 }]}>
                        <ThemedText style={[styles.heroGridLabel, { color: colors.subtitle }]}>Returns</ThemedText>
                        <ThemedText style={[styles.heroGridValue, { color: returnColor }]}>
                            {isPositive ? '+' : ''}
                            {format(totalReturns)}
                        </ThemedText>
                    </View>
                    <View style={[styles.heroGridBox, { backgroundColor: gridBoxBg, borderColor: gridBoxBorder, borderWidth: 1 }]}>
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
    },
    allocationSection: {
        marginBottom: 12,
    }
});
