import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Screen } from '@/components/layout/Screen'
import VisitedHistoryScreen from '@/screens/transaction/visitedHistory.screen'

const visitedHistory = () => {
    return (
        <Screen>
            <VisitedHistoryScreen />
        </Screen>
    )
}

export default visitedHistory

const styles = StyleSheet.create({})