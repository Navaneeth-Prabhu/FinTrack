import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import React, { useLayoutEffect, useMemo } from 'react'
import { Transaction, RecurringTransaction } from '@/types'
import { ThemedText } from '@/components/common/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Card } from '@/components/common/Card'
import { router, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTransactionStore } from '@/stores/transactionStore'
import { useRecurringTransactionStore } from '@/stores/recurringTransactionStore'
import { formatDateString } from '@/utils/date'
interface TransactionDetailScreenProps {
    transactionId?: string,
    isRecurring: boolean;
}

const TransactionDetailScreen: React.FC<TransactionDetailScreenProps> = ({ transactionId, isRecurring }) => {
    const { transactions, removeTransaction } = useTransactionStore();
    const { recurringTransactions, removeRecurringTransaction } = useRecurringTransactionStore();
    const transaction = useMemo(() => transactions.find(t => t.id === transactionId), [transactionId, transactions]);
    const recurring = useMemo(() => recurringTransactions.find(r => r.id === transactionId), [transactionId, recurringTransactions]);
    const linkedRecurring = useMemo(() =>
        transaction?.recurringId ? recurringTransactions.find(r => r.id === transaction.recurringId) : null,
        [transaction, recurringTransactions]
    );

    const { colors, isDark } = useTheme();
    const navigation = useNavigation();

    const merchantLoyaltyScore = useMemo(() => {
        if (!transaction) return 'N/A';
        if (
            transaction.paidBy?.trim().toLowerCase() === 'unknown payer' ||
            transaction.paidTo?.trim().toLowerCase() === 'unknown recipient'
        ) {
            return 1;
        }
        if (transaction.type === 'transfer' || transaction.type === 'expense') {
            return transactions.filter((t: Transaction) => t.paidTo === transaction?.paidTo).length;
        } else if (transaction.type === 'income') {
            return transactions.filter((t: Transaction) => t.paidBy === transaction?.paidBy).length;
        }
    }, [transactions, transaction]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <>
                    <TouchableOpacity
                        onPress={() => router.push({
                            pathname: '/transaction/transactionForm',
                            params: {
                                editMode: 'true',
                                transactionId: isRecurring ? recurring?.id : transaction?.id,
                                isRecurring: isRecurring ? 'true' : linkedRecurring ? 'linked' : 'false',
                            }
                        })}
                        style={{ marginRight: 15 }}
                    >
                        <Ionicons name="pencil" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert(
                                "Delete Transaction",
                                "Are you sure you want to delete this transaction?",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    {
                                        text: "Delete",
                                        style: "destructive",
                                        onPress: () => {
                                            if (isRecurring) {
                                                removeRecurringTransaction(String(recurring?.id));
                                            } else {
                                                removeTransaction(String(transaction?.id));
                                            }
                                            router.back();
                                        }
                                    }
                                ]
                            );
                        }}

                        style={{ marginRight: 15 }}
                    >
                        <Ionicons name="trash-outline" size={20} color={colors.text} />
                    </TouchableOpacity>
                </>
            ),
        });
    }, [navigation, transaction, recurring, linkedRecurring, isRecurring]);

    if (!transaction && !recurring) {
        return <ThemedText>Loading or invalid transaction...</ThemedText>;
    }

    const data = isRecurring ? recurring : transaction;

    console.log(data)
    return (
        <View style={{ flex: 1, gap: 24, backgroundColor: colors.background }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, backgroundColor: colors.background }}>
                <View style={{
                    borderColor: data?.category.color,
                    borderWidth: 2,
                    width: 60,
                    height: 60,
                    borderRadius: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <ThemedText variant="h2">{data?.category.icon}</ThemedText>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                    <ThemedText variant="h2">
                        {isRecurring
                            ? (data as RecurringTransaction)?.payee || 'Recurring Template'
                            : (data as Transaction)?.paidTo || (data as Transaction)?.paidBy || 'N/A'}
                    </ThemedText>
                    <ThemedText variant="h3" style={{ color: colors.subtitle }}>
                        {data?.category.name} {isRecurring ? '(Template)' : linkedRecurring ? '(Recurring Instance)' : ''}
                    </ThemedText>
                </View>
            </View>

            {/* Amount and Date */}
            <View>
                <ThemedText variant="h1">${data?.amount.toFixed(2)}</ThemedText>
                <ThemedText variant="body1" style={{ color: colors.subtitle }}>
                    {isRecurring
                        ? `Starting: ${formatDateString(recurring?.startDate || '', { dateFormat: 'eeee, MMM dd, yyyy', relative: false })}`
                        : formatDateString(transaction?.date || '', { dateFormat: 'eeee, MMM dd, yyyy', relative: false })}
                </ThemedText>
            </View>

            {/* Recurring Details */}
            {(isRecurring || linkedRecurring) && (
                <Card variant="outlined" style={{ gap: 10, borderWidth: 1, borderColor: colors.border }}>
                    <ThemedText variant="h3">Recurring Schedule</ThemedText>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText variant="body1">Frequency</ThemedText>
                        <ThemedText variant="body1">{(isRecurring ? recurring : linkedRecurring)?.frequency}</ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText variant="body1">Interval</ThemedText>
                        <ThemedText variant="body1">
                            Every {(isRecurring ? recurring : linkedRecurring)?.interval} {(isRecurring ? recurring : linkedRecurring)?.frequency}(s)
                        </ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText variant="body1">Start Date</ThemedText>
                        <ThemedText variant="body1">
                            {formatDateString((isRecurring ? recurring : linkedRecurring)?.startDate || '', { dateFormat: 'eeee, MMM dd, yyyy', relative: false })}
                        </ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText variant="body1">End Date</ThemedText>
                        <ThemedText variant="body1">
                            {(isRecurring ? recurring : linkedRecurring)?.endDate
                                ? formatDateString((isRecurring ? recurring : linkedRecurring)?.endDate || '', { dateFormat: 'eeee, MMM dd, yyyy', relative: false })
                                : 'Never'}
                        </ThemedText>
                    </View>
                </Card>
            )}

            {/* Transaction Details */}
            {!isRecurring && (
                <Card variant="outlined" style={{ gap: 10, borderWidth: 1, borderColor: colors.border }}>
                    {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText variant="body1">Transaction Type</ThemedText>
                        <ThemedText variant="body1">{transaction?.mode || 'N/A'}</ThemedText>
                    </View> */}
                    {(transaction?.fromAccount || transaction?.toAccount) && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <ThemedText variant="body1">Account</ThemedText>
                            <ThemedText variant="body1">
                                {transaction?.type === 'income'
                                    ? transaction?.toAccount?.name
                                    : transaction?.fromAccount?.name}
                            </ThemedText>
                        </View>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText variant="body1">{transaction?.type === 'income' ? 'Paid By' : 'Paid To'}</ThemedText>
                        <ThemedText variant="body1">
                            {transaction?.type === 'income'
                                ? transaction?.paidBy || 'N/A'
                                : transaction?.paidTo || 'N/A'}
                        </ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <ThemedText variant="body1">Mode</ThemedText>
                        <ThemedText variant="body1">{transaction?.mode || 'N/A'}</ThemedText>
                    </View>
                    {transaction?.refNumber && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <ThemedText variant="body1">Reference No.</ThemedText>
                            <ThemedText variant="body1" style={{ color: colors.primary }}>
                                {transaction.refNumber}
                            </ThemedText>
                        </View>
                    )}
                </Card>
            )}
            <TouchableOpacity onPress={() => router.push(`/transaction/visitedHistory/${transaction?.id}`)}>
                <Card variant="outlined" style={{ gap: 8, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText variant="body1">Visited</ThemedText>
                    <ThemedText variant="body1">{merchantLoyaltyScore}</ThemedText>
                </Card>
            </TouchableOpacity>
            {/* Notes */}
            <Card variant="outlined" style={{ gap: 8, borderWidth: 1, borderColor: colors.border }}>
                <ThemedText variant="body1">Note</ThemedText>
                <ThemedText variant="body1">{(data as any)?.note || (data as any)?.description || 'No note added'}</ThemedText>
            </Card>
            {/* Raw SMS Data */}
            {!isRecurring && transaction?.source?.rawData && (
                <Card variant="outlined" style={{ gap: 8, borderWidth: 1, borderColor: colors.border }}>
                    <ThemedText variant="body1">Raw SMS</ThemedText>
                    <ThemedText variant="body1">{transaction.source.rawData}</ThemedText>
                </Card>
            )}
        </View>
    );
};
export default TransactionDetailScreen

const styles = StyleSheet.create({
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 300,
    },
    button: {
        padding: 15,
        alignItems: 'center',
        borderRadius: 5,
    },
    text: {
        backgroundColor: 'transparent',
        fontSize: 15,
        color: '#fff',
    },
})