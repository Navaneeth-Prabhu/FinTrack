import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Card } from './common/Card'
import { ThemedText } from './common/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { fontSizes, tokens } from '@/constants/theme'

const TotalBalance = () => {
    const { colors } = useTheme()

    return (
        <View style={[styles.container, { borderWidth: 0, borderColor: colors.card, backgroundColor: colors.primary }]}>
            <View style={{ padding: tokens.spacing.md }}>
                <ThemedText variant='body1' style={{ color: 'white', fontWeight: tokens.fontWeight.semibold, }}>Available Balance</ThemedText>

                <ThemedText variant='h1' style={{ fontWeight: tokens.fontWeight.semibold, color: 'white' }}>$234.<ThemedText variant='h1' style={{ fontWeight: tokens.fontWeight.semibold, color: 'white' }}>00</ThemedText></ThemedText>

            </View>
            <View style={[styles.cardFooter, { backgroundColor: colors.card }]}>
                <View style={styles.footerDiv}>
                    <ThemedText variant='body1' style={{ color: colors.subtitle, fontWeight: tokens.fontWeight.medium }}>Today's Expense</ThemedText>
                    <ThemedText variant='subtitle' style={{ fontWeight: tokens.fontWeight.medium }}>
                        1240
                    </ThemedText>
                </View>
                <View style={styles.footerDiv}>
                    <ThemedText variant='body1' style={{ color: colors.subtitle, fontWeight: tokens.fontWeight.medium }}>Expense Last Month</ThemedText>
                    <ThemedText variant='subtitle' style={{ fontWeight: tokens.fontWeight.medium }}>
                        425
                    </ThemedText>
                </View>
            </View>
        </View>
    )
}

export default TotalBalance

const styles = StyleSheet.create({
    container: {
        marginHorizontal: tokens.spacing.md,
        // backgroundColor: '#121212',
        overflow: 'hidden',
        borderRadius: tokens.borderRadius.md,
    },
    cardFooter: {
        flexDirection: 'row',
        flex: 1,
        padding: tokens.spacing.md,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerDiv: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
    }
})