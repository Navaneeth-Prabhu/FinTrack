import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useBudgetStore } from '@/stores/budgetStore';
import { Budget } from '@/types';
import { useCategoryStore } from '@/stores/categoryStore';
import { router } from 'expo-router';
// import DateTimePicker from '@react-native-community/datetimepicker';

const BudgetFormScreen = () => {
    const { saveBudget } = useBudgetStore();
    const { categories, fetchCategories } = useCategoryStore();
    const frequencies = ['daily', 'weekly', 'monthly', 'yearly'];

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');

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
        startDate: new Date().toISOString(),
        endDate: null,
        isRecurring: true,
        // notifications: {
        //     enabled: true,
        //     thresholds: [50, 80, 90]
        // },
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleInputChange = (field: keyof Budget, value: any) => {
        setBudget(prev => ({ ...prev, [field]: value }));
    };

    const saveBudgetHandler = () => {
        if (!budget.limit || !budget.category) {
            alert('Please enter all required fields.');
            return;
        }
        saveBudget(budget);
        console.log(budget, 'budgetbudget');
        router.back();
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Create Budget</Text>

            {/* Amount Input */}
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
                {categories.map((category) => (
                    <TouchableOpacity
                        key={category.id}
                        style={[
                            styles.categoryButton,
                            budget.category.id === category.id && styles.selectedCategory
                        ]}
                        onPress={() => {
                            handleInputChange('category', category);
                            setSelectedCategory(category.name);
                        }}
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
                {frequencies.map((freq) => (
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
                onPress={() => setShowDatePicker(true)}
            >
                <Text>{new Date(budget.startDate).toLocaleDateString()}</Text>
            </TouchableOpacity>

            {/* {showDatePicker && (
                <DateTimePicker
                    value={new Date(budget.startDate)}
                    mode="date"
                    onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) {
                            handleInputChange('startDate', date.toISOString());
                        }
                    }}
                />
            )} */}

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
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        marginBottom: 20,
        borderRadius: 8,
        fontSize: 16,
    },
    categoriesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
    },
    categoryButton: {
        padding: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        margin: 4,
    },
    selectedCategory: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    categoryText: {
        color: '#333',
    },
    selectedCategoryText: {
        color: '#fff',
    },
    frequencyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    frequencyButton: {
        padding: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        flex: 1,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    selectedFrequency: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    frequencyText: {
        color: '#333',
    },
    selectedFrequencyText: {
        color: '#fff',
    },
    dateButton: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    recurringButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        marginRight: 10,
        borderRadius: 4,
    },
    checkedBox: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    recurringText: {
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default BudgetFormScreen;