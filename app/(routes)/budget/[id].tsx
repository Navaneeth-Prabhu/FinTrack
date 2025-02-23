import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Screen } from '@/components/layout/Screen'
import BudgetDetailsScreen from '@/screens/budget/budget.details.screen'

const BudgetDetails = () => {
  return (
    <Screen scroll={false}>
      <BudgetDetailsScreen />
    </Screen>
  )
}

export default BudgetDetails

const styles = StyleSheet.create({})