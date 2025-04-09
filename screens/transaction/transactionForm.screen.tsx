import React, { useState, useCallback, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard, ScrollView, Image, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import ReceiptScanner from '@/components/ReceiptScanner';
// import * as ImagePicker from 'expo-image-picker';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { Category, RecurringTransaction, Transaction } from '@/types';
import { useTransactionStore } from '@/stores/transactionStore';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/common/ThemedText';
import CategoryBottomSheet from '@/components/bottomSheet/categoryBottomSheet';
import { Header } from '@/components/layout/Header';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecurringTransactionStore } from '@/stores/recurringTransactionStore';
import { format } from 'date-fns';
import { Picker } from '@react-native-picker/picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { fontSizes, tokens } from '@/constants/theme';

const transactionTypes = [
    { id: '1', name: 'Cash', type: 'Bank' },
    { id: '2', name: 'HDFC', type: 'Bank' },
    { id: '3', name: 'Axis', type: 'Bank' },
];

const INITIAL_FORM_STATE = {
    amount: '',
    note: '',
    category: null as Category | null,
    transactionType: transactionTypes[0],
    type: 'expense' as 'income' | 'expense' | 'transfer',
    date: new Date(),
    paidTo: '',
    paidBy: '',
    selectedTags: '',
    // attachment: null as string | null,
};

const TransactionFormScreen: React.FC = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { editMode, transactionId, isRecurring } = useLocalSearchParams();
    const amountInputRef = useRef<TextInput>(null);
    const [showScanner, setShowScanner] = useState(false);
    const { transactions, saveTransaction, updateTransaction } = useTransactionStore();
    const { recurringTransactions, saveRecurringTransaction, updateRecurringTransaction, removeRecurringTransaction } = useRecurringTransactionStore();
    const currentTransaction = useMemo(() =>
        transactions.find(t => t.id === transactionId), [transactionId, transactions]
    );
    const currentRecurring = useMemo(() =>
        recurringTransactions.find(r => r.id === transactionId), [transactionId, recurringTransactions]
    );

    // States
    const [formState, setFormState] = useState({
        amount: '',
        note: '',
        category: null as Category | null,
        type: 'expense' as 'income' | 'expense',
        date: new Date(),
        paidTo: '',
        paidBy: '',
        selectedTags: '',
        transactionType: transactionTypes[0],
        source: { type: "manual" },
        recurringId: undefined as string | undefined,
        attachments: undefined,
    });
    const [isMoreVisible, setIsMoreVisible] = useState(false);
    const [bottomSheetState, setBottomSheetState] = useState(false);
    const [isRecurringState, setIsRecurringState] = useState(isRecurring === 'true');
    const [recurringSchedule, setRecurringSchedule] = useState({
        frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
        startDate: new Date().toISOString(),
        endDate: null as string | null,
        time: format(new Date(), 'HH:mm'),
        interval: 1,
    });
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    // Selectors

    // Load existing transaction data for editing
    useEffect(() => {
        if (editMode === 'true') {
            if (isRecurring === 'true' && currentRecurring) {
                setFormState({
                    amount: currentRecurring.amount.toString(),
                    note: currentRecurring.description || '',
                    category: currentRecurring.category,
                    type: currentRecurring.type as 'income' | 'expense',
                    date: new Date(currentRecurring.startDate),
                    paidTo: currentRecurring.payee || '',
                    paidBy: '',
                    selectedTags: '',
                    transactionType: transactionTypes.find(t => t.name === currentRecurring.mode) || transactionTypes[0],
                    source: { type: 'manual' },
                    recurringId: currentRecurring.id,
                    attachments: undefined,
                });
                setIsRecurringState(true);
                setRecurringSchedule({
                    frequency: currentRecurring.frequency,
                    startDate: currentRecurring.startDate,
                    endDate: currentRecurring.endDate || null,
                    time: currentRecurring.time || format(new Date(), 'HH:mm'),
                    interval: currentRecurring.interval,
                });
            } else if (currentTransaction) {
                setFormState({
                    amount: currentTransaction.amount.toString(),
                    note: currentTransaction.note || '',
                    category: currentTransaction.category,
                    type: currentTransaction.type as 'income' | 'expense',
                    date: new Date(currentTransaction.date),
                    paidTo: currentTransaction.paidTo || '',
                    paidBy: '',
                    transactionType: transactionTypes.find(t => t.name === currentTransaction.mode) || transactionTypes[0],
                    source: currentTransaction.source,
                    recurringId: currentTransaction.recurringId || undefined,
                    selectedTags: currentTransaction.selectedTags || '',
                    attachments: undefined,
                });
                setIsRecurringState(!!currentTransaction.recurringId);
                if (currentTransaction.recurringId) {
                    const recurring = recurringTransactions.find(r => r.id === currentTransaction.recurringId);
                    if (recurring) {
                        setRecurringSchedule({
                            frequency: recurring.frequency,
                            startDate: recurring.startDate,
                            endDate: recurring.endDate || null,
                            time: recurring.time || format(new Date(), 'HH:mm'),
                            interval: recurring.interval,
                        });
                    }
                }
            }
        }
    }, [editMode, currentTransaction, currentRecurring, isRecurring, recurringTransactions]);

    // Show category bottom sheet if no category selected
    useEffect(() => {
        if (!formState.category && !bottomSheetState) {
            const timer = setTimeout(() => {
                setBottomSheetState((prev: any) => ({ ...prev, isCategoryVisible: true }));
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [formState.category]);

    // Memoized form handlers
    const handleFormChange = useCallback((field: keyof typeof INITIAL_FORM_STATE, value: any) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    }, []);

    const validateAmount = useCallback((input: string) => {
        const regex = /^[0-9]*\.?[0-9]*$/;
        if (regex.test(input)) {
            handleFormChange('amount', input);
        }
    }, [handleFormChange]);

    // Memoized submit handler
    const handleSubmit = useCallback(async () => {
        if (!formState.category || !formState.amount) return;

        const id = editMode === 'true' ? (transactionId as string) : Date.now().toString();

        // Check if we need to delete a recurring transaction
        if (editMode === 'true' && isRecurring === 'true' && !isRecurringState && currentRecurring) {
            await removeRecurringTransaction(currentRecurring.id);

            // Then create a normal transaction instead
            const transactionData = {
                id,
                amount: parseFloat(formState.amount),
                note: formState.note,
                category: formState.category,
                type: formState.type,
                date: formState.date.toISOString(),
                paidTo: formState.type === 'expense' ? formState.paidTo || 'Unknown Recipient' : undefined,
                paidBy: formState.type === 'income' ? formState.paidBy || 'Unknown Payer' : undefined,
                mode: formState.transactionType.name,
                createdAt: Date.now().toString(),
                lastModified: Date.now().toString(),
                source: formState.source,
                recurringId: undefined, // Make sure to remove the recurring ID reference
            };
            await saveTransaction(transactionData);
            router.back();
            return;
        }

        if (isRecurringState) {
            const recurringData: RecurringTransaction = {
                id,
                amount: parseFloat(formState.amount),
                type: formState.type,
                category: formState.category,
                frequency: recurringSchedule.frequency,
                interval: recurringSchedule.interval,
                startDate: recurringSchedule.startDate,
                endDate: recurringSchedule.endDate || undefined,
                description: formState.note,
                payee: formState.type === 'expense' ? formState.paidTo : formState.paidBy,
                time: recurringSchedule.time,
                mode: formState.transactionType.name,
                isActive: 1,
                lastGeneratedDate: undefined,
                createdAt: currentRecurring?.createdAt || Date.now().toString(),
                lastModified: Date.now().toString(),
            };
            // console.log('recurringData', editMode, recurringData);
            editMode === 'true' ? await updateRecurringTransaction(recurringData) : await saveRecurringTransaction(recurringData);
        } else {
            const transactionData: Transaction = {
                id,
                amount: parseFloat(formState.amount),
                note: formState.note,
                category: formState.category,
                type: formState.type,
                date: formState.date.toISOString(),
                paidTo: formState.type === 'expense' ? formState.paidTo || 'Unknown Recipient' : undefined,
                paidBy: formState.type === 'income' ? formState.paidBy || 'Unknown Payer' : undefined,
                mode: formState.transactionType.name,
                createdAt: currentTransaction?.createdAt || Date.now().toString(),
                lastModified: Date.now().toString(),
                source: formState.source,
                recurringId: formState.recurringId,
            };
            editMode === 'true' ? await updateTransaction(transactionData) : await saveTransaction(transactionData);
        }
        router.back();
    }, [formState, isRecurringState, recurringSchedule, editMode, transactionId, currentTransaction, currentRecurring, isRecurring]);
    const handleStartDateConfirm = (date: Date) => {
        setRecurringSchedule(prev => ({ ...prev, startDate: date.toISOString() }));
        setShowStartDatePicker(false);
    };

    const handleEndDateConfirm = (date: Date) => {
        setRecurringSchedule(prev => ({ ...prev, endDate: date.toISOString() }));
        setShowEndDatePicker(false);
    };

    const handleTimeConfirm = (date: Date) => {
        setRecurringSchedule(prev => ({ ...prev, time: format(date, 'HH:mm') }));
        setShowTimePicker(false);
    };

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <Header showBack title={editMode ? 'Edit Transaction' : 'New Transaction'} />
            <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View>
                        <ThemedText variant="h2">
                            {editMode ? 'Edit' : 'Add New'}
                            <Text
                                style={{
                                    color: formState.type === 'income' ? colors.income : colors.expense,
                                    backgroundColor: colors.card,
                                    borderRadius: 5,
                                }}
                            >
                                {' '}
                                {formState.type === 'income' ? 'Income' : 'Expense'}{' '}
                            </Text>
                        </ThemedText>
                    </View>

                    {/* Amount Input */}
                    <View style={[styles.amountContainer, { borderColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: fontSizes.FONT24, color: colors.text }}>₹ </Text>
                        </View>
                        <TextInput
                            ref={amountInputRef}
                            style={[styles.amountInput, { color: colors.text }]}
                            placeholder="0"
                            placeholderTextColor={colors.text}
                            keyboardType="numeric"
                            value={formState.amount}
                            onChangeText={validateAmount}
                            maxLength={10}
                        />
                        <ReceiptScanner onImageCaptured={(uri) => {
                            console.log("Image captured", uri);
                            setFormState(prev => ({ ...prev, attachments: [{ type: 'image', url: uri }] }));
                        }} />
                    </View>

                    {/* Category Selection */}
                    <TouchableOpacity
                        style={[styles.input, { borderColor: formState.category ? formState.category.color : colors.border, backgroundColor: colors.card }]}
                        onPress={() => setBottomSheetState(true)}
                    >
                        <Text style={{ color: formState.category ? colors.text : colors.subtitle, textAlignVertical: 'center' }}>
                            {formState.category ? `${formState.category.icon}   ${formState.category.name}` : 'Select Category'}
                        </Text>
                    </TouchableOpacity>

                    {/* Paid By/To Input */}
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border, marginTop: 10, backgroundColor: colors.card }]}
                        placeholder={formState.type === 'income' ? 'Paid By' : 'Paid To'}
                        placeholderTextColor={colors.text}
                        value={formState.type === 'income' ? formState.paidBy : formState.paidTo}
                        onChangeText={text => handleFormChange(formState.type === 'income' ? 'paidBy' : 'paidTo', text)}
                    />

                    {/* Transaction Types Scroll */}
                    <ScrollView horizontal style={styles.transactionTypeContainer} showsHorizontalScrollIndicator={false}>
                        {transactionTypes.map(item => (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => handleFormChange('transactionType', item)}
                                style={[styles.transactionTypeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                            >
                                <ThemedText style={styles.transactionTypeText}>{item.name}</ThemedText>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Recurring Transaction Section */}
                    <View style={styles.recurringSection}>
                        <View style={styles.recurringHeader}>
                            <ThemedText>Make this a recurring transaction</ThemedText>
                            <Switch
                                value={isRecurringState}
                                onValueChange={setIsRecurringState}
                            // disabled={isRecurring === 'true' || !!formState.recurringId} // Disable if editing recurring or linked instance
                            />
                        </View>
                        {isRecurringState && (
                            <View style={styles.recurringOptions}>
                                <Picker
                                    selectedValue={recurringSchedule.frequency}
                                    onValueChange={value => setRecurringSchedule(prev => ({ ...prev, frequency: value }))}
                                    style={[styles.picker, { backgroundColor: colors.card }]}
                                >
                                    <Picker.Item label="Daily" value="daily" />
                                    <Picker.Item label="Weekly" value="weekly" />
                                    <Picker.Item label="Monthly" value="monthly" />
                                    <Picker.Item label="Yearly" value="yearly" />
                                </Picker>
                                <TouchableOpacity
                                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => setShowStartDatePicker(true)}
                                >
                                    <Text style={{ color: colors.text }}>
                                        Start: {format(new Date(recurringSchedule.startDate), 'MMM d, yyyy')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Text style={{ color: colors.text }}>Time: {recurringSchedule.time}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => setShowEndDatePicker(true)}
                                >
                                    <Text style={{ color: recurringSchedule.endDate ? colors.text : colors.subtitle }}>
                                        End: {recurringSchedule.endDate ? format(new Date(recurringSchedule.endDate), 'MMM d, yyyy') : 'Never'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* More Options */}
                    {isMoreVisible && (
                        <>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                placeholder="Notes"
                                placeholderTextColor={colors.subtitle}
                                value={formState.note}
                                onChangeText={text => handleFormChange('note', text)}
                                multiline
                            />
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.submitButton, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row' }]}
                        onPress={() => setIsMoreVisible(!isMoreVisible)}
                    >
                        <Text style={{ color: colors.text }}>{isMoreVisible ? 'Show less' : 'Show more'}</Text>
                        <Feather name={isMoreVisible ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} />
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </ScrollView>

            <View style={styles.saveButtonContainer}>
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                        if (!formState.category) {
                            setBottomSheetState(true); // Open bottom sheet
                        } else if (!formState.amount) {
                            amountInputRef.current?.focus();
                        } else {
                            handleSubmit();
                        }
                    }}
                >
                    <ThemedText style={{ color: 'white' }} variant="subtitle">
                        {!formState.category ? 'Select Category' : !formState.amount ? 'Add Amount' : 'Save Transaction'}
                    </ThemedText>
                </TouchableOpacity>
            </View>

            <CategoryBottomSheet
                onSelectCategory={cat => handleFormChange('category', cat)}
                isVisible={bottomSheetState}
                onClose={() => setBottomSheetState(false)}
                type={formState.type}
                setType={type => handleFormChange('type', type)}
            />

            {/* Date/Time Pickers */}
            <DateTimePickerModal
                isVisible={showStartDatePicker}
                mode="date"
                date={new Date(recurringSchedule.startDate)}
                onConfirm={handleStartDateConfirm}
                onCancel={() => setShowStartDatePicker(false)}
            />
            <DateTimePickerModal
                isVisible={showEndDatePicker}
                mode="date"
                date={recurringSchedule.endDate ? new Date(recurringSchedule.endDate) : new Date()}
                onConfirm={handleEndDateConfirm}
                onCancel={() => setShowEndDatePicker(false)}
            />
            <DateTimePickerModal
                isVisible={showTimePicker}
                mode="time"
                date={new Date(`1970-01-01T${recurringSchedule.time}:00Z`)}
                onConfirm={handleTimeConfirm}
                onCancel={() => setShowTimePicker(false)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    amountContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        paddingBottom: 10,
        marginBottom: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    currencySymbol: {
        fontSize: 24,
    },
    amountInput: {
        flex: 1,
        height: 100,
        fontSize: 40,
    },
    qrButton: {
        padding: 10,
        borderRadius: 10,
    },
    input: {
        width: '100%',
        height: 40,
        borderWidth: 1,
        paddingHorizontal: 10,
        borderRadius: 10,
        justifyContent: 'center',
    },
    transactionTypeContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    transactionTypeButton: {
        padding: 6,
        paddingHorizontal: 14,
        borderRadius: 6,
        borderWidth: 1.5,
        marginRight: 6,
        justifyContent: 'center',
    },
    transactionTypeText: {
        fontSize: 14,
    },
    addTransactionTypeButton: {
        padding: 6,
        borderRadius: 6,
        borderWidth: 1.5,
        marginRight: 6,
        justifyContent: 'center',
    },
    recurringSection: {
        marginTop: 20,
        marginBottom: 20,
        padding: 10,
        borderWidth: 1,
        borderRadius: 10,
    },
    recurringHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    recurringOptions: {
        marginTop: 10,
    },
    picker: {
        height: 40,
        marginBottom: 10,
    },
    submitButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        borderWidth: 1,
    },
    saveButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: 'transparent',
    },
    saveButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
});

export default TransactionFormScreen;