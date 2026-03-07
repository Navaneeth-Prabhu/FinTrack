import React, { useRef, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ThemedText } from '@/components/common/ThemedText';
import { useHoldingsStore } from '@/stores/holdingsStore';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import HoldingCard from './HoldingCard';
import UpdatePriceSheet, { UpdatePriceSheetRef } from './UpdatePriceSheet';
import { Holding } from '@/types';
import { useRouter } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';

type FilterType = 'All' | 'Stocks' | 'FD / Bonds' | 'Gold' | 'Other';
const FILTERS: FilterType[] = ['All', 'Stocks', 'FD / Bonds', 'Gold', 'Other'];

export default function HoldingsView() {
    const router = useRouter();
    const { holdings, getTotalInvested, getCurrentValue, fetchHoldings } = useHoldingsStore();
    const { format } = useCurrency();
    const { colors, isDark } = useTheme();
    const sheetRef = useRef<UpdatePriceSheetRef>(null);

    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [refreshing, setRefreshing] = useState(false);

    const totalInvested = getTotalInvested();
    const currentTotal = getCurrentValue();
    const totalProfit = currentTotal - totalInvested;
    const isProfit = totalProfit >= 0;
    const profitColor = isProfit ? colors.success : '#FF4D4D';

    const handleUpdatePrice = (holding: Holding) => {
        sheetRef.current?.present(holding);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchHoldings();
        setRefreshing(false);
    }, [fetchHoldings]);

    // Bulk update: opens UpdatePriceSheet for each non-fixed-income holding sequentially
    const stalePriceHoldings = useMemo(
        () => holdings.filter(h => !['fd', 'bond', 'ppf', 'nps'].includes(h.type)),
        [holdings]
    );
    const onBulkUpdatePrices = () => {
        if (stalePriceHoldings.length === 0) {
            Alert.alert('No holdings', 'Add stock or gold holdings first.');
            return;
        }
        // Open the first holding — user can proceed through remaining via the sheet
        sheetRef.current?.present(stalePriceHoldings[0]);
    };

    // Calculate grouped lists
    const groupedHoldings = useMemo(() => {
        const groups: Record<string, { label: string, data: Holding[], profit: number }> = {
            'Stocks': { label: 'STOCKS', data: [], profit: 0 },
            'FD / Bonds': { label: 'FIXED DEPOSITS / BONDS', data: [], profit: 0 },
            'Gold': { label: 'GOLD', data: [], profit: 0 },
            'Other': { label: 'OTHER', data: [], profit: 0 }
        };

        holdings.forEach(h => {
            let catKey = 'Other';
            if (h.type === 'stock') catKey = 'Stocks';
            else if (h.type === 'fd' || h.type === 'bond' || h.type === 'ppf' || h.type === 'nps') catKey = 'FD / Bonds';
            else if (h.type === 'gold') catKey = 'Gold';

            // Calculate profit for this holding to add to the group sum
            const isFixedIncome = ['fd', 'bond', 'ppf', 'nps'].includes(h.type);
            const inv = isFixedIncome ? h.avg_buy_price : h.quantity * h.avg_buy_price;
            const curValue = isFixedIncome ? (h.current_price || h.avg_buy_price) : h.quantity * (h.current_price || h.avg_buy_price);
            groups[catKey].profit += (curValue - inv);

            groups[catKey].data.push(h);
        });

        return groups;
    }, [holdings]);

    if (holdings.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <ThemedText style={[styles.emptyText, { color: colors.subtitle }]}>
                    No investment holdings found. Add an investment to see it here.
                </ThemedText>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Filter Chips */}
            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {FILTERS.map(filter => {
                        const isActive = activeFilter === filter;
                        return (
                            <Pressable
                                key={filter}
                                style={({ pressed }) => [
                                    styles.filterChip,
                                    isActive ? styles.filterChipActive : { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                                    pressed && { opacity: 0.7 }
                                ]}
                                onPress={() => setActiveFilter(filter)}
                            >
                                <ThemedText style={{ color: isActive ? '#FBBF24' : '#8E8E93', fontSize: 13, fontWeight: '600' }}>
                                    {filter}
                                </ThemedText>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* Summary Card */}
                <View style={[styles.summaryCard, { backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }]}>
                    <View style={styles.summaryCol}>
                        <ThemedText style={[styles.summaryLabel, { color: colors.subtitle }]}>TOTAL</ThemedText>
                        <ThemedText style={styles.summaryValue}>{format(currentTotal)}</ThemedText>
                    </View>
                    <View style={[styles.summaryCol, styles.summaryBorder]}>
                        <ThemedText style={[styles.summaryLabel, { color: colors.subtitle }]}>INVESTED</ThemedText>
                        <ThemedText style={[styles.summaryValue, { color: '#D1D5DB' }]}>{format(totalInvested)}</ThemedText>
                    </View>
                    <View style={styles.summaryCol}>
                        <ThemedText style={[styles.summaryLabel, { color: colors.subtitle }]}>P&L</ThemedText>
                        <ThemedText style={[styles.summaryValue, { color: profitColor }]}>
                            {isProfit ? '+' : ''}{format(totalProfit)}
                        </ThemedText>
                    </View>
                </View>

                {/* Bulk Update Prices button */}
                <Pressable
                    style={({ pressed }) => [
                        styles.bulkUpdateBtn,
                        { backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.08)' },
                        pressed && { opacity: 0.75 }
                    ]}
                    onPress={onBulkUpdatePrices}
                >
                    <RefreshCw size={14} color={colors.primary} style={{ marginRight: 6 }} />
                    <ThemedText style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                        Update All Prices ({stalePriceHoldings.length})
                    </ThemedText>
                </Pressable>

                {/* Grouped Lists */}
                {Object.entries(groupedHoldings).map(([key, group]) => {
                    if (group.data.length === 0) return null;
                    if (activeFilter !== 'All' && activeFilter !== key) return null;

                    const groupIsProfit = group.profit >= 0;

                    return (
                        <View key={key} style={styles.groupContainer}>
                            <View style={styles.groupHeader}>
                                <ThemedText style={[styles.groupTitle, { color: colors.subtitle }]}>
                                    {group.label} · {group.data.length}
                                </ThemedText>
                                <ThemedText style={[styles.groupProfit, { color: groupIsProfit ? colors.success : '#FF4D4D' }]}>
                                    {groupIsProfit ? '+' : ''}{format(group.profit)}
                                </ThemedText>
                            </View>

                            <FlashList
                                data={group.data}
                                renderItem={({ item }) => (
                                    <HoldingCard
                                        holding={item}
                                        onPress={(h) => router.push(`/investment/holding/${h.id}`)}
                                        onUpdatePrice={handleUpdatePrice}
                                    />
                                )}
                                estimatedItemSize={100}
                            />
                        </View>
                    );
                })}
            </ScrollView>

            <UpdatePriceSheet ref={sheetRef} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    filterContainer: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    filterScroll: {
        paddingHorizontal: 16,
        gap: 12,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: '#111',
    },
    filterChipActive: {
        borderColor: '#FBBF24',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
    },
    bulkUpdateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    emptyContainer: {
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
    summaryCard: {
        flexDirection: 'row',
        paddingVertical: 20,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginBottom: 24,
    },
    summaryCol: {
        flex: 1,
        alignItems: 'center',
    },
    summaryBorder: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    groupContainer: {
        marginBottom: 24,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    groupTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },
    groupProfit: {
        fontSize: 13,
        fontWeight: '700',
    }
});
