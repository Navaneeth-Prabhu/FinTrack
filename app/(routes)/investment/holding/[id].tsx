import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useHoldingsStore } from '@/stores/holdingsStore';
import { useInvestmentTxStore } from '@/stores/investmentTxStore';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCurrency } from '@/hooks/useCurrency';
import { calculateAbsoluteReturn, calculateReturnPercentage } from '@/utils/investmentCalculations';
import { ArrowLeft, Edit2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react-native';
import { format } from 'date-fns';
import UpdatePriceSheet, { UpdatePriceSheetRef } from '@/screens/investment/components/UpdatePriceSheet';
import { FlashList } from '@shopify/flash-list';
import PriceHistoryRow from '@/components/investments/PriceHistoryRow';

export default function HoldingDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();
    const { format: formatCurrency } = useCurrency();
    const { holdings } = useHoldingsStore();
    const { transactionsByHolding, fetchTransactions } = useInvestmentTxStore();

    const updatePriceSheetRef = useRef<UpdatePriceSheetRef>(null);

    // Load price history from SQLite whenever the holding id changes
    useEffect(() => {
        if (id) fetchTransactions(id as string);
    }, [id, fetchTransactions]);

    const holding = useMemo(() => holdings.find(h => h.id === id), [holdings, id]);
    const transactions = useMemo(() => transactionsByHolding[id as string] || [], [transactionsByHolding, id]);

    if (!holding) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.errorText, { color: colors.text }]}>Holding not found.</Text>
            </SafeAreaView>
        );
    }

    const investedAmount = holding.invested_amount || (holding.quantity * holding.avg_buy_price);
    const currentValue = holding.current_value || (holding.quantity * holding.current_price);
    const absReturn = calculateAbsoluteReturn(currentValue, investedAmount);
    const retPercent = calculateReturnPercentage(currentValue, investedAmount);

    const isPositive = absReturn >= 0;

    const priceUpdates = useMemo(() => transactions.filter(t => t.event_type === 'price_update'), [transactions]);

    const renderHeader = () => (
        <View>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.subtitle }]}>Current Value</Text>
                <Text style={[styles.amountText, { color: colors.text }]}>{formatCurrency(currentValue)}</Text>

                <View style={styles.returnRow}>
                    {isPositive ? <TrendingUp size={16} color={colors.success} /> : <TrendingDown size={16} color={colors.error} />}
                    <Text style={[styles.returnAmount, { color: isPositive ? colors.success : colors.error }]}>
                        {isPositive ? '+' : ''}{formatCurrency(absReturn)} ({retPercent.toFixed(2)}%)
                    </Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={[styles.statLabel, { color: colors.subtitle }]}>Invested Amount</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(investedAmount)}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statLabel, { color: colors.subtitle }]}>Quantity</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{holding.quantity} Units</Text>
                    </View>
                </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeaderWithAction}>
                    <Text style={[styles.cardTitle, { color: colors.subtitle }]}>Price Info</Text>
                    <TouchableOpacity
                        style={styles.updatePriceBtn}
                        onPress={() => updatePriceSheetRef.current?.present(holding)}
                    >
                        <RefreshCw size={14} color={colors.primary} />
                        <Text style={[styles.updatePriceText, { color: colors.primary }]}>Update</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.detailGrid}>
                    <View style={styles.detailGridItem}>
                        <Text style={[styles.detailLabel, { color: colors.subtitle }]}>Current Price</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(holding.current_price)}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                        <Text style={[styles.detailLabel, { color: colors.subtitle }]}>Avg. Buy Price</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(holding.avg_buy_price)}</Text>
                    </View>
                    <View style={[styles.detailGridItem, { marginTop: 16 }]}>
                        <Text style={[styles.detailLabel, { color: colors.subtitle }]}>Last Updated</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                            {holding.price_updated_at ? format(new Date(holding.price_updated_at), 'dd MMM yyyy') : 'Never'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.historySection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Price History</Text>
            </View>
        </View>
    );

    const renderEmpty = () => (
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyStateText, { color: colors.subtitle }]}>No price updates recorded.</Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{holding.name}</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.subtitle }]}>{holding.ticker || holding.type}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push(`/investment/edit-holding?id=${holding.id}` as any)} style={styles.editButton}>
                    <Edit2 size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
                <FlashList
                    data={priceUpdates}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <PriceHistoryRow tx={item} />}
                    ListHeaderComponent={renderHeader()}
                    ListEmptyComponent={renderEmpty()}
                    estimatedItemSize={80}
                    contentContainerStyle={styles.scrollContent}
                />
            </View>

            <UpdatePriceSheet ref={updatePriceSheetRef} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
    listContainer: { flex: 1 },
    backButton: { padding: 8, marginRight: 8 },
    headerTitleContainer: { flex: 1 },
    headerTitle: { fontFamily: 'Urbanist-Bold', fontSize: 20 },
    headerSubtitle: { fontFamily: 'Urbanist-Medium', fontSize: 14, marginTop: 2, textTransform: 'uppercase' },
    editButton: { padding: 8 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    card: { borderRadius: 16, padding: 20, marginBottom: 16 },
    cardHeaderWithAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontFamily: 'Urbanist-SemiBold', fontSize: 14 },
    updatePriceBtn: { flexDirection: 'row', alignItems: 'center', padding: 4 },
    updatePriceText: { fontFamily: 'Urbanist-SemiBold', fontSize: 13, marginLeft: 4 },
    amountText: { fontFamily: 'Urbanist-Bold', fontSize: 32 },
    returnRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 20 },
    returnAmount: { fontFamily: 'Urbanist-SemiBold', fontSize: 14, marginLeft: 4 },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 16 },
    statBox: { flex: 1 },
    statLabel: { fontFamily: 'Urbanist-Medium', fontSize: 12, marginBottom: 4 },
    statValue: { fontFamily: 'Urbanist-Bold', fontSize: 16 },

    detailGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    detailGridItem: { width: '50%' },
    detailLabel: { fontFamily: 'Urbanist-Medium', fontSize: 12, marginBottom: 4 },
    detailValue: { fontFamily: 'Urbanist-Bold', fontSize: 16 },

    historySection: { marginTop: 8 },
    sectionTitle: { fontFamily: 'Urbanist-Bold', fontSize: 18, marginBottom: 16 },
    emptyState: { padding: 24, borderRadius: 12, alignItems: 'center' },
    emptyStateText: { fontFamily: 'Urbanist-Medium', fontSize: 14 },
    txItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12 },
    txDate: { fontFamily: 'Urbanist-SemiBold', fontSize: 16 },
    txLabel: { fontFamily: 'Urbanist-Medium', fontSize: 13, marginTop: 4 },
    txAmountContainer: { alignItems: 'flex-end' },
    txAmount: { fontFamily: 'Urbanist-Bold', fontSize: 16 },
    errorText: { fontFamily: 'Urbanist-Medium', fontSize: 16, textAlign: 'center', marginTop: 40 }
});
