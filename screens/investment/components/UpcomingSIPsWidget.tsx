import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { useSIPStore } from '@/stores/sipStore';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { startOfMonth, endOfMonth, isWithinInterval, differenceInDays, parseISO, isValid } from 'date-fns';

export default function UpcomingSIPsWidget() {
    const { sips } = useSIPStore();
    const { format } = useCurrency();
    const { colors } = useTheme();

    const upcomingSIPs = useMemo(() => {
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);

        return sips
            .filter(sip => sip.status === 'active' && sip.nextDueDate)
            .map(sip => {
                const dueDate = parseISO(sip.nextDueDate);
                return {
                    ...sip,
                    parsedDate: dueDate,
                    isValidDate: isValid(dueDate)
                };
            })
            .filter(sip => sip.isValidDate && isWithinInterval(sip.parsedDate, { start, end }))
            .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
            .map(sip => ({
                ...sip,
                daysRemaining: differenceInDays(sip.parsedDate, now)
            }));
    }, [sips]);

    if (upcomingSIPs.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ThemedText style={styles.title}>Upcoming SIPs</ThemedText>
                <ThemedText style={[styles.subtitle, { color: colors.warning }]}>This month</ThemedText>
            </View>

            <View style={[styles.card, { backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }]}>
                {upcomingSIPs.map((sip, index) => {
                    const isUrgent = sip.daysRemaining >= 0 && sip.daysRemaining <= 3;
                    const isPassed = sip.daysRemaining < 0;

                    let daysText = `${sip.daysRemaining} days`;
                    if (sip.daysRemaining === 0) daysText = 'Today';
                    if (sip.daysRemaining === 1) daysText = 'Tomorrow';
                    if (isPassed) daysText = 'Processing...';

                    const dotColor = isUrgent ? colors.warning : isPassed ? colors.primary : colors.success;

                    return (
                        <View
                            key={sip.id}
                            style={[
                                styles.row,
                                index < upcomingSIPs.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' }
                            ]}
                        >
                            <View style={styles.leftContent}>
                                <View style={[styles.dot, { backgroundColor: dotColor }]} />
                                <View>
                                    <ThemedText style={styles.fundName} numberOfLines={1}>
                                        {sip.fundName.replace(' (erstwhile Value Fund)', '').replace(' Asset', '')}
                                    </ThemedText>
                                    <ThemedText style={[styles.dateText, { color: colors.subtitle }]}>
                                        {sip.parsedDate.toLocaleString('default', { month: 'short' })} {sip.parsedDate.getDate()} · {daysText}
                                    </ThemedText>
                                </View>
                            </View>

                            <View style={styles.rightContent}>
                                <ThemedText style={styles.amount}>{format(sip.amount)}</ThemedText>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 16,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '500',
    },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    leftContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 16,
    },
    fundName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 4,
    },
    dateText: {
        fontSize: 13,
    },
    rightContent: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
    }
});
