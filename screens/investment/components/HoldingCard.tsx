import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { Holding } from '@/types';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays, parseISO } from 'date-fns';

interface HoldingCardProps {
    holding: Holding;
    onUpdatePrice: (holding: Holding) => void;
}

export default function HoldingCard({ holding, onUpdatePrice }: HoldingCardProps) {
    const { colors } = useTheme();
    const { format } = useCurrency();

    const isFixedIncome = ['fd', 'bond', 'ppf', 'nps'].includes(holding.type);

    const invested = isFixedIncome ? holding.avg_buy_price : holding.quantity * holding.avg_buy_price;
    const currentPrice = holding.current_price || holding.avg_buy_price;
    const currentValue = isFixedIncome ? currentPrice : holding.quantity * currentPrice;

    const profit = currentValue - invested;
    const isProfit = profit >= 0;
    const returnsPercentage = invested > 0 ? (profit / invested) * 100 : 0;
    const returnColor = isProfit ? colors.success : '#FF4D4D';

    let iconName: keyof typeof Ionicons.glyphMap = 'cash-outline';
    if (holding.type === 'stock') iconName = 'stats-chart';
    if (holding.type === 'fd' || holding.type === 'bond') iconName = 'business';
    if (holding.type === 'gold') iconName = 'aperture';
    if (holding.type === 'crypto') iconName = 'logo-bitcoin';
    if (holding.type === 'ppf' || holding.type === 'nps') iconName = 'shield-checkmark';

    let staleDays = 0;
    if (holding.price_updated_at) {
        staleDays = differenceInDays(new Date(), parseISO(holding.price_updated_at));
    }

    const showStaleBadge = staleDays > 2 && !isFixedIncome;

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }]}
            onPress={() => onUpdatePrice(holding)}
            activeOpacity={0.8}
        >
            <View style={styles.iconContainer}>
                <Ionicons name={iconName} size={20} color="#60A5FA" />
            </View>

            <View style={styles.titleContainer}>
                <ThemedText style={styles.name} numberOfLines={1}>{holding.name}</ThemedText>
                <ThemedText style={{ color: colors.subtitle, fontSize: 13 }}>
                    {holding.ticker ? `${holding.ticker} • ` : ''}
                    {!isFixedIncome ? `${holding.quantity} shares` : 'Maturity unknown'}
                </ThemedText>
            </View>

            <View style={styles.rightStats}>
                <ThemedText style={styles.currentValue}>{format(currentValue)}</ThemedText>

                <View style={styles.returnsRow}>
                    <ThemedText style={{ color: returnColor, fontSize: 13, fontWeight: '600' }}>
                        {isProfit ? '+' : ''}{format(profit)} ({isProfit ? '+' : ''}{returnsPercentage.toFixed(1)}%)
                    </ThemedText>
                </View>

                {showStaleBadge && (
                    <View style={styles.staleBadge}>
                        <ThemedText style={styles.staleText}>{staleDays}d old</ThemedText>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(96, 165, 250, 0.15)', // Light blue tint
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    titleContainer: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
        color: '#FFF',
    },
    rightStats: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    currentValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 4,
    },
    returnsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    staleBadge: {
        marginTop: 6,
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        borderColor: 'rgba(251, 191, 36, 0.3)',
        borderWidth: 1,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    staleText: {
        color: '#FBBF24',
        fontSize: 10,
        fontWeight: '600',
    }
});
