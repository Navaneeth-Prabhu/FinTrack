// components/investments/PriceHistoryRow.tsx
// Row component for one price update event in the holding detail screen.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency } from '@/hooks/useCurrency';
import { InvestmentTransaction } from '@/types';
import { format as formatDate } from 'date-fns';

interface Props {
    tx: InvestmentTransaction;
    prevPrice?: number; // price of the immediately preceding update (for change calculation)
}

type SourceKind = 'manual' | 'amfi' | 'sms';

export default function PriceHistoryRow({ tx, prevPrice }: Props) {
    const { colors } = useTheme();
    const { format } = useCurrency();

    const source: SourceKind =
        tx.source === 'amfi' ? 'amfi'
            : tx.source === 'sms' ? 'sms'
                : 'manual';

    const badgeColors: Record<SourceKind, string> = {
        manual: colors.primary,
        amfi: colors.success,
        sms: colors.warning,
    };
    const badgeLabels: Record<SourceKind, string> = {
        manual: 'Manual',
        amfi: 'AMFI',
        sms: 'SMS',
    };

    const price = tx.price ?? tx.nav ?? 0;

    // Change computation (relative to previous price in the list)
    let changePct: number | null = null;
    let changeAbs: number | null = null;
    if (prevPrice && prevPrice > 0 && price > 0) {
        changeAbs = price - prevPrice;
        changePct = (changeAbs / prevPrice) * 100;
    }

    const isUp = changePct !== null && changePct > 0;
    const isDown = changePct !== null && changePct < 0;
    const changeColor = isUp ? colors.success : isDown ? colors.error : colors.subtitle;

    const dateStr = tx.event_date
        ? formatDate(new Date(tx.event_date), 'dd MMM yyyy')
        : '—';

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <View style={styles.left}>
                <Text style={[styles.date, { color: colors.text }]}>{dateStr}</Text>
                {changePct !== null ? (
                    <View style={styles.changeRow}>
                        {isUp ? <TrendingUp size={12} color={changeColor} />
                            : isDown ? <TrendingDown size={12} color={changeColor} />
                                : <Minus size={12} color={changeColor} />}
                        <Text style={[styles.changeText, { color: changeColor }]}>
                            {' '}{isUp ? '+' : ''}{changePct.toFixed(2)}%
                            {changeAbs !== null ? ` (${isUp ? '+' : ''}${format(changeAbs)})` : ''}
                        </Text>
                    </View>
                ) : (
                    <Text style={[styles.sub, { color: colors.subtitle }]}>Price recorded</Text>
                )}
            </View>

            <View style={styles.right}>
                <Text style={[styles.price, { color: colors.text }]}>{format(price)}</Text>
                <View style={[styles.badge, { backgroundColor: badgeColors[source] + '20', borderColor: badgeColors[source] + '40', borderWidth: 1 }]}>
                    <Text style={[styles.badgeText, { color: badgeColors[source] }]}>{badgeLabels[source]}</Text>
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
    changeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    changeText: {
        fontFamily: 'Urbanist-Medium',
        fontSize: 12,
    },
    right: {
        alignItems: 'flex-end',
    },
    price: {
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
