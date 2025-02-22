import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import BudgetFormScreen from '@/screens/budget/budgetForm.screen'
import { Screen } from '@/components/layout/Screen'

const BudgetForm = () => {
    return (
        <Screen>
            <Text>BudgetForm</Text>
            <BudgetFormScreen />
        </Screen>
    )
}

export default BudgetForm

const styles = StyleSheet.create({})