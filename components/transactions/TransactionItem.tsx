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
import { TransactionDetails } from './TransactionText';

interface TransactionItemProps {
    transaction: Transaction;
    isUpcoming?: boolean;
    dateFormate?: string;
}

export const TransactionItem: React.FC<TransactionItemProps> = React.memo(
    ({ transaction, isUpcoming, dateFormate }) => {
        const router = useRouter();

        // Fast-path date formatting to avoid expensive date-fns parseISO during fast scroll
        const formattedDate = React.useMemo(() => {
            if (isUpcoming) {
                return formatDateString(transaction.date, {
                    dateFormat: dateFormate || 'MMM dd, yyyy',
                    includeTime: false,
                    excludeYearIfCurrent: true
                });
            }

            if (dateFormate) {
                return formatDateString(transaction.date, { dateFormat: dateFormate });
            }

            // High-performance path for standard timeline scrolling (time only)
            // ISO date is formatted like "2024-02-19T14:30:00.000Z"
            // We can extract time directly without parsing the whole date object
            try {
                // If it's a valid ISO string with a T
                if (transaction.date.includes('T')) {
                    const timePart = transaction.date.split('T')[1].substring(0, 5); // "14:30"
                    const [hourStr, minStr] = timePart.split(':');
                    let hours = parseInt(hourStr, 10);
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    hours = hours % 12;
                    hours = hours ? hours : 12; // the hour '0' should be '12'
                    return `${hours}:${minStr} ${ampm}`;
                }
            } catch (e) {
                // Fallback
            }

            return formatDateString(transaction.date, { timeOnly: true });
        }, [transaction.date, isUpcoming, dateFormate]);

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