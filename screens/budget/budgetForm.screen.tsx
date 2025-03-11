import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useBudgetStore } from '@/stores/budgetStore';
import { Budget } from '@/types';
import { useCategoryStore } from '@/stores/categoryStore';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { startOfMonth } from 'date-fns';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';

const BudgetFormScreen = () => {
    const { saveBudget, budgets, updateBudget } = useBudgetStore();
    const { editMode, budgetId } = useLocalSearchParams();
    const { categories, fetchCategories } = useCategoryStore();
    const { colors } = useTheme();
    const frequencies = ['daily', 'weekly', 'monthly', 'yearly'];

    const currentBudget = useMemo(() =>
        budgets.find(b => b.id === budgetId),
        [budgetId, budgets]
    );

    const [budget, setBudget] = useState<Budget>({
        id: new Date().toISOString(),
        limit: 0,
        spent: 0,
        progress: 0,
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
    });

    // DatePicker State
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (editMode === 'true' && currentBudget) {
            setBudget({ ...currentBudget });
        }
    }, [editMode, currentBudget]);

    const handleInputChange = (field: keyof Budget, value: any) => {
        setBudget(prev => ({ ...prev, [field]: value }));
    };

    const saveBudgetHandler = () => {
        if (!budget.limit || !budget.category.id) {
            Alert.alert('Error', 'Please enter all required fields.');
            return;
        }
        if (editMode === 'true') {
            updateBudget(budget);
        } else {
            saveBudget(budget);
        }
        router.back();
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
        <>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>

                <ScrollView style={styles.container}>
                    <ThemedText variant='h2' style={styles.title}>{editMode === 'true' ? 'Edit Budget' : 'Create Budget'}</ThemedText>

                    {/* Budget Limit Input */}
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.accent }]}
                        placeholder="Enter amount"
                        keyboardType="numeric"
                        value={budget.limit.toString()}
                        placeholderTextColor={colors.text}
                        onChangeText={(text) => handleInputChange('limit', parseFloat(text) || 0)}
                    />

                    {/* Category Selection */}
                    <ThemedText style={styles.label}>Category</ThemedText>
                    <View style={styles.categoriesContainer}>
                        {categories.map(category => (
                            <TouchableOpacity
                                key={category.id}
                                style={[
                                    styles.categoryButton,
                                    // budget.category.id === category.id && styles.selectedCategory,
                                    { borderColor: budget.category.id === category.id ? category.color : colors.accent }
                                ]}
                                onPress={() => handleInputChange('category', category)}
                            >
                                <ThemedText>
                                    {category.name}
                                </ThemedText>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Frequency Selection */}
                    <ThemedText style={styles.label}>Frequency</ThemedText>
                    <View style={[styles.categoriesContainer]}>
                        {frequencies.map(freq => (
                            <TouchableOpacity
                                key={freq}
                                style={[
                                    styles.categoryButton,
                                    { borderColor: budget.frequency === freq ? colors.primary : colors.accent }
                                ]}
                                onPress={() => handleInputChange('frequency', freq)}
                            >
                                <ThemedText >
                                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                </ThemedText>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Start Date */}
                    <ThemedText style={styles.label}>Start Date</ThemedText>
                    <TouchableOpacity
                        style={styles.dateButton}
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
                                style={styles.dateButton}
                                onPress={() => {
                                    setDatePickerMode('end');
                                    setDatePickerVisible(true);
                                }}
                            >
                                <ThemedText>{budget.endDate ? new Date(budget.endDate).toLocaleDateString() : 'Select End Date'}</ThemedText>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Recurring Toggle */}
                    <TouchableOpacity
                        style={styles.recurringButton}
                        onPress={() => handleInputChange('isRecurring', !budget.isRecurring)}
                    >
                        <View style={[
                            styles.checkbox,
                            budget.isRecurring && styles.checkedBox
                        ]} />
                        <ThemedText >Recurring Budget</ThemedText>
                    </TouchableOpacity>

                    {/* Save Button */}

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
        </>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    title: { marginBottom: 20 },
    label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    input: { padding: 8, marginBottom: 20, borderRadius: 8, fontSize: 34, borderBottomWidth: 2 },
    categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, gap: 8 },
    categoryButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 2 },
    selectedCategory: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    selectedCategoryText: { color: '#fff' },
    dateButton: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 20 },
    recurringButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: '#ddd', marginRight: 10, borderRadius: 4 },
    checkedBox: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    saveButton: { padding: 15, borderRadius: 8, alignItems: 'center', position: 'absolute', bottom: 20, left: 10, right: 10 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default BudgetFormScreen;
