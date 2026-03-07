import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLoanStore } from '@/stores/loanStore';
import { useInvestmentTxStore } from '@/stores/investmentTxStore';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCurrency } from '@/hooks/useCurrency';
import { ArrowLeft, Edit2, Plus, Calendar, Shield } from 'lucide-react-native';
import { format } from 'date-fns';
import RecordPaymentSheet from '@/screens/investment/components/RecordPaymentSheet';
import { calculateOutstandingBalance } from '@/utils/investmentCalculations';
import { FlashList } from '@shopify/flash-list';
import PaymentRow from '@/components/investments/PaymentRow';

export default function LoanDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors } = useTheme();
    const { format: formatCurrency } = useCurrency();
    const { loans } = useLoanStore();
    const { transactionsByHolding, fetchTransactions } = useInvestmentTxStore();

    const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);

    // Load payment history from SQLite whenever the loan id changes
    useEffect(() => {
        if (id) fetchTransactions(id as string);
    }, [id, fetchTransactions]);

    const loan = useMemo(() => loans.find(l => l.id === id), [loans, id]);
    const transactions = useMemo(() => transactionsByHolding[id as string] || [], [transactionsByHolding, id]);

    if (!loan) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.errorText, { color: colors.text }]}>Loan not found.</Text>
            </SafeAreaView>
        );
    }

    const paidAmount = loan.principal - loan.outstanding;
    const progress = loan.principal > 0 ? paidAmount / loan.principal : 0;

    const renderHeader = () => (
        <View>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.subtitle }]}>Outstanding Balance</Text>
                <Text style={[styles.amountText, { color: colors.text }]}>{formatCurrency(loan.outstanding)}</Text>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${progress * 100}%` }]} />
                    </View>
                    <View style={styles.progressLabels}>
                        <Text style={[styles.progressLabel, { color: colors.subtitle }]}>{formatCurrency(paidAmount)} Paid</Text>
                        <Text style={[styles.progressLabel, { color: colors.subtitle }]}>{formatCurrency(loan.principal)} Total</Text>
                    </View>
                </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.subtitle }]}>Details</Text>

                <View style={styles.detailGrid}>
                    <View style={styles.detailGridItem}>
                        <Text style={[styles.detailLabel, { color: colors.subtitle }]}>EMI Amount</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(loan.emiAmount)}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                        <Text style={[styles.detailLabel, { color: colors.subtitle }]}>Due Day</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{loan.emiDueDay}th of month</Text>
                    </View>
                    <View style={[styles.detailGridItem, { marginTop: 16 }]}>
                        <Text style={[styles.detailLabel, { color: colors.subtitle }]}>Tenure</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{loan.tenureMonths} Months</Text>
                    </View>
                    <View style={[styles.detailGridItem, { marginTop: 16 }]}>
                        <Text style={[styles.detailLabel, { color: colors.subtitle }]}>Status</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{loan.status.toUpperCase()}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.historyHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment History</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary + '20' }]}
                    onPress={() => setIsPaymentSheetOpen(true)}
                >
                    <Plus size={16} color={colors.primary} />
                    <Text style={[styles.addButtonText, { color: colors.primary }]}>Pay</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderEmpty = () => (
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyStateText, { color: colors.subtitle }]}>No payments recorded yet.</Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{loan.lender}</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.subtitle }]}>{loan.loanType} Loan</Text>
                </View>
                <TouchableOpacity onPress={() => router.push(`/investment/edit-loan?id=${loan.id}` as any)} style={styles.editButton}>
                    <Edit2 size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
                <FlashList
                    data={transactions}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <PaymentRow tx={item} />}
                    ListHeaderComponent={renderHeader()}
                    ListEmptyComponent={renderEmpty()}
                    estimatedItemSize={80}
                    contentContainerStyle={styles.scrollContent}
                />
            </View>

            <RecordPaymentSheet
                isOpen={isPaymentSheetOpen}
                onClose={() => setIsPaymentSheetOpen(false)}
                loan={loan}
            />
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
    headerSubtitle: { fontFamily: 'Urbanist-Medium', fontSize: 14, marginTop: 2, textTransform: 'capitalize' },
    editButton: { padding: 8 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    card: { borderRadius: 16, padding: 20, marginBottom: 16 },
    cardTitle: { fontFamily: 'Urbanist-SemiBold', fontSize: 14, marginBottom: 8 },
    amountText: { fontFamily: 'Urbanist-Bold', fontSize: 32, marginBottom: 20 },

    progressContainer: { marginTop: 8 },
    progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    progressLabel: { fontFamily: 'Urbanist-Medium', fontSize: 12 },

    detailGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    detailGridItem: { width: '50%' },
    detailLabel: { fontFamily: 'Urbanist-Medium', fontSize: 12, marginBottom: 4 },
    detailValue: { fontFamily: 'Urbanist-Bold', fontSize: 16 },

    historySection: { marginTop: 8 },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontFamily: 'Urbanist-Bold', fontSize: 18 },
    addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    addButtonText: { fontFamily: 'Urbanist-SemiBold', fontSize: 14, marginLeft: 4 },
    emptyState: { padding: 24, borderRadius: 12, alignItems: 'center' },
    emptyStateText: { fontFamily: 'Urbanist-Medium', fontSize: 14 },
    txItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12 },
    txDate: { fontFamily: 'Urbanist-SemiBold', fontSize: 16 },
    txLabel: { fontFamily: 'Urbanist-Medium', fontSize: 13, marginTop: 4 },
    txAmountContainer: { alignItems: 'flex-end' },
    txAmount: { fontFamily: 'Urbanist-Bold', fontSize: 16 },
    errorText: { fontFamily: 'Urbanist-Medium', fontSize: 16, textAlign: 'center', marginTop: 40 }
});
