import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { useTransactionStore } from '@/stores/transactionStore';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';

export default function HoldingsView() {
    const { transactions } = useTransactionStore();
    const { format } = useCurrency();
    const { colors, getShadow } = useTheme();

    // Aggregate holdings from 'investment' type transactions
    const holdings = useMemo(() => {
        const map = new Map<string, number>();

        transactions
            .filter(t => t.type === 'investment' && t.category?.name !== 'Loan Repayment')
            .forEach(t => {
                // Group by payee/merchant
                const provider = t.paidTo || t.paidBy || 'Other';
                const current = map.get(provider) || 0;
                map.set(provider, current + t.amount);
            });

        const items = Array.from(map.entries()).map(([provider, amount]) => ({
            provider,
            amount
        }));

        return items.sort((a, b) => b.amount - a.amount);
    }, [transactions]);

    const totalInvested = holdings.reduce((sum, h) => sum + h.amount, 0);

    if (holdings.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <ThemedText style={[styles.emptyText, { color: colors.subtitle }]}>
                    No investment holdings found. Add an investment transaction to see it here.
                </ThemedText>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={[styles.summaryCard, getShadow(2), { backgroundColor: colors.card }]}>
                <ThemedText style={{ color: colors.subtitle }}>Total Holdings</ThemedText>
                <ThemedText variant="h1" style={styles.totalAmount}>
                    {format(totalInvested)}
                </ThemedText>
            </View>

            <ThemedText variant="h3" style={styles.sectionTitle}>Providers</ThemedText>

            {holdings.map((holding, index) => (
                <View
                    key={`${holding.provider}-${index}`}
                    style={[styles.holdingCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                >
                    <View style={styles.holdingInfo}>
                        <View style={[styles.iconPlaceholder, { backgroundColor: colors.accent }]} />
                        <ThemedText style={styles.providerName}>{holding.provider}</ThemedText>
                    </View>
                    <ThemedText style={styles.holdingAmount}>{format(holding.amount)}</ThemedText>
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
    emptyContainer: {
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
        color: '#4CD791', // Match income/success green roughly
    },
    sectionTitle: {
        marginBottom: 16,
    },
    holdingCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    holdingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    providerName: {
        fontSize: 16,
        fontWeight: '500',
    },
    holdingAmount: {
        fontSize: 16,
        fontWeight: '600',
    }
});
