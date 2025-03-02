import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useBudgetStore } from '@/stores/budgetStore';
import { Budget } from '@/types';
import { useCategoryStore } from '@/stores/categoryStore';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { startOfMonth } from 'date-fns';

const BudgetFormScreen = () => {
    const { saveBudget, budgets, updateBudget } = useBudgetStore();
    const { editMode, budgetId } = useLocalSearchParams();
    const { categories, fetchCategories } = useCategoryStore();

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
        <ScrollView style={styles.container}>
            <Text style={styles.title}>{editMode === 'true' ? 'Edit Budget' : 'Create Budget'}</Text>

            {/* Budget Limit Input */}
            <Text style={styles.label}>Budget Limit</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={budget.limit.toString()}
                onChangeText={(text) => handleInputChange('limit', parseFloat(text) || 0)}
            />

            {/* Category Selection */}
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoriesContainer}>
                {categories.map(category => (
                    <TouchableOpacity
                        key={category.id}
                        style={[
                            styles.categoryButton,
                            budget.category.id === category.id && styles.selectedCategory
                        ]}
                        onPress={() => handleInputChange('category', category)}
                    >
                        <Text style={[
                            styles.categoryText,
                            budget.category.id === category.id && styles.selectedCategoryText
                        ]}>
                            {category.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Frequency Selection */}
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.frequencyContainer}>
                {frequencies.map(freq => (
                    <TouchableOpacity
                        key={freq}
                        style={[
                            styles.frequencyButton,
                            budget.frequency === freq && styles.selectedFrequency
                        ]}
                        onPress={() => handleInputChange('frequency', freq)}
                    >
                        <Text style={[
                            styles.frequencyText,
                            budget.frequency === freq && styles.selectedFrequencyText
                        ]}>
                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Start Date */}
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                    setDatePickerMode('start');
                    setDatePickerVisible(true);
                }}
            >
                <Text>{new Date(budget.startDate).toLocaleDateString()}</Text>
            </TouchableOpacity>

            {/* End Date (Only Show if Not Recurring) */}
            {!budget.isRecurring && (
                <>
                    <Text style={styles.label}>End Date</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                            setDatePickerMode('end');
                            setDatePickerVisible(true);
                        }}
                    >
                        <Text>{budget.endDate ? new Date(budget.endDate).toLocaleDateString() : 'Select End Date'}</Text>
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
                <Text style={styles.recurringText}>Recurring Budget</Text>
            </TouchableOpacity>

            {/* Save Button */}
            <TouchableOpacity
                style={styles.saveButton}
                onPress={saveBudgetHandler}
            >
                <Text style={styles.saveButtonText}>Save Budget</Text>
            </TouchableOpacity>

            {/* Date Picker Modal */}
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleConfirmDate}
                onCancel={() => setDatePickerVisible(false)}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 20, borderRadius: 8, fontSize: 16 },
    categoryButton: { padding: 10, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', margin: 4 },
    selectedCategory: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    selectedCategoryText: { color: '#fff' },
    dateButton: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 20 },
    recurringButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: '#ddd', marginRight: 10, borderRadius: 4 },
    checkedBox: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    saveButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default BudgetFormScreen;
