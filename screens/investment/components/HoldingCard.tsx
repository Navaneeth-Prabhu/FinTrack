import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { Holding } from '@/types';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays, parseISO } from 'date-fns';
import { calculateCAGR } from '@/utils/investmentCalculations';
import { useHoldingXIRR } from '@/hooks/useHoldingXIRR';
import PriceSparkline from '@/components/investments/PriceSparkline';

interface HoldingCardProps {
    holding: Holding;
    onUpdatePrice: (holding: Holding) => void;
    onPress?: (holding: Holding) => void;
}

export default function HoldingCard({ holding, onUpdatePrice, onPress }: HoldingCardProps) {
    const { colors, isDark } = useTheme();
    const { format } = useCurrency();

    const cardBg = isDark ? '#1A1A1A' : colors.card;
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : colors.border;

    const isFixedIncome = ['fd', 'bond', 'ppf', 'nps'].includes(holding.type);

    const invested = isFixedIncome ? holding.avg_buy_price : holding.quantity * holding.avg_buy_price;
    const currentPrice = holding.current_price || holding.avg_buy_price;
    const currentValue = isFixedIncome ? currentPrice : holding.quantity * currentPrice;

    const profit = currentValue - invested;
    const isProfit = profit >= 0;
    const returnsPercentage = invested > 0 ? (profit / invested) * 100 : 0;
    const returnColor = isProfit ? colors.success : '#FF4D4D';

    // CAGR — annualised return since buy_date (null if < 30 days or no buy date)
    const cagr = (() => {
        if (!holding.buy_date || invested <= 0 || currentValue <= 0) return null;
        const daysSinceBuy = differenceInDays(new Date(), parseISO(holding.buy_date));
        if (daysSinceBuy < 30) return null;
        const v = calculateCAGR(currentValue, invested, holding.buy_date);
        return isFinite(v) ? v : null;
    })();

    // XIRR + price history — fetched once per card
    const { xirr, priceHistory } = useHoldingXIRR(holding.id, currentValue);

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
        <Pressable
            style={({ pressed }) => [
                styles.card,
                { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 },
                pressed && { opacity: 0.8 }
            ]}
            onPress={() => onPress ? onPress(holding) : onUpdatePrice(holding)}
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

                {/* Return rate badges — XIRR preferred, CAGR as fallback */}
                <View style={styles.badgeRow}>
                    {xirr !== null && (
                        <View style={[styles.badge, { backgroundColor: isProfit ? 'rgba(76,217,100,0.12)' : 'rgba(255,77,77,0.12)' }]}>
                            <ThemedText style={[styles.badgeText, { color: isProfit ? colors.success : '#FF4D4D' }]}>
                                XIRR {xirr >= 0 ? '+' : ''}{xirr.toFixed(1)}%
                            </ThemedText>
                        </View>
                    )}
                    {xirr === null && cagr !== null && (
                        <View style={[styles.badge, { backgroundColor: isProfit ? 'rgba(76,217,100,0.12)' : 'rgba(255,77,77,0.12)' }]}>
                            <ThemedText style={[styles.badgeText, { color: isProfit ? colors.success : '#FF4D4D' }]}>
                                CAGR {cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}% p.a.
                            </ThemedText>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.rightStats}>
                {/* Sparkline chart — shows price history if available */}
                {priceHistory.length >= 2 && (
                    <View style={styles.sparklineContainer}>
                        <PriceSparkline
                            snapshots={priceHistory}
                            width={72}
                            height={28}
                            showGradient
                        />
                    </View>
                )}

                <ThemedText style={styles.currentValue}>{format(currentValue)}</ThemedText>

                <View style={styles.returnsRow}>
                    <ThemedText style={{ color: returnColor, fontSize: 12, fontWeight: '600' }}>
                        {isProfit ? '+' : ''}{format(profit)} ({isProfit ? '+' : ''}{returnsPercentage.toFixed(1)}%)
                    </ThemedText>
                </View>

                {showStaleBadge && (
                    <View style={styles.staleBadge}>
                        <ThemedText style={styles.staleText}>{staleDays}d old</ThemedText>
                    </View>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(96, 165, 250, 0.15)',
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
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 6,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    rightStats: {
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
    },
    sparklineContainer: {
        marginBottom: 6,
    },
    currentValue: {
        fontSize: 15,
        fontWeight: '700',
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
