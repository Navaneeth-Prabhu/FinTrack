import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useLayoutEffect, useMemo } from 'react'
import { Transaction } from '@/types'
import { ThemedText } from '@/components/common/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Card } from '@/components/common/Card'
import { LinearGradient } from 'expo-linear-gradient';
import { router, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTransactionStore } from '@/stores/transactionStore'
interface TransactionDetailScreenProps {
    transactionId?: string
}

const TransactionDetailScreen: React.FC<TransactionDetailScreenProps> = ({ transactionId }) => {
    const { transactions, removeTransaction } = useTransactionStore();
    const transaction = useMemo(() => transactions.find(t => t.id === transactionId), [transactionId, transactions]);

    const { colors } = useTheme();
    const navigation = useNavigation();

    const merchantLoyaltyScore = useMemo(() => {
        // If paidTo or paidBy indicates 'Unknown', return 0 immediately
        if (
            transaction?.paidBy?.trim().toLowerCase() == 'unknown payer' ||
            transaction?.paidTo?.trim().toLowerCase() == 'unknown recipient'
        ) {
            return 1;
        }

        // Otherwise, calculate the score based on matching transactions
        return transactions.filter((t: Transaction) => t.paidTo === transaction?.paidTo).length;
    }, [transactions, transaction]);


    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    onPress={() => router.push({
                        pathname: '/transaction/transactionForm',
                        params: { editMode: "true", transactionId: transaction?.id }
                    })}
                    style={{ marginRight: 15 }}
                >
                    <Ionicons name="pencil" size={20} color={colors.text} />
                </TouchableOpacity>
            ),
        });
    })
    return (
        <View style={{ flex: 1, gap: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 20 }}>
                <View style={{
                    borderColor: transaction?.category.color,
                    borderWidth: 2,
                    width: 60,
                    height: 60,
                    borderRadius: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <ThemedText variant='h2'>{transaction?.category.icon}
                    </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                    <ThemedText variant='h2'>{transaction?.paidTo}</ThemedText>
                    <ThemedText variant='subtitle' style={{ color: colors.subtitle }}>{transaction?.category.name}</ThemedText>
                </View>
            </View>
            <View>
                <ThemedText variant='h1'>${transaction?.amount.toFixed(2)}</ThemedText>
                <ThemedText variant='body1' style={{ color: colors.subtitle }}>{transaction?.date}</ThemedText>
            </View>
            {/* <LinearGradient
                // Button Linear Gradient
                
                colors={['#2230FF', '#CAA0FF']}
                style={styles.button}>
                <ThemedText style={styles.text}>Sign in with Facebook</ThemedText>
            </LinearGradient> */}
            <TouchableOpacity onPress={() => router.push(`/transaction/visitedHistory/${transaction?.id}`)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText variant='body1'>Transaction Type</ThemedText>
                    <ThemedText variant='body1'>{merchantLoyaltyScore || 'N/A'}</ThemedText>
                </View>
            </TouchableOpacity>
            <Card variant='outlined' style={{ flex: 1, gap: 10, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText variant='body1'>Transaction Type</ThemedText>
                    <ThemedText variant='body1'>{transaction?.mode?.name || 'N/A'}</ThemedText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText variant='body1'>Account</ThemedText>
                    <ThemedText variant='body1'>{transaction?.toAccount?.name || 'N/A'}</ThemedText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText variant='body1'>Paid To</ThemedText>
                    <ThemedText variant='body1'>{transaction?.paidTo || 'N/A'}</ThemedText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText variant='body1'>Mode</ThemedText>
                    <ThemedText variant='body1'>{transaction?.mode?.name || 'N/A'}</ThemedText>
                </View>
            </Card>
            <Card variant='outlined' style={{ flex: 1, gap: 10, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
                    <ThemedText variant='body1'>Note</ThemedText>
                    <ThemedText variant='body1'>{transaction?.note || 'tab to add'}</ThemedText>
                </View>

            </Card>
            {
                transaction &&
                <TouchableOpacity onPress={() => removeTransaction(transaction?.id)}>
                    <ThemedText variant='body1' style={{ color: colors.error }}>Delete Transaction</ThemedText>
                </TouchableOpacity>
            }
        </View>
    )
}

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