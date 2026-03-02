import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/common/ThemedText';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/hooks/useTheme';
import { router, useLocalSearchParams } from 'expo-router';
import { useHoldingsStore } from '@/stores/holdingsStore';
import { Holding } from '@/types';

export default function AddHoldingScreen() {
    const { type } = useLocalSearchParams<{ type: string }>();
    const { colors, getShadow } = useTheme();
    const { addHolding } = useHoldingsStore();

    const [name, setName] = useState('');
    const [ticker, setTicker] = useState(''); // Only for stocks/crypto
    const [quantity, setQuantity] = useState(''); // Units/Shares
    const [avgBuyPrice, setAvgBuyPrice] = useState(''); // Principal for FDs
    const [currentPrice, setCurrentPrice] = useState(''); // Current value or Maturity amount
    const [buyDate, setBuyDate] = useState(new Date().toISOString().split('T')[0]); // Simple YYYY-MM-DD for now

    const [isSubmitting, setIsSubmitting] = useState(false);

    const isFixedIncome = ['fd', 'bond', 'ppf', 'nps'].includes(type || '');

    const getTitle = () => {
        switch (type) {
            case 'stock': return 'Add Stock';
            case 'fd': return 'Add Fixed Deposit';
            case 'bond': return 'Add Bond';
            case 'gold': return 'Add Gold';
            case 'crypto': return 'Add Crypto';
            case 'ppf': return 'Add PPF / NPS';
            default: return 'Add Asset';
        }
    };

    const handleSave = async () => {
        if (!name || !avgBuyPrice) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        if (!isFixedIncome && (!quantity || !currentPrice)) {
            Alert.alert('Error', 'Quantity and Current Price are required for this asset type');
            return;
        }

        const parsedQuantity = isFixedIncome ? 1 : parseFloat(quantity);
        const parsedAvgPrice = parseFloat(avgBuyPrice);
        const parsedCurrentPrice = currentPrice ? parseFloat(currentPrice) : parsedAvgPrice;

        if (isNaN(parsedQuantity) || parsedQuantity <= 0 || isNaN(parsedAvgPrice) || parsedAvgPrice <= 0) {
            Alert.alert('Error', 'Please enter valid numerical values');
            return;
        }

        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();

            const holding: Holding = {
                id: '', // Will be assigned by store/DB
                type: (type as any) || 'other',
                name,
                ticker: ticker || undefined,
                quantity: parsedQuantity,
                avg_buy_price: parsedAvgPrice,
                current_price: parsedCurrentPrice,
                buy_date: new Date(buyDate).toISOString(),
                price_updated_at: now,
                updated_at: now,
            };

            await addHolding(holding);
            // Replace routes until we are back at investments tab
            router.dismissAll();
            router.push('/(tabs)/investments');
        } catch (e) {
            Alert.alert('Error', 'Failed to save holding');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Header title={getTitle()} showBack />

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
                            placeholder={isFixedIncome ? "e.g. HDFC Bank FD" : "e.g. Reliance Industries"}
                            placeholderTextColor={colors.mutedForeground}
                        />
                    </View>

                    {type === 'stock' || type === 'crypto' ? (
                        <View style={styles.formGroup}>
                            <ThemedText style={[styles.label, { color: colors.subtitle }]}>Ticker Symbol (Optional)</ThemedText>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                                value={ticker}
                                onChangeText={setTicker}
                                placeholder="e.g. RELIANCE"
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
                                placeholder="10"
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
                            placeholder="5000"
                            placeholderTextColor={colors.mutedForeground}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <ThemedText style={[styles.label, { color: colors.subtitle }]}>
                            {isFixedIncome ? 'Current Value (Optional)' : 'Current Market Price'}
                        </ThemedText>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.input, color: colors.inputForeground, borderColor: colors.border }]}
                            value={currentPrice}
                            onChangeText={setCurrentPrice}
                            keyboardType="decimal-pad"
                            placeholder={isFixedIncome ? "Leave blank if unknown" : "2500"}
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
                        {isSubmitting ? 'Saving...' : 'Save Investment'}
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
