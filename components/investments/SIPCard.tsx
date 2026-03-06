import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { SIPPlan } from '@/types';
import { differenceInDays, parseISO, format as formatDate } from 'date-fns';

interface SIPCardProps {
    sip: SIPPlan;
    onPress?: (sip: SIPPlan) => void;
}

const SIPCard = memo(({ sip, onPress }: SIPCardProps) => {
    const { format } = useCurrency();
    const { colors, isDark } = useTheme();

    const currentValue = (sip.nav && sip.units && sip.nav > 0 && sip.units > 0)
        ? sip.nav * sip.units
        : sip.totalInvested;

    const returns = currentValue - sip.totalInvested;
    const returnsPercentage = sip.totalInvested > 0 ? (returns / sip.totalInvested) * 100 : 0;

    const isPositive = returns >= 0;
    const returnColor = isPositive ? colors.success : colors.error;

    // Calculate stale days
    let daysAgoText = '';
    if (sip.priceUpdatedAt) {
        const diff = differenceInDays(new Date(), parseISO(sip.priceUpdatedAt));
        if (diff === 0) {
            daysAgoText = 'Today';
        } else {
            daysAgoText = `${diff}d ago`;
        }
    } else {
        daysAgoText = 'Needs update';
    }

    const cardBg = isDark ? '#1A1A1A' : colors.card;
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : colors.border;
    const statBg = isDark ? '#222' : colors.background;
    const statBorder = isDark ? 'rgba(255,255,255,0.06)' : colors.border;
    const footerBorder = isDark ? 'rgba(255,255,255,0.06)' : colors.border;

    return (
        <Pressable
            onPress={() => onPress?.(sip)}
            style={({ pressed }) => [
                styles.card,
                { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 },
                pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }
            ]}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <ThemedText style={[styles.fundName, { color: colors.text }]} numberOfLines={1}>{sip.fundName}</ThemedText>
                    {sip.name !== sip.fundName && (
                        <ThemedText style={[styles.customName, { color: colors.subtitle }]} numberOfLines={1}>{sip.name}</ThemedText>
                    )}
                    {/* Folio Number */}
                    {sip.folioNumber ? (
                        <ThemedText style={[styles.folioText, { color: colors.subtitle }]}>
                            Folio: {sip.folioNumber}
                        </ThemedText>
                    ) : null}
                </View>

                <View style={styles.badgesContainer}>
                    <View style={[styles.badge, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)', borderWidth: 1 }]}>
                        <ThemedText style={[styles.badgeText, { color: '#60A5FA' }]}>
                            {sip.frequency === 'monthly' ? 'Monthly' : sip.frequency}
                        </ThemedText>
                    </View>
                    <View style={[
                        styles.badge,
                        {
                            backgroundColor: sip.status === 'active' ? 'rgba(76, 217, 100, 0.15)' : 'rgba(255, 149, 0, 0.15)',
                            borderColor: sip.status === 'active' ? 'rgba(76, 217, 100, 0.3)' : 'rgba(255, 149, 0, 0.3)',
                            borderWidth: 1
                        }
                    ]}>
                        <ThemedText style={[
                            styles.badgeText,
                            { color: sip.status === 'active' ? '#4CD964' : '#FF9500' }
                        ]}>
                            {sip.status === 'active' ? 'Active' : 'Paused'}
                        </ThemedText>
                    </View>
                </View>
            </View>

            {/* Grid Stats */}
            <View style={styles.grid}>
                {/* Row 1 */}
                <View style={styles.statCell}>
                    <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>Installment</ThemedText>
                    <ThemedText style={[styles.statValue, { color: colors.text }]}>{format(sip.amount)}</ThemedText>
                </View>
                <View style={styles.statCell}>
                    <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>Invested</ThemedText>
                    <ThemedText style={[styles.statValue, { color: colors.text }]}>{format(sip.totalInvested)}</ThemedText>
                </View>
                <View style={styles.statCell}>
                    <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>Curr. Value</ThemedText>
                    <ThemedText style={[styles.statValue, { color: returnColor }]}>{format(currentValue)}</ThemedText>
                </View>

                {/* Row 2 */}
                <View style={[styles.statCell, styles.row2]}>
                    <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>Units</ThemedText>
                    <ThemedText style={[styles.statValue, { color: colors.text }]}>{sip.units ? sip.units.toFixed(2) : '--'}</ThemedText>
                </View>
                <View style={[styles.statCell, styles.row2]}>
                    <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>Avg NAV</ThemedText>
                    <ThemedText style={[styles.statValue, { color: colors.text }]}>{sip.nav ? format(sip.nav) : '--'}</ThemedText>
                </View>
                <View style={[styles.statCell, styles.row2]}>
                    <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>Returns</ThemedText>
                    <ThemedText style={[styles.statValue, { color: returnColor }]}>
                        {isPositive ? '+' : ''}{returnsPercentage.toFixed(1)}%
                    </ThemedText>
                </View>
            </View>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: footerBorder }]}>
                {sip.status === 'active' ? (
                    <ThemedText style={styles.footerText}>
                        <ThemedText style={{ color: colors.subtitle, fontSize: 13 }}>Next due: </ThemedText>
                        <ThemedText style={{ color: colors.warning, fontWeight: '700', fontSize: 13 }}>
                            {formatDate(parseISO(sip.nextDueDate), 'MMM d, yyyy')}
                        </ThemedText>
                    </ThemedText>
                ) : (
                    <ThemedText style={[styles.footerText, { color: colors.warning }]}>
                        SIP paused — tap to resume
                    </ThemedText>
                )}

                <ThemedText style={[styles.footerText, { color: colors.subtitle }]}>
                    NAV {sip.nav ? format(sip.nav) : '--'} · {daysAgoText}
                </ThemedText>
            </View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
    },
    header: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    titleContainer: {
        flex: 1,
        marginRight: 16,
    },
    fundName: {
        fontSize: 18,
        fontWeight: '700',
    },
    customName: {
        fontSize: 13,
        marginTop: 4,
    },
    folioText: {
        fontSize: 11,
        marginTop: 4,
        fontFamily: 'monospace',
    },
    badgesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        paddingBottom: 20,
        rowGap: 16,
    },
    statCell: {
        width: '33.33%',
    },
    row2: {
        marginTop: 4,
    },
    statLabel: {
        fontSize: 11,
        marginBottom: 6,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 13,
    }
});

export default SIPCard;
