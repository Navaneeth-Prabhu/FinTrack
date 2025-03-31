import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Card } from './common/Card'
import { ThemedText } from './common/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { fontSizes } from '@/constants/theme'

const TotalBalance = () => {
    const { colors } = useTheme()

    return (
        <Card variant='outlined'>
            <ThemedText variant='subtitle' style={{ color: colors.subtitle }}>TotalBalance</ThemedText>

            <ThemedText variant='h1'>$ 0.00</ThemedText>
            <View style={{backgroundColor: colors.accent, flex:1,}}>
                <ThemedText variant='body1' style={{ color: colors.muted }}>TotalBalance</ThemedText>
            </View>
        </Card>
    )
}

export default TotalBalance

const styles = StyleSheet.create({})