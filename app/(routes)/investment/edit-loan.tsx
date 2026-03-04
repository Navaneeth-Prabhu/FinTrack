import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/common/ThemedText';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/hooks/useTheme';
import { useLoanStore } from '@/stores/loanStore';
import { router, useLocalSearchParams } from 'expo-router';
import { Loan } from '@/types';

export default function EditLoanScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, getShadow } = useTheme();
    const { loans, updateLoan, removeLoan } = useLoanStore();

    const [loanToEdit, setLoanToEdit] = useState<Loan | null>(null);
    const [lender, setLender] = useState('');
    const [principal, setPrincipal] = useState('');
    const [emiAmount, setEmiAmount] = useState('');
    const [emiDueDay, setEmiDueDay] = useState('');
    const [tenureMonths, setTenureMonths] = useState('');
    const [status, setStatus] = useState<'active' | 'closed' | 'defaulted'>('active');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const found = loans.find(l => l.id === id);
        if (found) {
            setLoanToEdit(found);
            setLender(found.lender);
            setPrincipal(found.principal.toString());
            setEmiAmount(found.emiAmount.toString());
            setEmiDueDay(found.emiDueDay.toString());
            setTenureMonths(found.tenureMonths.toString());
            setStatus(found.status);
        }
    }, [id, loans]);

    const handleSave = async () => {
        if (!loanToEdit) return;

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

            // Calculate new outstanding if principal changed manually.
            // Normally outstanding is managed by payments, but allowing manual edits here.
            const principalDiff = principalAmt - loanToEdit.principal;
            const newOutstanding = Math.max(0, loanToEdit.outstanding + principalDiff);

            const updatedLoan: Loan = {
                ...loanToEdit,
                lender,
                principal: principalAmt,
                outstanding: newOutstanding,
                emiAmount: emiAmt,
                emiDueDay: day,
                tenureMonths: tenure,
                status,
                lastModified: now,
            };

            await updateLoan(updatedLoan);
            router.back();
        } catch (e) {
            Alert.alert('Error', 'Failed to update Loan');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Loan",
            "Are you sure you want to delete this loan and all associated payment history? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await removeLoan(id as string);
                            router.dismissAll();
                            router.push('/(tabs)/investments');
                        } catch (e) {
                            Alert.alert("Error", "Could not delete loan");
                        }
                    }
                }
            ]
        );
    };

    if (!loanToEdit) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <Header title="Edit Loan" showBack />
                <View style={styles.centerContent}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Header title="Edit Loan" showBack />

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                <View style={[styles.card, getShadow(1), { backgroundColor: colors.card }]}>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>Lender Name</ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={lender}
                            onChangeText={setLender}
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
                                maxLength={2}
                                placeholderTextColor={colors.mutedForeground}
                            />
                        </View>

                        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                            <ThemedText style={[styles.label, { color: colors.subtitle }]}>Tenure (Months)</ThemedText>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                                value={tenureMonths}
                                onChangeText={setTenureMonths}
                                keyboardType="numeric"
                                maxLength={3}
                                placeholderTextColor={colors.mutedForeground}
                            />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>Status</ThemedText>
                        <View style={styles.statusRow}>
                            {['active', 'closed', 'defaulted'].map((currStatus) => (
                                <TouchableOpacity
                                    key={currStatus}
                                    style={[
                                        styles.statusBtn,
                                        { borderColor: colors.border },
                                        status === currStatus && { backgroundColor: colors.primary, borderColor: colors.primary }
                                    ]}
                                    onPress={() => setStatus(currStatus as any)}
                                >
                                    <ThemedText style={[
                                        { textTransform: 'capitalize', fontSize: 13, fontWeight: '500' },
                                        status === currStatus ? { color: '#FFF' } : { color: colors.text }
                                    ]}>
                                        {currStatus}
                                    </ThemedText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }, isSubmitting && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={isSubmitting}
                >
                    <ThemedText style={styles.saveButtonText}>
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: colors.error }]}
                    onPress={handleDelete}
                    disabled={isSubmitting}
                >
                    <ThemedText style={[styles.deleteButtonText, { color: colors.error }]}>
                        Delete Loan
                    </ThemedText>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16 },
    centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    card: { padding: 16, borderRadius: 16, marginBottom: 24 },
    formGroup: { marginBottom: 16 },
    row: { flexDirection: 'row' },
    label: { fontSize: 14, marginBottom: 8, fontWeight: '500' },
    input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
    statusRow: { flexDirection: 'row', gap: 8 },
    statusBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderRadius: 8, alignItems: 'center' },
    saveButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
    saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    deleteButton: { paddingVertical: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 40 },
    deleteButtonText: { fontSize: 16, fontWeight: '600' }
});
