import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Screen } from '@/components/layout/Screen'
import { ThemedText } from '@/components/common/ThemedText'
import SearchTransactionScreen from '@/screens/transaction/searchTransactions.screen'

const SearchTransaction = () => {
  return (
    <Screen scroll={false} style={{ flex: 1 }}>
      <SearchTransactionScreen />
    </Screen>
  )
}

export default SearchTransaction

const styles = StyleSheet.create({})