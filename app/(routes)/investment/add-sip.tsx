import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/common/ThemedText';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/hooks/useTheme';
import { useSIPStore } from '@/stores/sipStore';
import { router } from 'expo-router';
import { SIPPlan } from '@/types';

export default function AddSIPScreen() {
    const { colors, getShadow } = useTheme();
    const { addSIP } = useSIPStore();

    const [name, setName] = useState('');
    const [fundName, setFundName] = useState('');
    const [amount, setAmount] = useState('');
    const [sipDay, setSipDay] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        if (!name || !fundName || !amount || !sipDay) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        const sipAmount = parseFloat(amount);
        const day = parseInt(sipDay, 10);

        if (isNaN(sipAmount) || sipAmount <= 0) {
            Alert.alert('Error', 'Amount must be greater than 0');
            return;
        }

        if (isNaN(day) || day < 1 || day > 31) {
            Alert.alert('Error', 'SIP Day must be between 1 and 31');
            return;
        }

        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();

            // Calculate next due date
            const nextDue = new Date();
            nextDue.setDate(day);
            if (nextDue < new Date()) {
                nextDue.setMonth(nextDue.getMonth() + 1);
            }

            const sip: SIPPlan = {
                id: '', // Will be assigned by store/DB
                name,
                fundName,
                amount: sipAmount,
                frequency: 'monthly', // Default to monthly for Phase 2 MVP
                startDate: now,
                nextDueDate: nextDue.toISOString(),
                sipDay: day,
                totalInvested: 0,
                status: 'active',
                categoryId: 'investment-default', // We assume an investment category exists or we can hardcode for now
                createdAt: now,
                lastModified: now,
            };

            await addSIP(sip);
            router.back();
        } catch (e) {
            Alert.alert('Error', 'Failed to save SIP');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Header title="Add SIP" showBack />

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                <View style={[styles.card, getShadow(1), { backgroundColor: colors.card }]}>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>Plan Name (e.g. Retirement)</ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Retirement Fund"
                            placeholderTextColor={colors.mutedForeground}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>Mutual Fund Name</ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={fundName}
                            onChangeText={setFundName}
                            placeholder="e.g. Parag Parikh Flexi Cap"
                            placeholderTextColor={colors.mutedForeground}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>Monthly Amount</ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            placeholder="5000"
                            placeholderTextColor={colors.mutedForeground}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>Default SIP Day (1-31)</ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={sipDay}
                            onChangeText={setSipDay}
                            keyboardType="numeric"
                            placeholder="5"
                            placeholderTextColor={colors.mutedForeground}
                            maxLength={2}
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }, isSubmitting && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={isSubmitting}
                >
                    <ThemedText style={styles.saveButtonText}>
                        {isSubmitting ? 'Saving...' : 'Save SIP'}
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
