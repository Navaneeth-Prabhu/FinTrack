import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Transaction } from '@/types'
import { ThemedText } from '@/components/common/ThemedText'

interface TransactionDetailScreenProps {
    transaction: Transaction
}

const TransactionDetailScreen: React.FC<TransactionDetailScreenProps> = ({ transaction }) => {
    return (
        <View>
            <View>
                <View style={{
                    borderColor: transaction.category.color,
                    borderWidth: 2,
                    width: 60,
                    height: 60,
                    borderRadius: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <ThemedText variant='h2'>{transaction.category.icon}</ThemedText>
                </View>
                <ThemedText>{transaction.category.name}</ThemedText>
            </View>
        </View>
    )
}

export default TransactionDetailScreen

const styles = StyleSheet.create({})