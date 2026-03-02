import React, { useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ThemedText } from '@/components/common/ThemedText';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { useSIPStore } from '@/stores/sipStore';
import SIPCard from '@/components/investments/SIPCard';
import UpdateNAVSheet, { UpdateNAVSheetRef } from '@/components/investments/UpdateNAVSheet';
import { SIPPlan } from '@/types';

export default function SIPsView() {
    const { sips, fetchSIPs, isLoading, getTotalInvested, getCurrentValue, getReturns, getXIRR } = useSIPStore();
    const { format } = useCurrency();
    const { colors, getShadow } = useTheme();
    const sheetRef = useRef<UpdateNAVSheetRef>(null);

    useEffect(() => {
        fetchSIPs();
    }, [fetchSIPs]);

    const handleCardPress = useCallback((sip: SIPPlan) => {
        sheetRef.current?.present(sip);
    }, []);

    const renderItem = useCallback(({ item }: { item: SIPPlan }) => {
        return <SIPCard sip={item} onPress={handleCardPress} />;
    }, [handleCardPress]);

    const renderHeader = useCallback(() => {
        const totalInvested = getTotalInvested();
        const currentValue = getCurrentValue();
        const returns = getReturns();
        const xirr = getXIRR();
        const returnsPercent = totalInvested > 0 ? (returns / totalInvested) * 100 : 0;
        const isPositive = returns >= 0;
        const returnColor = isPositive ? colors.success : colors.error;

        return (
            <View style={styles.headerContainer}>
                {/* Total Portfolio Hero Card */}
                <View style={[styles.heroCard, { backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }]}>
                    <ThemedText style={[styles.heroSubtitle, { color: colors.subtitle }]}>TOTAL PORTFOLIO VALUE</ThemedText>
                    <ThemedText style={styles.heroAmount}>
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
                            {isPositive ? '▲ +' : '▼ '}{returnsPercent.toFixed(1)}% ({format(returns)} returns)
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

                {/* Asset Allocation (Hardcoded mockup based on screenshot for now) */}
                <View style={styles.allocationSection}>
                    <View style={styles.allocationHeader}>
                        <ThemedText style={[styles.allocationLabel, { color: colors.subtitle }]}>Asset Allocation</ThemedText>
                        <ThemedText style={[styles.allocationCount, { color: colors.subtitle }]}>3 types</ThemedText>
                    </View>
                    <View style={styles.allocationBarContainer}>
                        <View style={[styles.allocationSegment, { width: '58%', backgroundColor: colors.warning, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }]} />
                        <View style={[styles.allocationSegment, { width: '28%', backgroundColor: colors.primary }]} />
                        <View style={[styles.allocationSegment, { width: '14%', backgroundColor: '#a855f7', borderTopRightRadius: 4, borderBottomRightRadius: 4 }]} />
                    </View>
                    <View style={styles.allocationLegendRow}>
                        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.warning }]} /><ThemedText style={styles.legendText}>MF 58%</ThemedText></View>
                        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><ThemedText style={styles.legendText}>Stocks 28%</ThemedText></View>
                        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#a855f7' }]} /><ThemedText style={styles.legendText}>FD/Bonds 14%</ThemedText></View>
                    </View>
                </View>

                <View style={styles.sectionHeaderRow}>
                    <ThemedText variant="h3" style={styles.sectionTitle}>Active SIPs</ThemedText>
                    <ThemedText style={[styles.seeAllText, { color: colors.warning }]}>See all →</ThemedText>
                </View>
            </View>
        );
    }, [colors, format, getCurrentValue, getReturns, getTotalInvested, getXIRR]);

    if (isLoading && sips.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ThemedText style={{ color: colors.subtitle }}>Loading SIPs...</ThemedText>
            </View>
        );
    }

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <ThemedText style={[styles.emptyText, { color: colors.subtitle }]}>
                No active SIPs found. Tap '+ Add' to track your mutual funds or recurring investments.
            </ThemedText>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlashList
                data={sips}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                estimatedItemSize={250}
                contentContainerStyle={styles.listContent}
            />
            <UpdateNAVSheet ref={sheetRef} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
        marginTop: 20,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        lineHeight: 24,
    },
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
        marginBottom: 28,
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
    allocationBarContainer: {
        height: 6,
        flexDirection: 'row',
        marginBottom: 16,
    },
    allocationSegment: {
        height: '100%',
    },
    allocationLegendRow: {
        flexDirection: 'row',
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
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    seeAllText: {
        fontSize: 13,
        fontWeight: '600',
    }
});
