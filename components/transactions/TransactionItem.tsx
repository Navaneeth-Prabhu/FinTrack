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
    ({ transaction, isUpcoming, dateFormate }) => {
        const router = useRouter();
        const { colors } = useTheme();

        // Use dateFormate prop if provided, otherwise use defaults
        const formattedDate = isUpcoming
            ? formatDateString(transaction.date, {
                dateFormat: dateFormate || 'MMM dd, yyyy',
                includeTime: false,
                excludeYearIfCurrent: true
            })
            : formatDateString(transaction.date, dateFormate ? { dateFormat: dateFormate } : { timeOnly: true });

        const handlePress = React.useCallback(() => {
            if (isUpcoming && transaction.recurringId) {
                router.push({
                    pathname: '/(routes)/transaction/[id]',
                    params: { id: transaction.recurringId, isRecurring: 'true' },
                });
            } else {
                router.push({
                    pathname: '/(routes)/transaction/[id]',
                    params: { id: transaction.id, isRecurring: 'false' },
                });
            }
        }, [isUpcoming, transaction.recurringId, transaction.id, router]);

        return (
            <Pressable
                onPress={handlePress}
                style={[styles.container]}
            >
                <Animated.View
                    style={[styles.item, { opacity: isUpcoming ? 0.5 : 1 }]}
                >
                    <CategoryIcon category={transaction.category} />
                    <View style={{ flexShrink: 1, minWidth: 0 }}>
                        <TransactionDetails
                            transaction={transaction}
                            date={formattedDate}
                            isRecurring={transaction.source.type === 'auto'}
                        />
                    </View>
                </Animated.View>
                <View style={styles.amountContainer}>
                    <TransactionAmount
                        amount={transaction.amount}
                        type={transaction.type}
                        isUpcoming={isUpcoming}
                    />
                </View>
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
        justifyContent: 'flex-start',
        gap: 16,
        flex: 1,
        minWidth: 0,
    },
    amountContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        minWidth: 80,
        paddingLeft: 4,
    },
});