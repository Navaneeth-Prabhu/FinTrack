import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect } from 'react'
import { useBudgetStore } from '@/stores/budgetStore'
import { BudgetCard } from '@/components/BudgetCard';
import { ThemedText } from '@/components/common/ThemedText';
import { router } from 'expo-router';

const BudgetScreen = () => {
  const { budgets, fetchBudgets } = useBudgetStore();

  useEffect(() => {
    fetchBudgets();

  }, []);

  return (
    <View>
      <TouchableOpacity onPress={() => router.push('/(routes)/budget/budgetForm')}>
        <ThemedText variant='h3'>Add Budget</ThemedText>
      </TouchableOpacity>
      <Text>{budgets.length}</Text>
      {
        budgets.map((budget) => (
          <BudgetCard key={budget.id} budget={budget} />
        ))
      }
      {/* <BudgetCard budget={sampleBudget} /> */}
    </View>
  )
}

export default BudgetScreen

const styles = StyleSheet.create({})