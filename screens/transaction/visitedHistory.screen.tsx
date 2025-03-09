import { StyleSheet, Text, View } from 'react-native'
import React, { useMemo } from 'react'
import { useTransactionStore } from '@/stores/transactionStore';
import { useLocalSearchParams, useSearchParams } from 'expo-router/build/hooks';
import { Transaction } from '@/types';
import { FlatList } from 'react-native-gesture-handler';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { useTheme } from '@/hooks/useTheme';

const VisitedHistoryScreen = () => {

  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const { transactions } = useTransactionStore();
  const transaction = useMemo(() => transactions.find(t => t.id === id), [id, transactions]);
  const merchantLoyaltyTransactions = useMemo(() => {
    // If paidTo or paidBy indicates 'Unknown', return an empty array immediately
    // if (
    //   transaction?.paidBy?.trim().toLowerCase() === 'Unknown Payer' ||
    //   transaction?.paidTo?.trim().toLowerCase() === 'Unknown Recipient'
    // ) {
    //   return [];
    // }

    // Otherwise, return all matching transactions
    return transactions.filter((t: Transaction) => t.category.name === transaction?.category.name);
    // return transactions.filter((t: Transaction) => t.paidTo === transaction?.paidTo);
  }, [transactions, transaction]);


  console.log(merchantLoyaltyTransactions, 'merchantLoyaltyScoremerchantLoyaltyScore');
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, backgroundColor: colors.background }}>
      <Text>VisitedHistoryScreen</Text>
      <FlatList
        data={merchantLoyaltyTransactions}
        renderItem={({ item }) => (
          <View style={{
            // backgroundColor: colors.card,
            paddingHorizontal: 4,
            paddingVertical: 4,
          }}>
            <TransactionItem
              transaction={item}
            // isUpcoming={section.isUpcoming}
            />
          </View>
        )}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => <Text>Visited History</Text>}
      />
    </View>
  )
}

export default VisitedHistoryScreen

const styles = StyleSheet.create({
  list: {
    padding: 10,
    backgroundColor: 'red',
  }
})