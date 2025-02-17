import { StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
import { useTransactionStore } from '@/stores/transactionStore'
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { Card } from '@/components/common/Card';
import { useTheme } from '@/hooks/useTheme';
import { tokens } from '@/constants/theme';
import  PieChartWithDynamicSlices  from '@/components/charts/pieChart';
import  InteractiveChart  from '@/components/charts/lineChart';
const HomeScreen = () => {
    const { colors } = useTheme();
    const { transactions, fetchTransactions } = useTransactionStore();
    let top5Transactions = transactions.slice(0, 5);

    useEffect(() => {
        fetchTransactions();
    }, [])
    return (
        <View>
            {/* <PieChartWithDynamicSlices  /> */}
            {/* <InteractiveChart/> */}
            <Text>HomeScreen</Text>
            <View style={{
                backgroundColor: colors.background, borderRadius: tokens.borderRadius.md, overflow: 'hidden'
            }}>
                {
                    top5Transactions.map((item, index) => (
                        <View
                            key={item.id}
                            style={{
                                borderBottomColor: colors.background,
                                borderBottomWidth: index === top5Transactions.length - 1 ? 0 : 2,
                                backgroundColor: colors.card,
                                paddingHorizontal: tokens.spacing.md,
                                paddingVertical: 4
                            }}>
                            <TransactionItem
                                key={item.id}
                                transaction={item}
                            // isUpcoming={section.isUpcoming}
                            />
                        </View>
                    ))
                }
            </View>
        </View>
    )
}

export default HomeScreen

const styles = StyleSheet.create({})