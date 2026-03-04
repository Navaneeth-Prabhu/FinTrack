// components/investments/AllotmentRow.tsx
// Row component for one SIP allotment event in the detail screen history list.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency } from '@/hooks/useCurrency';
import { InvestmentTransaction } from '@/types';
import { format as formatDate } from 'date-fns';

interface Props {
    tx: InvestmentTransaction;
}

export default function AllotmentRow({ tx }: Props) {
    const { colors } = useTheme();
    const { format } = useCurrency();

    const isManual = !tx.source || tx.source === 'manual';
    const sourceBadgeColor = isManual ? colors.primary : colors.warning;
    const sourceBadgeLabel = isManual ? 'Manual' : 'SMS';

    const dateStr = tx.event_date
        ? formatDate(new Date(tx.event_date), 'dd MMM yyyy')
        : '—';

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            {/* Left side: date + units info */}
            <View style={styles.left}>
                <Text style={[styles.date, { color: colors.text }]}>{dateStr}</Text>
                {tx.units ? (
                    <Text style={[styles.sub, { color: colors.subtitle }]}>
                        {tx.units.toFixed(4)} units
                        {tx.nav ? ` @ NAV ₹${tx.nav}` : ''}
                    </Text>
                ) : (
                    <Text style={[styles.sub, { color: colors.subtitle }]}>Amount deducted</Text>
                )}
            </View>

            {/* Right side: amount + source badge */}
            <View style={styles.right}>
                <Text style={[styles.amount, { color: colors.success }]}>
                    +{format(tx.amount)}
                </Text>
                <View style={[styles.badge, { backgroundColor: sourceBadgeColor + '20', borderColor: sourceBadgeColor + '40', borderWidth: 1 }]}>
                    <Text style={[styles.badgeText, { color: sourceBadgeColor }]}>{sourceBadgeLabel}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 10,
    },
    left: {
        flex: 1,
        marginRight: 12,
    },
    date: {
        fontFamily: 'Urbanist-SemiBold',
        fontSize: 15,
        marginBottom: 3,
    },
    sub: {
        fontFamily: 'Urbanist-Medium',
        fontSize: 12,
    },
    right: {
        alignItems: 'flex-end',
    },
    amount: {
        fontFamily: 'Urbanist-Bold',
        fontSize: 16,
        marginBottom: 4,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeText: {
        fontFamily: 'Urbanist-SemiBold',
        fontSize: 10,
    },
});
