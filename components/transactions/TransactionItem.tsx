// src/components/transactions/TransactionList/TransactionItem.tsx
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { Transaction } from '@/types';
import { ThemedText } from '@/components/common/ThemedText';
import { CategoryIcon } from './CategoryIcon';
import { TransactionAmount } from './TransactionAmount';
import { formatDateString } from '@/utils/date';
import { useTheme } from '@/hooks/useTheme';
import { TransactionDetails } from './TransactionText';

interface TransactionItemProps {
    transaction: Transaction;
    isUpcoming?: boolean;
    dateFormate?: string;
}

export const TransactionItem: React.FC<TransactionItemProps> = React.memo(
    ({ transaction, isUpcoming }) => {
        const router = useRouter();
        const { colors } = useTheme();

        const formattedDate = isUpcoming
            ? formatDateString(transaction.date, {
                dateFormat: 'MMM dd, yyyy',
                includeTime: false,
                excludeYearIfCurrent: true
            })
            : formatDateString(transaction.date, { timeOnly: true });

        const handlePress = () => {
            if (isUpcoming && transaction.recurringId) {
                router.push({
                    pathname: '(routes)/transaction/[id]',
                    params: { id: transaction.recurringId, isRecurring: 'true' },
                });
            } else {
                router.push({
                    pathname: '(routes)/transaction/[id]',
                    params: { id: transaction.id, isRecurring: 'false' },
                });
            }
        };

        return (
            <Pressable
                onPress={handlePress}
                style={[styles.container]}
            >
                <Animated.View
                    style={[styles.item, { opacity: isUpcoming ? 0.5 : 1 }]}
                // sharedTransitionTag={`transaction-${transaction.id}`}
                >
                    <CategoryIcon category={transaction.category} />
                    <TransactionDetails
                        transaction={transaction}
                        date={formattedDate}
                        isRecurring={transaction.source.type === 'auto'}
                    />
                </Animated.View>
                <TransactionAmount
                    amount={transaction.amount}
                    type={transaction.type}
                    isUpcoming={isUpcoming}
                />
            </Pressable>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        paddingVertical: 4,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
    },
});