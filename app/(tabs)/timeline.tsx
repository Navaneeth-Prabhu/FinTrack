import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import TimeLineScreen from '@/screens/transaction/timeline.screen'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const TimeLine = () => {
    return (
        <ErrorBoundary>
            <TimeLineScreen />
        </ErrorBoundary>
    )
}

export default TimeLine

const styles = StyleSheet.create({})