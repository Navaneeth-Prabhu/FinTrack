import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/common/ThemedText';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/hooks/useTheme';
import { useLoanStore } from '@/stores/loanStore';
import { router } from 'expo-router';
import { Loan } from '@/types';

export default function AddLoanScreen() {
    const { colors, getShadow } = useTheme();
    const { addLoan } = useLoanStore();

    const [lender, setLender] = useState('');
    const [principal, setPrincipal] = useState('');
    const [emiAmount, setEmiAmount] = useState('');
    const [emiDueDay, setEmiDueDay] = useState('');
    const [tenureMonths, setTenureMonths] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        if (!lender || !principal || !emiAmount || !emiDueDay || !tenureMonths) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        const principalAmt = parseFloat(principal);
        const emiAmt = parseFloat(emiAmount);
        const day = parseInt(emiDueDay, 10);
        const tenure = parseInt(tenureMonths, 10);

        if (isNaN(principalAmt) || principalAmt <= 0) {
            Alert.alert('Error', 'Principal amount must be greater than 0'); return;
        }
        if (isNaN(emiAmt) || emiAmt <= 0) {
            Alert.alert('Error', 'EMI amount must be greater than 0'); return;
        }
        if (isNaN(day) || day < 1 || day > 31) {
            Alert.alert('Error', 'EMI Due Day must be between 1 and 31'); return;
        }
        if (isNaN(tenure) || tenure <= 0) {
            Alert.alert('Error', 'Tenure must be greater than 0'); return;
        }

        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();

            const loan: Loan = {
                id: '', // Will be assigned by store/DB
                lender,
                loanType: 'personal', // Default to personal for Phase 2 MVP
                principal: principalAmt,
                outstanding: principalAmt, // Initially outstanding = principal
                emiAmount: emiAmt,
                emiDueDay: day,
                tenureMonths: tenure,
                startDate: now,
                status: 'active',
                source: 'manual',
                createdAt: now,
                lastModified: now,
            };

            await addLoan(loan);
            router.back();
        } catch (e) {
            Alert.alert('Error', 'Failed to save Loan');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Header title="Add Loan" showBack />

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                <View style={[styles.card, getShadow(1), { backgroundColor: colors.card }]}>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>Lender Name</ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={lender}
                            onChangeText={setLender}
                            placeholder="e.g. HDFC Bank"
                            placeholderTextColor={colors.mutedForeground}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>Total Loan Amount</ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={principal}
                            onChangeText={setPrincipal}
                            keyboardType="numeric"
                            placeholder="500000"
                            placeholderTextColor={colors.mutedForeground}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>Monthly EMI</ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={emiAmount}
                            onChangeText={setEmiAmount}
                            keyboardType="numeric"
                            placeholder="15000"
                            placeholderTextColor={colors.mutedForeground}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                            <ThemedText style={[styles.label, { color: colors.subtitle }]}>EMI Day (1-31)</ThemedText>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                                value={emiDueDay}
                                onChangeText={setEmiDueDay}
                                keyboardType="numeric"
                                placeholder="5"
                                placeholderTextColor={colors.mutedForeground}
                                maxLength={2}
                            />
                        </View>

                        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                            <ThemedText style={[styles.label, { color: colors.subtitle }]}>Tenure (Months)</ThemedText>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                                value={tenureMonths}
                                onChangeText={setTenureMonths}
                                keyboardType="numeric"
                                placeholder="60"
                                placeholderTextColor={colors.mutedForeground}
                                maxLength={3}
                            />
                        </View>
                    </View>

                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }, isSubmitting && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={isSubmitting}
                >
                    <ThemedText style={styles.saveButtonText}>
                        {isSubmitting ? 'Saving...' : 'Save Loan'}
                    </ThemedText>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    card: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    formGroup: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
    },
    saveButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 40,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
