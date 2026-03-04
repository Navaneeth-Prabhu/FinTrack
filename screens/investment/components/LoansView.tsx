import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { useCurrency } from '@/hooks/useCurrency';
import { useTheme } from '@/hooks/useTheme';
import { useLoanStore } from '@/stores/loanStore';
import * as Progress from 'react-native-progress';
import LoanSummaryCard from './LoanSummaryCard';
import EMICountdown from './EMICountdown';
import { format as formatDate, setDate, isBefore, addMonths } from 'date-fns';

import { useRouter } from 'expo-router';

export default function LoansView() {
    const router = useRouter();
    const { loans, fetchLoans, isLoading } = useLoanStore();
    const { format } = useCurrency();
    const { colors } = useTheme();

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
            <LoanSummaryCard />

            <ThemedText style={[styles.sectionTitle, { color: colors.subtitle }]}>
                ACTIVE LOANS
            </ThemedText>

            {loans.map((loan) => {
                const repaid = loan.principal - loan.outstanding;
                const progress = Math.min(Math.max(repaid / loan.principal, 0), 1) || 0;

                // Calculate tenure strings
                // Assuming we don't track start date exactly for remaining tenure, we'll rough it:
                // Actually, let's just show elapsed months vs tenureMonths or basic text
                const tenureLeftStr = `${Math.floor(loan.tenureMonths / 12)}y ${loan.tenureMonths % 12}m`;

                // Calculate next EMI Date
                const today = new Date();
                let emiDate = setDate(today, loan.emiDueDay);
                if (isBefore(emiDate, today)) {
                    emiDate = addMonths(emiDate, 1);
                }
                const formattedEmiDate = formatDate(emiDate, 'MMM d, yyyy');

                const typeColor = loan.loanType === 'home' ? '#3B82F6' : loan.loanType === 'personal' ? '#A855F7' : colors.primary;

                return (
                    <TouchableOpacity
                        key={loan.id}
                        style={[styles.loanCard, { backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }]}
                        onPress={() => router.push(`/investment/loan/${loan.id}`)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.cardHeader}>
                            <View style={{ flex: 1, marginRight: 16 }}>
                                <ThemedText style={styles.lenderName}>{loan.lender}</ThemedText>
                                <ThemedText style={[styles.loanNotes, { color: colors.subtitle }]} numberOfLines={1}>
                                    {loan.notes || 'No notes available'}
                                </ThemedText>
                            </View>

                            <View style={[styles.typePill, { borderColor: `${typeColor}40`, backgroundColor: `${typeColor}15` }]}>
                                <ThemedText style={{ color: typeColor, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                                    {loan.loanType}
                                </ThemedText>
                            </View>
                        </View>

                        <View style={styles.progressContainer}>
                            <View style={styles.progressHeader}>
                                <ThemedText style={[styles.progressText, { color: colors.subtitle }]}>
                                    Paid <ThemedText style={{ color: '#FFF', fontSize: 12 }}>{format(repaid)}</ThemedText>
                                </ThemedText>
                                <ThemedText style={[styles.progressText, { color: colors.subtitle }]}>
                                    Remaining {format(loan.outstanding)}
                                </ThemedText>
                            </View>

                            <Progress.Bar
                                progress={progress}
                                width={null}
                                height={6}
                                color="#2DD4BF"
                                unfilledColor="rgba(255,255,255,0.1)"
                                borderWidth={0}
                                style={styles.progressBar}
                            />
                        </View>

                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>Principal</ThemedText>
                                <ThemedText style={styles.statValue}>{format(loan.principal)}</ThemedText>
                            </View>
                            <View style={styles.statBox}>
                                <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>EMI</ThemedText>
                                <ThemedText style={[styles.statValue, { color: '#FF4D4D' }]}>{format(loan.emiAmount)}</ThemedText>
                            </View>
                            <View style={styles.statBox}>
                                <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>Tenure</ThemedText>
                                <ThemedText style={styles.statValue}>{tenureLeftStr}</ThemedText>
                            </View>
                        </View>

                        <View style={[styles.footer, { borderTopColor: 'rgba(255,255,255,0.05)' }]}>
                            <ThemedText style={{ color: colors.subtitle, fontSize: 13 }}>
                                Next EMI: <ThemedText style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>{formattedEmiDate}</ThemedText>
                            </ThemedText>
                            <EMICountdown emiDueDay={loan.emiDueDay} />
                        </View>
                    </TouchableOpacity>
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
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 16,
    },
    loanCard: {
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardHeader: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    lenderName: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    loanNotes: {
        fontSize: 13,
    },
    typePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    progressContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    progressText: {
        fontSize: 12,
    },
    progressBar: {
        borderRadius: 3,
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 16,
    },
    statBox: {
        flex: 1,
    },
    statLabel: {
        fontSize: 11,
        marginBottom: 4,
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
    }
});
