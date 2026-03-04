import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/common/ThemedText';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/hooks/useTheme';
import { router, useLocalSearchParams } from 'expo-router';
import { useHoldingsStore } from '@/stores/holdingsStore';
import { Holding } from '@/types';

export default function EditHoldingScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, getShadow } = useTheme();
    const { holdings, updateHolding, removeHolding } = useHoldingsStore();

    const [holdingToEdit, setHoldingToEdit] = useState<Holding | null>(null);
    const [name, setName] = useState('');
    const [ticker, setTicker] = useState('');
    const [quantity, setQuantity] = useState('');
    const [avgBuyPrice, setAvgBuyPrice] = useState('');
    const [buyDate, setBuyDate] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const found = holdings.find(h => h.id === id);
        if (found) {
            setHoldingToEdit(found);
            setName(found.name);
            setTicker(found.ticker || '');
            setQuantity(found.quantity.toString());
            setAvgBuyPrice(found.avg_buy_price.toString());
            setBuyDate(found.buy_date.split('T')[0]);
        }
    }, [id, holdings]);

    const isFixedIncome = ['fd', 'bond', 'ppf', 'nps'].includes(holdingToEdit?.type || '');

    const handleSave = async () => {
        if (!holdingToEdit) return;

        if (!name || !avgBuyPrice || !buyDate) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        const parsedQuantity = isFixedIncome ? 1 : parseFloat(quantity);
        const parsedAvgPrice = parseFloat(avgBuyPrice);

        if (isNaN(parsedQuantity) || parsedQuantity <= 0 || isNaN(parsedAvgPrice) || parsedAvgPrice <= 0) {
            Alert.alert('Error', 'Please enter valid numerical values');
            return;
        }

        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();

            // To ensure valid ISO string back to DB
            let finalBuyDate = holdingToEdit.buy_date;
            try {
                finalBuyDate = new Date(buyDate).toISOString();
            } catch (e) { /* ignore invalid formats typed temporarily */ }

            const updatedHolding: Holding = {
                ...holdingToEdit,
                name,
                ticker: ticker || undefined,
                quantity: parsedQuantity,
                avg_buy_price: parsedAvgPrice,
                buy_date: finalBuyDate,
                updated_at: now,
            };

            await updateHolding(updatedHolding);
            router.back();
        } catch (e) {
            Alert.alert('Error', 'Failed to update holding');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Holding",
            "Are you sure you want to delete this holding and all associated transaction history? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await removeHolding(id as string);
                            router.dismissAll();
                            router.push('/(tabs)/investments');
                        } catch (e) {
                            Alert.alert("Error", "Could not delete holding");
                        }
                    }
                }
            ]
        );
    };

    if (!holdingToEdit) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <Header title="Edit Holding" showBack />
                <View style={styles.centerContent}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Header title="Edit Holding" showBack />

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                <View style={[styles.card, getShadow(1), { backgroundColor: colors.card }]}>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>
                            {isFixedIncome ? 'Institution / Name' : 'Asset Name'}
                        </ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={name}
                            onChangeText={setName}
                            placeholderTextColor={colors.mutedForeground}
                        />
                    </View>

                    {holdingToEdit.type === 'stock' || holdingToEdit.type === 'crypto' ? (
                        <View style={styles.formGroup}>
                            <ThemedText style={[styles.label, { color: colors.subtitle }]}>Ticker Symbol</ThemedText>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                                value={ticker}
                                onChangeText={setTicker}
                                placeholderTextColor={colors.mutedForeground}
                                autoCapitalize="characters"
                            />
                        </View>
                    ) : null}

                    {!isFixedIncome && (
                        <View style={styles.formGroup}>
                            <ThemedText style={[styles.label, { color: colors.subtitle }]}>Total Quantity / Units</ThemedText>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                                value={quantity}
                                onChangeText={setQuantity}
                                keyboardType="decimal-pad"
                                placeholderTextColor={colors.mutedForeground}
                            />
                        </View>
                    )}

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>
                            {isFixedIncome ? 'Principal Amount' : 'Average Buy Price'}
                        </ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={avgBuyPrice}
                            onChangeText={setAvgBuyPrice}
                            keyboardType="decimal-pad"
                            placeholderTextColor={colors.mutedForeground}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>
                            {isFixedIncome ? 'Start Date' : 'Buy Date'} (YYYY-MM-DD)
                        </ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={buyDate}
                            onChangeText={setBuyDate}
                            placeholder="2024-01-01"
                            placeholderTextColor={colors.mutedForeground}
                        />
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
                        Delete Holding
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
    saveButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
    saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    deleteButton: { paddingVertical: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 40 },
    deleteButtonText: { fontSize: 16, fontWeight: '600' }
});
