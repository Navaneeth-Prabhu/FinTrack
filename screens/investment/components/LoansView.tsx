import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { useLoanStore } from '@/stores/loanStore';
import * as Progress from 'react-native-progress';

export default function LoansView() {
    const { loans, fetchLoans, isLoading, getTotalOutstanding } = useLoanStore();
    const { format } = useCurrency();
    const { colors, getShadow } = useTheme();

    useEffect(() => {
        fetchLoans();
    }, [fetchLoans]);

    if (isLoading && loans.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ThemedText>Loading Loans...</ThemedText>
            </View>
        );
    }

    if (loans.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ThemedText style={[styles.emptyText, { color: colors.subtitle }]}>
                    No active loans found. Tap 'Add Loan' to start tracking your EMIs.
                </ThemedText>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={[styles.summaryCard, getShadow(2), { backgroundColor: colors.card }]}>
                <ThemedText style={{ color: colors.subtitle }}>Total Outstanding</ThemedText>
                <ThemedText variant="h1" style={styles.totalAmount}>
                    {format(getTotalOutstanding())}
                </ThemedText>
            </View>

            <ThemedText variant="h3" style={styles.sectionTitle}>Active Loans</ThemedText>

            {loans.map((loan) => {
                const repaid = loan.principal - loan.outstanding;
                const progress = Math.min(Math.max(repaid / loan.principal, 0), 1) || 0;

                return (
                    <View
                        key={loan.id}
                        style={[styles.loanCard, getShadow(1), { backgroundColor: colors.card }]}
                    >
                        <View style={styles.cardHeader}>
                            <View>
                                <ThemedText style={styles.lenderName}>{loan.lender}</ThemedText>
                                <ThemedText style={[styles.loanType, { color: colors.subtitle }]}>
                                    {loan.loanType.charAt(0).toUpperCase() + loan.loanType.slice(1)} Loan
                                </ThemedText>
                            </View>
                            <ThemedText style={[styles.pill, { backgroundColor: 'rgba(242, 125, 125, 0.15)', color: colors.expense }]}>
                                {format(loan.emiAmount)} / mo
                            </ThemedText>
                        </View>

                        <View style={styles.cardBody}>
                            <View style={styles.progressHeader}>
                                <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>Outstanding</ThemedText>
                                <ThemedText style={styles.statValue}>{format(loan.outstanding)}</ThemedText>
                            </View>

                            <Progress.Bar
                                progress={progress}
                                width={null}
                                height={8}
                                color={colors.primary}
                                unfilledColor={colors.muted}
                                borderWidth={0}
                                style={styles.progressBar}
                            />

                            <View style={styles.progressFooter}>
                                <ThemedText style={{ color: colors.subtitle, fontSize: 12 }}>
                                    {Math.round(progress * 100)}% Repaid
                                </ThemedText>
                                <ThemedText style={{ color: colors.subtitle, fontSize: 12 }}>
                                    Total: {format(loan.principal)}
                                </ThemedText>
                            </View>
                        </View>

                        <View style={[styles.footer, { borderTopColor: colors.border }]}>
                            <ThemedText style={{ color: colors.subtitle, fontSize: 13 }}>
                                EMI Date: {loan.emiDueDay} of every month
                            </ThemedText>
                        </View>
                    </View>
                );
            })}
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
        color: '#F27D7D', // Expense color
    },
    sectionTitle: {
        marginBottom: 16,
    },
    loanCard: {
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
    lenderName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    loanType: {
        fontSize: 14,
    },
    pill: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: '600',
    },
    cardBody: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 13,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '600',
    },
    progressBar: {
        marginBottom: 8,
    },
    progressFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.02)',
    }
});
