import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { useSIPStore } from '@/stores/sipStore';

export default function SIPsView() {
    const { sips, fetchSIPs, isLoading, getTotalInvested } = useSIPStore();
    const { format } = useCurrency();
    const { colors, getShadow } = useTheme();

    useEffect(() => {
        fetchSIPs();
    }, [fetchSIPs]);

    if (isLoading && sips.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ThemedText>Loading SIPs...</ThemedText>
            </View>
        );
    }

    if (sips.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ThemedText style={[styles.emptyText, { color: colors.subtitle }]}>
                    No active SIPs found. Tap 'Add SIP' to track your mutual funds or recurring investments.
                </ThemedText>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={[styles.summaryCard, getShadow(2), { backgroundColor: colors.card }]}>
                <ThemedText style={{ color: colors.subtitle }}>Total SIP Value</ThemedText>
                <ThemedText variant="h1" style={styles.totalAmount}>
                    {format(getTotalInvested())}
                </ThemedText>
            </View>

            <ThemedText variant="h3" style={styles.sectionTitle}>Active SIPs</ThemedText>

            {sips.map((sip) => (
                <View
                    key={sip.id}
                    style={[styles.sipCard, getShadow(1), { backgroundColor: colors.card }]}
                >
                    <View style={styles.cardHeader}>
                        <View>
                            <ThemedText style={styles.planName}>{sip.name}</ThemedText>
                            <ThemedText style={[styles.fundName, { color: colors.subtitle }]}>{sip.fundName}</ThemedText>
                        </View>
                        <ThemedText style={[styles.pill, { backgroundColor: colors.accent, color: colors.primary }]}>
                            {sip.frequency}
                        </ThemedText>
                    </View>

                    <View style={styles.cardBody}>
                        <View style={styles.statBox}>
                            <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>Installment</ThemedText>
                            <ThemedText style={styles.statValue}>{format(sip.amount)}</ThemedText>
                        </View>
                        <View style={styles.statBox}>
                            <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>Invested</ThemedText>
                            <ThemedText style={styles.statValue}>{format(sip.totalInvested)}</ThemedText>
                        </View>
                    </View>

                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <ThemedText style={{ color: colors.subtitle, fontSize: 13 }}>
                            Next due: {new Date(sip.nextDueDate).toLocaleDateString()}
                        </ThemedText>
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        lineHeight: 24,
    },
    summaryCard: {
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    totalAmount: {
        marginTop: 8,
        color: '#8662e6', // Primary brand color
    },
    sectionTitle: {
        marginBottom: 16,
    },
    sipCard: {
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardHeader: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    planName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    fundName: {
        fontSize: 14,
    },
    pill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    cardBody: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    statBox: {
        flex: 1,
    },
    statLabel: {
        fontSize: 13,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.02)',
    }
});
