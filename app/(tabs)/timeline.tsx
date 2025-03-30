import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import TimeLineScreen from '@/screens/transaction/timeline.screen'
import { FloatingActionButton } from '@/components/layout/FloatingActionButton'

const TimeLine = () => {
    return (
        <>
            <FloatingActionButton />
            <TimeLineScreen />
        </>
    )
}

export default TimeLine

const styles = StyleSheet.create({})