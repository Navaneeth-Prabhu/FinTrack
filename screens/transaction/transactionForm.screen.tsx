import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Switch, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import ReceiptScanner from '@/components/ReceiptScanner';
import { useTransactionStore } from '@/stores/transactionStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { Category, RecurringTransaction, Transaction } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/common/ThemedText';
import CategoryBottomSheet from '@/components/bottomSheet/categoryBottomSheet';
import { Header } from '@/components/layout/Header';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecurringTransactionStore } from '@/stores/recurringTransactionStore';
import { format } from 'date-fns';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { darkTheme, fontSizes, lightTheme, tokens } from '@/constants/theme';
import usePreferenceStore from '@/stores/preferenceStore';
import { Colors } from '@/constants/Colors';

type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';
type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

import { useAccountStore } from '@/stores/accountStore';
import { Account } from '@/types';

interface FormState {
    amount: string;
    note: string;
    category: Category | null;
    type: TransactionType;
    date: Date;
    time: string;
    paidTo: string;
    paidBy: string;
    fromAccount: Account | null;
    toAccount: Account | null;
    selectedTags: string;
    selectedAccount: Account | null;
    source: { type: string, rawData?: string };
    recurringId?: string;
    attachments?: { type: string; url: string }[];
}

// Transaction Type Bottom Sheet Component
const TransactionTypeBottomSheet: React.FC<{
    bottomSheetRef: React.RefObject<BottomSheetModal>;
    selectedType: TransactionType;
    onSelectType: (type: TransactionType) => void;
    colors: any;
}> = ({ bottomSheetRef, selectedType, onSelectType, colors }) => {
    const snapPoints = useMemo(() => ['100%'], []);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    const transactionOptions = [
        { type: 'income' as TransactionType, icon: 'arrow-down-circle', color: colors.income, label: 'Income' },
        { type: 'expense' as TransactionType, icon: 'arrow-up-circle', color: colors.expense, label: 'Expense' },
        { type: 'transfer' as TransactionType, icon: 'swap-horizontal', color: colors.primary, label: 'Transfer' },
        { type: 'investment' as TransactionType, icon: 'trending-up', color: colors.primary, label: 'Investment' },
    ];

    return (
        <BottomSheetModalProvider>
            <BottomSheetModal
                ref={bottomSheetRef}
                snapPoints={snapPoints}
                backdropComponent={renderBackdrop}
                backgroundStyle={{ backgroundColor: colors.card }}
                handleIndicatorStyle={{ backgroundColor: colors.border }}
                enablePanDownToClose={true}
            >
                <BottomSheetView style={styles.bottomSheetContent}>
                    <ThemedText style={[styles.bottomSheetTitle, { color: colors.text }]}>
                        Select Transaction Type
                    </ThemedText>
                    {transactionOptions.map((option) => (
                        <TouchableOpacity
                            key={option.type}
                            style={[
                                styles.typeOption,
                                { backgroundColor: colors.background },
                                selectedType === option.type && { borderColor: option.color, borderWidth: 2 }
                            ]}
                            onPress={() => {
                                onSelectType(option.type);
                                bottomSheetRef.current?.dismiss();
                            }}
                        >
                            <Ionicons name={option.icon as any} size={28} color={option.color} />
                            <ThemedText style={[styles.typeOptionText, { color: colors.text }]}>
                                {option.label}
                            </ThemedText>
                        </TouchableOpacity>
                    ))}
                </BottomSheetView>
            </BottomSheetModal>
        </BottomSheetModalProvider>
    );
};

// Recurring Frequency Bottom Sheet Component
const RecurringFrequencyBottomSheet: React.FC<{
    bottomSheetRef: React.RefObject<BottomSheetModal>;
    selectedFrequency: RecurringFrequency;
    onSelectFrequency: (frequency: RecurringFrequency) => void;
    colors: any;
}> = ({ bottomSheetRef, selectedFrequency, onSelectFrequency, colors }) => {
    const snapPoints = useMemo(() => ['45%'], []);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    const frequencies: { value: RecurringFrequency; label: string }[] = [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'yearly', label: 'Yearly' },
    ];

    return (
        <BottomSheetModalProvider>
            <BottomSheetModal
                ref={bottomSheetRef}
                snapPoints={snapPoints}
                backdropComponent={renderBackdrop}
                backgroundStyle={{ backgroundColor: colors.card }}
                handleIndicatorStyle={{ backgroundColor: colors.border }}
                enablePanDownToClose={true}
            >
                <BottomSheetView style={styles.bottomSheetContent}>
                    <ThemedText style={[styles.bottomSheetTitle, { color: colors.text }]}>
                        Select Period
                    </ThemedText>
                    {frequencies.map((freq) => (
                        <TouchableOpacity
                            key={freq.value}
                            style={[
                                styles.frequencyOption,
                                { backgroundColor: colors.background },
                                selectedFrequency === freq.value && { borderColor: colors.primary, borderWidth: 2 }
                            ]}
                            onPress={() => {
                                onSelectFrequency(freq.value);
                                bottomSheetRef.current?.dismiss();
                            }}
                        >
                            <ThemedText style={[styles.frequencyOptionText, { color: colors.text }]}>
                                {freq.label}
                            </ThemedText>
                        </TouchableOpacity>
                    ))}
                </BottomSheetView>
            </BottomSheetModal>
        </BottomSheetModalProvider>
    );
};

const TransactionFormScreen: React.FC = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { theme } = usePreferenceStore();
    const { accounts } = useAccountStore();
    const { editMode, transactionId, isRecurring } = useLocalSearchParams();
    const amountInputRef = useRef<TextInput>(null);
    const typeBottomSheetRef = useRef<BottomSheetModal>(null);
    const frequencyBottomSheetRef = useRef<BottomSheetModal>(null);
    const { transactions, saveTransaction, updateTransaction } = useTransactionStore();
    const { categories } = useCategoryStore();
    const { recurringTransactions, saveRecurringTransaction, updateRecurringTransaction, removeRecurringTransaction } = useRecurringTransactionStore();

    const currentTransaction = useMemo(() =>
        transactions.find(t => t.id === transactionId), [transactionId, transactions]
    );
    const currentRecurring = useMemo(() =>
        recurringTransactions.find(r => r.id === transactionId), [transactionId, recurringTransactions]
    );

    // States
    const [formState, setFormState] = useState<FormState>({
        amount: '',
        note: '',
        category: null,
        type: 'expense',
        date: new Date(),
        time: format(new Date(), 'HH:mm'),
        paidTo: '',
        paidBy: '',
        fromAccount: null,
        toAccount: null,
        selectedTags: '',
        selectedAccount: null,
        source: { type: "manual" },
        recurringId: undefined,
        attachments: undefined,
    });

    const [bottomSheetState, setBottomSheetState] = useState(false);
    const [isRecurringState, setIsRecurringState] = useState(isRecurring === 'true');
    const [recurringSchedule, setRecurringSchedule] = useState({
        frequency: 'monthly' as RecurringFrequency,
        startDate: new Date().toISOString(),
        endDate: null as string | null,
        interval: 1,
    });
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Load existing transaction data for editing
    useEffect(() => {
        if (editMode === 'true') {
            if (isRecurring === 'true' && currentRecurring) {
                setFormState({
                    amount: currentRecurring.amount.toString(),
                    note: currentRecurring.description || '',
                    category: currentRecurring.category,
                    type: currentRecurring.type as TransactionType,
                    date: new Date(currentRecurring.startDate),
                    time: format(new Date(), 'HH:mm'),
                    paidTo: currentRecurring.payee || '',
                    paidBy: '',
                    fromAccount: accounts.find(a => a.id === currentRecurring.fromAccount?.id) || null,
                    toAccount: accounts.find(a => a.id === currentRecurring.toAccount?.id) || null,
                    selectedTags: '',
                    selectedAccount: accounts.find(a => a.name === currentRecurring.mode) || (accounts.length > 0 ? accounts[0] : null),
                    source: { type: 'manual' },
                    recurringId: currentRecurring.id,
                    attachments: undefined,
                });
                setIsRecurringState(true);
                setRecurringSchedule({
                    frequency: currentRecurring.frequency,
                    startDate: currentRecurring.startDate,
                    endDate: currentRecurring.endDate || null,
                    interval: currentRecurring.interval,
                });
            } else if (currentTransaction) {
                const transactionDate = new Date(currentTransaction.date);
                setFormState({
                    amount: currentTransaction.amount.toString(),
                    note: currentTransaction.note || '',
                    category: currentTransaction.category,
                    type: currentTransaction.type as TransactionType,
                    date: transactionDate,
                    time: format(transactionDate, 'HH:mm'),
                    paidTo: currentTransaction.paidTo || '',
                    paidBy: '',
                    fromAccount: accounts.find(a => a.id === currentTransaction.fromAccount?.id) || null,
                    toAccount: accounts.find(a => a.id === currentTransaction.toAccount?.id) || null,
                    selectedAccount: accounts.find(a => a.name === currentTransaction.mode) || (accounts.length > 0 ? accounts[0] : null),
                    source: currentTransaction.source,
                    recurringId: currentTransaction.recurringId || undefined,
                    selectedTags: currentTransaction.selectedTags || '',
                    attachments: undefined,
                });
                setIsRecurringState(!!currentTransaction.recurringId);
            }
        }
    }, [editMode, currentTransaction, currentRecurring, isRecurring, recurringTransactions, accounts]);

    // Auto-select category for Transfer or Investment
    useEffect(() => {
        if (formState.type === 'transfer') {
            const transferCat = categories.find(c => c.type === 'transfer');
            if (transferCat && formState.category?.id !== transferCat.id) {
                setFormState(prev => ({ ...prev, category: transferCat }));
            }
        } else if (formState.type === 'investment') {
            const investCat = categories.find(c => c.type === 'investment');
            if (investCat && formState.category?.id !== investCat.id) {
                setFormState(prev => ({ ...prev, category: investCat }));
            }
        }
    }, [formState.type, categories]);

    // Memoized form handlers
    const handleFormChange = useCallback((field: keyof typeof formState, value: any) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    }, []);

    const validateAmount = useCallback((input: string) => {
        const regex = /^[0-9]*\.?[0-9]*$/;
        if (regex.test(input)) {
            handleFormChange('amount', input);
        }
    }, [handleFormChange]);

    const handleSubmit = useCallback(async () => {
        const floatAmount = parseFloat(formState.amount);
        if (!formState.category || isNaN(floatAmount) || floatAmount <= 0) {
            if (!formState.category) setBottomSheetState(true);
            else if (isNaN(floatAmount) || floatAmount <= 0) amountInputRef.current?.focus();
            return;
        }

        const id = editMode === 'true' ? (transactionId as string) : Date.now().toString();

        // Combine date and time for transaction
        const [hours, minutes] = formState.time.split(':');
        const transactionDateTime = new Date(formState.date);
        transactionDateTime.setHours(parseInt(hours), parseInt(minutes));

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
                payee: formState.type === 'expense' ? formState.paidTo :
                    formState.type === 'income' ? formState.paidBy :
                        `${formState.fromAccount?.name} to ${formState.toAccount?.name}`,
                time: format(new Date(), 'HH:mm'), // Use current time for recurring
                mode: formState.type === 'transfer' || formState.type === 'investment' ? 'Transfer' : formState.selectedAccount?.name || '',
                isActive: 1,
                lastGeneratedDate: undefined,
                createdAt: currentRecurring?.createdAt || Date.now().toString(),
                lastModified: Date.now().toString(),
            };

            editMode === 'true' ? await updateRecurringTransaction(recurringData) : await saveRecurringTransaction(recurringData);
            router.back();
        } else {
            const transactionData: Transaction = {
                id,
                amount: parseFloat(formState.amount),
                note: formState.note,
                category: formState.category,
                type: formState.type,
                date: transactionDateTime.toISOString(),
                paidTo: formState.type === 'expense' ? formState.paidTo || 'Unknown Recipient' : null,
                paidBy: formState.type === 'income' ? formState.paidBy || 'Unknown Payer' : null,
                fromAccount: formState.fromAccount ? { id: formState.fromAccount.id, name: formState.fromAccount.name } : undefined,
                toAccount: formState.toAccount ? { id: formState.toAccount.id, name: formState.toAccount.name } : undefined,
                mode: formState.type === 'transfer' || formState.type === 'investment' ? 'Transfer' : formState.selectedAccount?.name || '',
                createdAt: currentTransaction?.createdAt || Date.now().toString(),
                lastModified: Date.now().toString(),
                source: formState.source,
                recurringId: formState.recurringId,
            };

            if (editMode === 'true') {
                const result = await updateTransaction(transactionData);

                // Smart Category Update detection
                if (result && 'similarTransactions' in result && result.similarTransactions.length > 0) {
                    const similarCount = result.similarTransactions.length;
                    Alert.alert(
                        "Smart Update Found",
                        `We found ${similarCount} similar transactions with the same ${transactionData.type === 'income' ? 'payer' : 'payee'}. Would you like to update their categories to "${transactionData.category.name}" as well?`,
                        [
                            { text: "No", onPress: () => router.back() },
                            {
                                text: "Yes, Update All",
                                onPress: async () => {
                                    const { updateCategoryForSimilarPayeeTransactions } = useTransactionStore.getState();
                                    await updateCategoryForSimilarPayeeTransactions(result.similarTransactions, transactionData.category);
                                    router.back();
                                }
                            }
                        ]
                    );
                    return; // Don't back yet, wait for Alert choice
                }
            } else {
                await saveTransaction(transactionData);
            }
            router.back();
        }
    }, [formState, isRecurringState, recurringSchedule, editMode, transactionId, currentTransaction, currentRecurring, router, saveTransaction, updateTransaction, saveRecurringTransaction, updateRecurringTransaction]);

    const handleStartDateConfirm = (date: Date) => {
        setRecurringSchedule(prev => ({ ...prev, startDate: date.toISOString() }));
        setShowStartDatePicker(false);
    };

    const handleEndDateConfirm = (date: Date) => {
        setRecurringSchedule(prev => ({ ...prev, endDate: date.toISOString() }));
        setShowEndDatePicker(false);
    };

    const handleDateConfirm = (date: Date) => {
        handleFormChange('date', date);
        setShowDatePicker(false);
    };

    const handleTimeConfirm = (time: Date) => {
        handleFormChange('time', format(time, 'HH:mm'));
        setShowTimePicker(false);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme === 'dark' ? darkTheme.background : lightTheme.card }}>
            <Header showBack title='' transparent={true} />
            <ScrollView style={[styles.container]} showsVerticalScrollIndicator={false}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    {/* Transaction Type Card */}

                    <TouchableOpacity
                        style={[styles.typeCard, { justifyContent: 'flex-start' }]}
                        onPress={() => typeBottomSheetRef.current?.present()}
                    >
                        <ThemedText style={[styles.typeCardText, { color: colors.text }]}>
                            {editMode == 'edit' ? 'Edit Transaction ' : 'New Transaction '}
                        </ThemedText>
                        <View style={[styles.typeCardContent, {
                            backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background,
                            paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8
                        }]}>
                            <View style={[styles.typeCardContent, { gap: 6 }]}>

                                <ThemedText style={[styles.typeCardText, {
                                    color: formState.type === 'income' ? colors.income :
                                        formState.type === 'expense' ? colors.expense :
                                            colors.primary
                                }]}>
                                    {formState.type.charAt(0).toUpperCase() + formState.type.slice(1)}
                                </ThemedText>
                                <Ionicons
                                    name={
                                        formState.type === 'income' ? 'arrow-down-circle' :
                                            formState.type === 'expense' ? 'arrow-up-circle' :
                                                'swap-horizontal'
                                    }
                                    size={24}
                                    color={
                                        formState.type === 'income' ? colors.income :
                                            formState.type === 'expense' ? colors.expense :
                                                colors.primary
                                    }
                                />
                            </View>
                            <Feather name="chevron-down" size={20} color={colors.text} />
                        </View>
                    </TouchableOpacity>

                    {/* Amount Input */}
                    <View style={[styles.amountContainer, { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background }]}>
                        <Text style={[styles.currencySymbol, { color: colors.text }]}>₹</Text>
                        <TextInput
                            ref={amountInputRef}
                            style={[styles.amountInput, { color: colors.text }]}
                            placeholder="0.00"
                            placeholderTextColor={colors.subtitle}
                            keyboardType="numeric"
                            value={formState.amount}
                            onChangeText={validateAmount}
                            maxLength={10}
                        />
                        <ReceiptScanner onImageCaptured={(uri) => {
                            setFormState(prev => ({ ...prev, attachments: [{ type: 'image', url: uri }] }));
                        }} />
                    </View>

                    {/* Date and Time Selection */}
                    <View style={styles.dateTimeRow}>
                        <TouchableOpacity
                            style={[styles.dateTimeField, { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <View style={styles.inputFieldContent}>
                                <Feather name="calendar" size={18} color={colors.primary} />
                                <ThemedText style={{ color: colors.text }}>
                                    {format(formState.date, 'MMM d, yyyy')}
                                </ThemedText>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.dateTimeField, { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background }]}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <View style={styles.inputFieldContent}>
                                <Feather name="clock" size={18} color={colors.primary} />
                                <ThemedText style={{ color: colors.text }}>
                                    {formState.time}
                                </ThemedText>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Category Selection */}
                    <TouchableOpacity
                        style={[styles.inputField, { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background, borderWidth: 1, borderColor: colors.border }]}
                        onPress={() => setBottomSheetState(true)}
                    >
                        <View style={styles.inputFieldContent}>
                            {formState.category ? (
                                <>
                                    <Text style={{ fontSize: 20, marginRight: 8 }}>{formState.category.icon}</Text>
                                    <ThemedText style={{ color: colors.text }}>{formState.category.name}</ThemedText>
                                </>
                            ) : (
                                <ThemedText style={{ color: colors.subtitle }}>Select Category</ThemedText>
                            )}
                        </View>
                        <Feather name="chevron-right" size={20} color={colors.subtitle} />
                    </TouchableOpacity>

                    {/* Conditional Fields based on transaction type */}
                    {formState.type === 'transfer' || formState.type === 'investment' ? (
                        <>
                            <View style={[styles.inputField, { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background, borderWidth: 1, borderColor: colors.border }]}>
                                <Text style={{ color: colors.subtitle, paddingRight: 8 }}>From</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {accounts.map(acc => (
                                        <TouchableOpacity
                                            key={acc.id}
                                            onPress={() => handleFormChange('fromAccount', acc)}
                                            style={[styles.accountButton, formState.fromAccount?.id === acc.id && { borderColor: colors.primary, borderWidth: 2 }]}
                                        >
                                            <ThemedText style={styles.accountText}>{acc.name}</ThemedText>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                            <View style={[styles.inputField, { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background, borderWidth: 1, borderColor: colors.border }]}>
                                <Text style={{ color: colors.subtitle, paddingRight: 8 }}>To</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {accounts.map(acc => (
                                        <TouchableOpacity
                                            key={acc.id}
                                            onPress={() => handleFormChange('toAccount', acc)}
                                            style={[styles.accountButton, formState.toAccount?.id === acc.id && { borderColor: colors.primary, borderWidth: 2 }]}
                                        >
                                            <ThemedText style={styles.accountText}>{acc.name}</ThemedText>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </>
                    ) : (
                        <>
                            <TextInput
                                style={[styles.inputField, { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background, borderWidth: 1, borderColor: colors.border, color: colors.text }]}
                                placeholder={formState.type === 'income' ? 'Received From' : 'Paid To'}
                                placeholderTextColor={colors.subtitle}
                                value={formState.type === 'income' ? formState.paidBy : formState.paidTo}
                                onChangeText={text => handleFormChange(formState.type === 'income' ? 'paidBy' : 'paidTo', text)}
                            />
                            {/* Account Selection for Income/Expense */}
                            <ScrollView horizontal style={styles.accountContainer} showsHorizontalScrollIndicator={false}>
                                {accounts.map(item => (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => handleFormChange('selectedAccount', item)}
                                        style={[
                                            styles.accountButton,
                                            { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background, borderWidth: 1, borderColor: colors.border },
                                            formState.selectedAccount?.id === item.id && { borderColor: colors.primary, borderWidth: 2 }
                                        ]}
                                    >
                                        <ThemedText style={styles.accountText}>{item.name}</ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </>
                    )}

                    {/* Note Input */}
                    <TextInput
                        style={[styles.noteInput, { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background, borderWidth: 1, borderColor: colors.border, color: colors.text }]}
                        placeholder="Add a note"
                        placeholderTextColor={colors.subtitle}
                        value={formState.note}
                        onChangeText={text => handleFormChange('note', text)}
                        multiline
                        numberOfLines={6}
                    />

                    {/* Recurring Transaction Section */}
                    <View style={[styles.recurringCard, { backgroundColor: colors.card }]}>
                        <View style={styles.recurringHeader}>
                            <ThemedText>Repeat Transaction</ThemedText>
                            <Switch
                                value={isRecurringState}
                                onValueChange={setIsRecurringState}
                                trackColor={{ false: colors.border, true: colors.primary }}
                                thumbColor={colors.card}
                            />
                        </View>

                        {isRecurringState && (
                            <View style={styles.recurringOptions}>
                                <TouchableOpacity
                                    style={[styles.recurringField, { backgroundColor: colors.background }]}
                                    onPress={() => frequencyBottomSheetRef.current?.present()}
                                >
                                    <ThemedText style={{ color: colors.text }}>
                                        Repeat {recurringSchedule.frequency}
                                    </ThemedText>
                                    <Feather name="chevron-right" size={20} color={colors.text} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.recurringField, { backgroundColor: colors.background }]}
                                    onPress={() => setShowStartDatePicker(true)}
                                >
                                    <ThemedText style={{ color: colors.text }}>
                                        Starts {format(new Date(recurringSchedule.startDate), 'MMM d, yyyy')}
                                    </ThemedText>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.recurringField, { backgroundColor: colors.background }]}
                                    onPress={() => setShowEndDatePicker(true)}
                                >
                                    <ThemedText style={{ color: recurringSchedule.endDate ? colors.text : colors.subtitle }}>
                                        {recurringSchedule.endDate ?
                                            `Ends ${format(new Date(recurringSchedule.endDate), 'MMM d, yyyy')}` :
                                            'No end date'}
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Add bottom padding for scroll */}
                    <View style={{ height: 100 }} />
                </KeyboardAvoidingView>
            </ScrollView>

            {/* Save Button */}
            <View style={styles.saveButtonContainer}>
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                        if (!formState.category) {
                            setBottomSheetState(true);
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

            {/* Bottom Sheets */}
            <TransactionTypeBottomSheet
                bottomSheetRef={typeBottomSheetRef}
                selectedType={formState.type}
                onSelectType={(type) => handleFormChange('type', type)}
                colors={colors}
            />

            <RecurringFrequencyBottomSheet
                bottomSheetRef={frequencyBottomSheetRef}
                selectedFrequency={recurringSchedule.frequency}
                onSelectFrequency={(frequency) => setRecurringSchedule(prev => ({ ...prev, frequency }))}
                colors={colors}
            />

            <CategoryBottomSheet
                onSelectCategory={cat => handleFormChange('category', cat)}
                isVisible={bottomSheetState}
                onClose={() => setBottomSheetState(false)}
                type={formState.type}
                setType={type => handleFormChange('type', type)}
            />

            {/* Date Pickers */}
            <DateTimePickerModal
                isVisible={showDatePicker}
                mode="date"
                date={formState.date}
                onConfirm={handleDateConfirm}
                onCancel={() => setShowDatePicker(false)}
            />
            <DateTimePickerModal
                isVisible={showTimePicker}
                mode="time"
                date={new Date(`1970-01-01T${formState.time}:00`)}
                onConfirm={handleTimeConfirm}
                onCancel={() => setShowTimePicker(false)}
            />
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    dateTimeRow: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 12,
        gap: 12,
    },
    dateTimeField: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
    },
    typeCard: {
        margin: 16,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    typeCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    typeCardText: {
        fontSize: 18,
        fontWeight: '600',
    },
    amountContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 20,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    currencySymbol: {
        fontSize: 32,
        fontWeight: '600',
        marginRight: 8,
    },
    amountInput: {
        flex: 1,
        fontSize: 32,
        fontWeight: '600',
    },
    inputField: {
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 2,
    },
    inputFieldContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    noteInput: {
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        minHeight: 80,
    },
    accountContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    accountButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 10,
    },
    accountText: {
        fontSize: 14,
    },
    recurringCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
    },
    recurringHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    recurringOptions: {
        marginTop: 16,
        gap: 12,
    },
    recurringField: {
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    saveButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 32,
        backgroundColor: 'transparent',
    },
    saveButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    bottomSheetContent: {
        padding: 20,
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    typeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        gap: 16,
    },
    typeOptionText: {
        fontSize: 16,
        fontWeight: '500',
    },
    frequencyOption: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    frequencyOptionText: {
        fontSize: 16,
        textAlign: 'center',
    },
});

export default TransactionFormScreen;