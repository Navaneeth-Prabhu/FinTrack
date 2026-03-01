import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { ThemedText } from '@/components/common/ThemedText';
import { Category, Transaction } from '@/types';
import { useTheme } from '@/hooks/useTheme';

interface TransactionDetailsProps {
    transaction: Transaction;
    date: string;
    isRecurring: boolean;
}

export const TransactionDetails: React.FC<TransactionDetailsProps> = React.memo((
    { transaction, date, isRecurring }
) => {
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            <View style={styles.titleContainer}>
                <ThemedText variant='h3' numberOfLines={2} style={{ color: colors.text }}>
                    {transaction.paidTo || transaction.paidBy || "Unknown"}
                </ThemedText>
                {isRecurring ? (
                    <FontAwesome name="repeat" size={14} color={colors.muted} />
                ) : null}
            </View>
            <ThemedText variant='body1' style={[{ color: colors.subtitle }]}>
                {date}
            </ThemedText>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        // gap: 4,
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});