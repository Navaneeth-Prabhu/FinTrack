import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Text } from 'react-native';
import { useBudgetStore } from '@/stores/budgetStore';
import { Budget } from '@/types';
import { useCategoryStore } from '@/stores/categoryStore';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { startOfMonth } from 'date-fns';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontSizes } from '@/constants/theme';

const BudgetFormScreen = () => {
    const { saveBudget, budgets, updateBudget } = useBudgetStore();
    const { editMode, budgetId } = useLocalSearchParams();
    const { categories, fetchCategories } = useCategoryStore();
    const { colors } = useTheme();
    const frequencies = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];

    const currentBudget = useMemo(() => budgets.find(b => b.id === budgetId), [budgetId, budgets]);
    const nonBudgetCategories = useMemo(() =>
        categories.filter(c =>
            c.type === 'expense' && !budgets.some(b => b.category.id === c.id)
        ),
        [categories, budgets]
    );
    const [budget, setBudget] = useState<Budget>({
        id: new Date().toISOString(), // Temporary ID, replace with UUID if needed
        limit: 0,
        category: {
            id: '',
            name: '',
            icon: '',
            type: 'expense',
            color: '',
        },
        frequency: 'monthly',
        startDate: startOfMonth(new Date()).toISOString(),
        endDate: null,
        isRecurring: true,
        name: '', // Optional field
        periodLength: undefined, // Added for custom frequency
    });

    // DatePicker State
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        if (editMode === 'true' && currentBudget) {
            setBudget({ ...currentBudget });
        }
    }, [editMode, currentBudget]);

    const handleInputChange = (field: keyof Budget, value: any) => {
        setBudget(prev => ({ ...prev, [field]: value }));
    };

    const saveBudgetHandler = async () => {
        if (!budget.limit || !budget.category.id) {
            Alert.alert('Error', 'Please enter all required fields.');
            return;
        }
        if (budget.frequency === 'custom' && (!budget.periodLength || budget.periodLength <= 0)) {
            Alert.alert('Error', 'Please enter a valid period length for custom frequency.');
            return;
        }
        try {
            if (editMode === 'true') {
                const updatedBudget = await updateBudget(budget);
                console.log('Updated budget:', updatedBudget);
                Alert.alert('Success', 'Budget updated successfully.');
            } else {
                const newBudget = await saveBudget(budget);
                console.log('Created budget:', newBudget);
                Alert.alert('Success', 'Budget created successfully.');
            }
            router.back();
        } catch (error) {
            console.error('Error saving/updating budget:', error);
            Alert.alert('Error', 'Failed to save budget: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    // Handle Date Picker Selection
    const handleConfirmDate = (date: Date) => {
        const dateString = date.toISOString();
        if (datePickerMode === 'start') {
            handleInputChange('startDate', dateString);
        } else {
            handleInputChange('endDate', dateString);
        }
        setDatePickerVisible(false);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView style={styles.container}>
                <ThemedText variant="h2" style={styles.title}>
                    {editMode === 'true' ? 'Edit Budget' : 'Create Budget'}
                </ThemedText>

                {/* Budget Name Input */}
                <ThemedText style={styles.label}>Budget Name (Optional)</ThemedText>
                <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.accent }]}
                    placeholder="Enter budget name"
                    value={budget.name}
                    onChangeText={(text) => handleInputChange('name', text)}
                    placeholderTextColor={colors.muted}
                />

                {/* Budget Limit Input */}
                <ThemedText style={styles.label}>Limit</ThemedText>
                <View style={{
                    flexDirection: 'row', flex: 1, borderColor: colors.accent,
                    alignItems: 'center', borderWidth: 2, borderRadius: 8,
                    padding: 8
                }}>
                    <Text style={{ fontSize: fontSizes.FONT24, color: colors.text }}>₹ </Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: fontSizes.FONT48, flex: 1 }}
                        placeholder="Enter amount"
                        keyboardType="numeric"
                        value={budget.limit.toString()}
                        onChangeText={(text) => handleInputChange('limit', parseFloat(text) || 0)}
                    />
                </View>

                {/* Category Selection */}
                <ThemedText style={styles.label}>Category</ThemedText>
                <View style={styles.categoriesContainer}>
                    {nonBudgetCategories.map(category => (
                        <TouchableOpacity
                            key={category.id}
                            style={[
                                styles.categoryButton,
                                { borderColor: budget.category.id === category.id ? category.color : colors.accent },
                            ]}
                            onPress={() => handleInputChange('category', category)}
                        >
                            <ThemedText>{category.name}</ThemedText>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Frequency Selection */}
                <ThemedText style={styles.label}>Frequency</ThemedText>
                <View style={styles.categoriesContainer}>
                    {frequencies.map(freq => (
                        <TouchableOpacity
                            key={freq}
                            style={[
                                styles.categoryButton,
                                { borderColor: budget.frequency === freq ? colors.primary : colors.accent },
                            ]}
                            onPress={() => handleInputChange('frequency', freq)}
                        >
                            <ThemedText>{freq.charAt(0).toUpperCase() + freq.slice(1)}</ThemedText>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Period Length for Custom Frequency */}
                {budget.frequency === 'custom' && (
                    <>
                        <ThemedText style={styles.label}>Period Length (Days)</ThemedText>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.accent }]}
                            placeholder="Enter number of days"
                            keyboardType="numeric"
                            value={budget.periodLength?.toString() || ''}
                            onChangeText={(text) => handleInputChange('periodLength', parseInt(text) || undefined)}
                            placeholderTextColor={colors.muted}
                        />
                    </>
                )}

                {/* Start Date */}
                <ThemedText style={styles.label}>Start Date</ThemedText>
                <TouchableOpacity
                    style={[styles.dateButton, { borderColor: colors.accent }]}
                    onPress={() => {
                        setDatePickerMode('start');
                        setDatePickerVisible(true);
                    }}
                >
                    <ThemedText>{new Date(budget.startDate).toLocaleDateString()}</ThemedText>
                </TouchableOpacity>

                {/* End Date (Only Show if Not Recurring) */}
                {!budget.isRecurring && (
                    <>
                        <ThemedText style={styles.label}>End Date</ThemedText>
                        <TouchableOpacity
                            style={[styles.dateButton, { borderColor: colors.accent }]}
                            onPress={() => {
                                setDatePickerMode('end');
                                setDatePickerVisible(true);
                            }}
                        >
                            <ThemedText>
                                {budget.endDate ? new Date(budget.endDate).toLocaleDateString() : 'Select End Date'}
                            </ThemedText>
                        </TouchableOpacity>
                    </>
                )}

                {/* Recurring Toggle */}
                <TouchableOpacity
                    style={styles.recurringButton}
                    onPress={() => handleInputChange('isRecurring', !budget.isRecurring)}
                >
                    <View
                        style={[
                            styles.checkbox,
                            { borderColor: colors.accent },
                            budget.isRecurring && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                    />
                    <ThemedText>Recurring Budget</ThemedText>
                </TouchableOpacity>

                {/* Date Picker Modal */}
                <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="date"
                    onConfirm={handleConfirmDate}
                    onCancel={() => setDatePickerVisible(false)}
                />
            </ScrollView>
            <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={saveBudgetHandler}
            >
                <ThemedText style={styles.saveButtonText}>Save Budget</ThemedText>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    title: { marginBottom: 20 },
    label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    input: {
        padding: 8,
        marginBottom: 20,
        borderRadius: 8,
        fontSize: 16,
        borderBottomWidth: 2,
    },
    categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, gap: 8 },
    categoryButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 2 },
    dateButton: { borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 20 },
    recurringButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    checkbox: { width: 20, height: 20, borderWidth: 1, marginRight: 10, borderRadius: 4 },
    saveButton: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        position: 'absolute',
        bottom: 20,
        left: 10,
        right: 10,
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default BudgetFormScreen;