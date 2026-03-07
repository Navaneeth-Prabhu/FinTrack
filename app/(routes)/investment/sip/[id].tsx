import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSIPStore } from '@/stores/sipStore';
import { useInvestmentTxStore } from '@/stores/investmentTxStore';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCurrency } from '@/hooks/useCurrency';
import { ArrowLeft, Edit2, Plus, Calendar, TrendingUp } from 'lucide-react-native';
import { format } from 'date-fns';
import RecordAllotmentSheet from '@/screens/investment/components/RecordAllotmentSheet';
import { FlashList } from '@shopify/flash-list';
import AllotmentRow from '@/components/investments/AllotmentRow';

export default function SIPDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();
    const { format: formatCurrency } = useCurrency();
    const { sips } = useSIPStore();
    const { transactionsByHolding, fetchTransactions } = useInvestmentTxStore();

    const [isAllotmentSheetOpen, setIsAllotmentSheetOpen] = useState(false);

    // Load allotment history from SQLite whenever the SIP id changes
    useEffect(() => {
        if (id) fetchTransactions(id as string);
    }, [id, fetchTransactions]);

    const sip = useMemo(() => sips.find(s => s.id === id), [sips, id]);
    const transactions = useMemo(() => transactionsByHolding[id as string] || [], [transactionsByHolding, id]);

    if (!sip) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.errorText, { color: colors.text }]}>SIP not found.</Text>
            </SafeAreaView>
        );
    }

    const totalTarget = sip.amount * 12; // Example simplified calculation

    const renderHeader = () => (
        <View>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.subtitle }]}>Monthly Investment</Text>
                <Text style={[styles.amountText, { color: colors.text }]}>{formatCurrency(sip.amount)}</Text>

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={[styles.statLabel, { color: colors.subtitle }]}>Total Invested</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(sip.totalInvested)}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statLabel, { color: colors.subtitle }]}>Current Value</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>
                            {sip.currentValue ? formatCurrency(sip.currentValue) : '---'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.subtitle }]}>Details</Text>

                <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                        <Calendar size={18} color={colors.subtitle} />
                        <View style={styles.detailTextContainer}>
                            <Text style={[styles.detailLabel, { color: colors.subtitle }]}>Next Due Date</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{format(new Date(sip.nextDueDate), 'dd MMM, yyyy')}</Text>
                        </View>
                    </View>
                    <View style={styles.detailItem}>
                        <TrendingUp size={18} color={colors.subtitle} />
                        <View style={styles.detailTextContainer}>
                            <Text style={[styles.detailLabel, { color: colors.subtitle }]}>Current NAV</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{sip.nav ? formatCurrency(sip.nav) : 'Not updated'}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.historyHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Allotment History</Text>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary + '20' }]} onPress={() => setIsAllotmentSheetOpen(true)}>
                    <Plus size={16} color={colors.primary} />
                    <Text style={[styles.addButtonText, { color: colors.primary }]}>Add</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderEmpty = () => (
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyStateText, { color: colors.subtitle }]}>No transactions recorded yet.</Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{sip.name}</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.subtitle }]}>{sip.fundName}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push(`/investment/edit-sip?id=${sip.id}` as any)} style={styles.editButton}>
                    <Edit2 size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
                <FlashList
                    data={transactions}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <AllotmentRow tx={item} />}
                    ListHeaderComponent={renderHeader()}
                    ListEmptyComponent={renderEmpty()}
                    estimatedItemSize={80}
                    contentContainerStyle={styles.scrollContent}
                />
            </View>

            <RecordAllotmentSheet
                isOpen={isAllotmentSheetOpen}
                onClose={() => setIsAllotmentSheetOpen(false)}
                sip={sip}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    listContainer: {
        flex: 1,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontFamily: 'Urbanist-Bold',
        fontSize: 20,
    },
    headerSubtitle: {
        fontFamily: 'Urbanist-Medium',
        fontSize: 14,
        marginTop: 2,
    },
    editButton: {
        padding: 8,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    cardTitle: {
        fontFamily: 'Urbanist-SemiBold',
        fontSize: 14,
        marginBottom: 8,
    },
    amountText: {
        fontFamily: 'Urbanist-Bold',
        fontSize: 32,
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 16,
    },
    statBox: {
        flex: 1,
    },
    statLabel: {
        fontFamily: 'Urbanist-Medium',
        fontSize: 12,
        marginBottom: 4,
    },
    statValue: {
        fontFamily: 'Urbanist-Bold',
        fontSize: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    detailTextContainer: {
        marginLeft: 12,
    },
    detailLabel: {
        fontFamily: 'Urbanist-Medium',
        fontSize: 12,
    },
    detailValue: {
        fontFamily: 'Urbanist-SemiBold',
        fontSize: 14,
        marginTop: 2,
    },
    historySection: {
        marginTop: 8,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontFamily: 'Urbanist-Bold',
        fontSize: 18,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    addButtonText: {
        fontFamily: 'Urbanist-SemiBold',
        fontSize: 14,
        marginLeft: 4,
    },
    emptyState: {
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
    },
    emptyStateText: {
        fontFamily: 'Urbanist-Medium',
        fontSize: 14,
    },
    txItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    txDate: {
        fontFamily: 'Urbanist-SemiBold',
        fontSize: 16,
    },
    txUnits: {
        fontFamily: 'Urbanist-Medium',
        fontSize: 13,
        marginTop: 4,
    },
    txAmountContainer: {
        alignItems: 'flex-end',
    },
    txAmount: {
        fontFamily: 'Urbanist-Bold',
        fontSize: 16,
    },
    txNav: {
        fontFamily: 'Urbanist-Medium',
        fontSize: 12,
        marginTop: 4,
    },
    errorText: {
        fontFamily: 'Urbanist-Medium',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 40,
    }
});
