import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/common/ThemedText';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/hooks/useTheme';
import { useSIPStore } from '@/stores/sipStore';
import { router, useLocalSearchParams } from 'expo-router';
import { SIPPlan } from '@/types';

export default function EditSIPScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, getShadow } = useTheme();
    const { sips, updateSIP, removeSIP } = useSIPStore();

    const [name, setName] = useState('');
    const [fundName, setFundName] = useState('');
    const [amount, setAmount] = useState('');
    const [sipDay, setSipDay] = useState('');
    const [status, setStatus] = useState<'active' | 'paused' | 'completed'>('active');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sipToEdit, setSipToEdit] = useState<SIPPlan | null>(null);

    useEffect(() => {
        const foundSip = sips.find(s => s.id === id);
        if (foundSip) {
            setSipToEdit(foundSip);
            setName(foundSip.name);
            setFundName(foundSip.fundName);
            setAmount(foundSip.amount.toString());
            setSipDay(foundSip.sipDay.toString());
            setStatus(foundSip.status);
        }
    }, [id, sips]);

    const handleSave = async () => {
        if (!sipToEdit) return;

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

            let nextDueStr = sipToEdit.nextDueDate;
            if (day !== sipToEdit.sipDay) {
                const nextDue = new Date();
                nextDue.setDate(day);
                if (nextDue < new Date()) {
                    nextDue.setMonth(nextDue.getMonth() + 1);
                }
                nextDueStr = nextDue.toISOString();
            }

            const updatedSIP: SIPPlan = {
                ...sipToEdit,
                name,
                fundName,
                amount: sipAmount,
                sipDay: day,
                status,
                nextDueDate: nextDueStr,
                lastModified: now,
            };

            await updateSIP(updatedSIP);
            router.back();
        } catch (e) {
            Alert.alert('Error', 'Failed to update SIP');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete SIP Plan",
            "Are you sure you want to delete this SIP plan and all associated transaction history? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await removeSIP(id as string);
                            router.dismissAll();
                            router.push('/(tabs)/investments');
                        } catch (e) {
                            Alert.alert("Error", "Could not delete SIP");
                        }
                    }
                }
            ]
        );
    };

    if (!sipToEdit) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <Header title="Edit SIP" showBack />
                <View style={styles.centerContent}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Header title="Edit SIP" showBack />

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                <View style={[styles.card, getShadow(1), { backgroundColor: colors.card }]}>
                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>Plan Name</ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={name}
                            onChangeText={setName}
                            placeholderTextColor={colors.mutedForeground}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>Mutual Fund Name</ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={fundName}
                            onChangeText={setFundName}
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
                            placeholderTextColor={colors.mutedForeground}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>SIP Day (1-31)</ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={sipDay}
                            onChangeText={setSipDay}
                            keyboardType="numeric"
                            placeholderTextColor={colors.mutedForeground}
                            maxLength={2}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>Status</ThemedText>
                        <View style={styles.statusRow}>
                            {['active', 'paused', 'completed'].map((currStatus) => (
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
                        Delete SIP
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
    label: { fontSize: 14, marginBottom: 8, fontWeight: '500' },
    input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
    statusRow: { flexDirection: 'row', gap: 8 },
    statusBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderRadius: 8, alignItems: 'center' },
    saveButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
    saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    deleteButton: { paddingVertical: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 40 },
    deleteButtonText: { fontSize: 16, fontWeight: '600' }
});
