import { StyleSheet, Text, View } from 'react-native'
import React, { useMemo } from 'react'
import { Screen } from '@/components/layout/Screen'
import { ThemedText } from '@/components/common/ThemedText'
import { useLocalSearchParams } from 'expo-router'
import { Header } from '@/components/layout/Header'
import { useTransactionStore } from '@/stores/transactionStore'
import TransactionDetailScreen from '@/screens/transaction/transaction.details.screen'

const TransactionDetails = () => {
    const { id } = useLocalSearchParams()
    const { transactions } = useTransactionStore();
    const transaction = useMemo(() => transactions.find(t => t.id === id), [id, transactions]);
    console.log(id, transaction, 'idid');
    return (
        <Screen >
            {
                transaction &&
                <TransactionDetailScreen transaction={transaction} />
            }
        </Screen>
    )
}

export default TransactionDetails

const styles = StyleSheet.create({})