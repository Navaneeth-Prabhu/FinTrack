import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency } from '@/hooks/useCurrency';
import { useLoanStore } from '@/stores/loanStore';
import { differenceInDays, setDate, addMonths, isBefore, startOfDay, format as formatDate } from 'date-fns';

export default function LoanSummaryCard() {
    const { loans, getTotalOutstanding, getTotalEMI } = useLoanStore();
    const { colors, isDark } = useTheme();
    const { format } = useCurrency();

    const cardBg = isDark ? '#1A1A1A' : colors.card;
    const cardBorder = isDark ? 'rgba(255,255,255,0.05)' : colors.border;
    const statBg = isDark ? '#222' : colors.background;
    const statBorder = isDark ? 'rgba(255,255,255,0.05)' : colors.border;

    const activeLoansCount = loans.filter(l => l.status === 'active').length;
    const outstanding = getTotalOutstanding();
    const monthlyEMI = getTotalEMI();

    const nextDueStr = useMemo(() => {
        if (loans.length === 0 || activeLoansCount === 0) return '-';

        const today = startOfDay(new Date());

        let closestDate: Date | null = null;
        let closestDays = Infinity;

        loans.forEach(loan => {
            if (loan.status !== 'active') return;

            let emiDate = setDate(today, loan.emiDueDay);
            if (isBefore(emiDate, today)) {
                emiDate = addMonths(emiDate, 1);
            }

            const diff = differenceInDays(emiDate, today);
            if (diff < closestDays) {
                closestDays = diff;
                closestDate = emiDate;
            }
        });

        if (closestDate) {
            return formatDate(closestDate, 'MMM d');
        }
        return '-';
    }, [loans]);

    return (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1 }]}>
            <View style={styles.mainContent}>
                <ThemedText style={[styles.title, { color: colors.subtitle }]}>TOTAL OUTSTANDING</ThemedText>
                <ThemedText style={styles.totalAmount}>
                    {format(outstanding)}
                </ThemedText>
            </View>

            <View style={styles.statsRow}>
                <View style={[styles.statBox, { backgroundColor: statBg, borderColor: statBorder, borderWidth: 1 }]}>
                    <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>
                        MONTHLY EMI
                    </ThemedText>
                    <ThemedText style={[styles.statValue, { color: '#FF4D4D' }]}>
                        {format(monthlyEMI)}
                    </ThemedText>
                </View>

                <View style={[styles.statBox, { backgroundColor: statBg, borderColor: statBorder, borderWidth: 1 }]}>
                    <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>
                        LOANS ACTIVE
                    </ThemedText>
                    <ThemedText style={[styles.statValue, { color: colors.text }]}>
                        {activeLoansCount}
                    </ThemedText>
                </View>

                <View style={[styles.statBox, { backgroundColor: statBg, borderColor: statBorder, borderWidth: 1 }]}>
                    <ThemedText style={[styles.statLabel, { color: colors.subtitle }]}>
                        NEXT DUE
                    </ThemedText>
                    <ThemedText style={[styles.statValue, { color: colors.warning }]}>
                        {nextDueStr}
                    </ThemedText>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 20,
        borderRadius: 20,
        marginBottom: 24,
    },
    mainContent: {
        marginBottom: 20,
    },
    title: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    totalAmount: {
        fontSize: 36,
        lineHeight: 48,
        fontWeight: '400',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statBox: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        justifyContent: 'flex-start',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    statValue: {
        fontWeight: '600',
        fontSize: 15,
    }
});
