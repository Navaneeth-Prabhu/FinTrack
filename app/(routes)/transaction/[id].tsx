import { StyleSheet, Text, View } from 'react-native'
import React, { useMemo } from 'react'
import { Screen } from '@/components/layout/Screen'
import { ThemedText } from '@/components/common/ThemedText'
import { useLocalSearchParams } from 'expo-router'
import { Header } from '@/components/layout/Header'
import { useTransactionStore } from '@/stores/transactionStore'
import TransactionDetailScreen from '@/screens/transaction/transaction.details.screen'
import { useTheme } from '@/hooks/useTheme'
import { useRecurringTransactionStore } from '@/stores/recurringTransactionStore'

const TransactionDetails = () => {
    const { id, isRecurring } = useLocalSearchParams()
    const { transactions } = useTransactionStore();
    const { recurringTransactions } = useRecurringTransactionStore();
    const transaction = useMemo(() =>
        isRecurring === 'true'
            ? null
            : transactions.find(t => t.id === id),
        [id, transactions, isRecurring]
    );
    const recurringTransaction = useMemo(() =>
        isRecurring === 'true'
            ? recurringTransactions.find(r => r.id === id)
            : transaction?.recurringId
                ? recurringTransactions.find(r => r.id === transaction.recurringId)
                : null,
        [id, recurringTransactions, transaction, isRecurring]
    );
    return (
        <Screen>
            {transaction || recurringTransaction ? (
                <TransactionDetailScreen
                    transactionId={id as string}
                    isRecurring={isRecurring === 'true'}
                />
            ) : (
                <ThemedText>No transaction found</ThemedText>
            )}
        </Screen>
    )
}

export default TransactionDetails

const styles = StyleSheet.create({})