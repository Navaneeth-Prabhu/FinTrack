import React, { useCallback, useEffect, useRef, useMemo, useReducer } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Switch, Alert, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons, Feather } from '@expo/vector-icons';
import ReceiptScanner from '@/components/ReceiptScanner';
import { useTransactionStore } from '@/stores/transactionStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { Category, RecurringTransaction, Transaction, Account } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/common/ThemedText';
import CategoryBottomSheet from '@/components/bottomSheet/categoryBottomSheet';
import { Header } from '@/components/layout/Header';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecurringTransactionStore } from '@/stores/recurringTransactionStore';
import { format } from 'date-fns';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { darkTheme, lightTheme } from '@/constants/theme';
import usePreferenceStore from '@/stores/preferenceStore';
import { useAccountStore } from '@/stores/accountStore';
import TransactionTypeBottomSheet from '@/components/bottomSheet/transactionTypeBottomSheet';
import RecurringFrequencyBottomSheet from '@/components/bottomSheet/recurringFrequencyBottomSheet';

type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';
type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

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

interface FullState {
    form: FormState;
    isRecurring: boolean;
    recurringSchedule: {
        frequency: RecurringFrequency;
        startDate: string;
        endDate: string | null;
        interval: number;
    };
    ui: {
        categorySheetVisible: boolean;
        showStartDatePicker: boolean;
        showEndDatePicker: boolean;
        showDatePicker: boolean;
        showTimePicker: boolean;
    };
}

type Action =
    | { type: 'SET_FORM_FIELD', field: keyof FormState, value: any }
    | { type: 'SET_RECURRING', isRecurring: boolean }
    | { type: 'SET_RECURRING_FIELD', field: string, value: any }
    | { type: 'SET_UI_FIELD', field: string, value: boolean }
    | { type: 'LOAD_FORM', state: Partial<FullState> };

const initialFullState: FullState = {
    form: {
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
    },
    isRecurring: false,
    recurringSchedule: {
        frequency: 'monthly',
        startDate: new Date().toISOString(),
        endDate: null,
        interval: 1,
    },
    ui: {
        categorySheetVisible: false,
        showStartDatePicker: false,
        showEndDatePicker: false,
        showDatePicker: false,
        showTimePicker: false,
    }
};

function reducer(state: FullState, action: Action): FullState {
    switch (action.type) {
        case 'SET_FORM_FIELD':
            return {
                ...state,
                form: { ...state.form, [action.field]: action.value }
            };
        case 'SET_RECURRING':
            return {
                ...state,
                isRecurring: action.isRecurring
            };
        case 'SET_RECURRING_FIELD':
            return {
                ...state,
                recurringSchedule: { ...state.recurringSchedule, [action.field]: action.value }
            };
        case 'SET_UI_FIELD':
            return {
                ...state,
                ui: { ...state.ui, [action.field]: action.value }
            };
        case 'LOAD_FORM':
            return {
                ...state,
                ...action.state,
                form: { ...state.form, ...action.state.form },
                recurringSchedule: { ...state.recurringSchedule, ...action.state.recurringSchedule },
                ui: { ...state.ui, ...action.state.ui }
            };
        default:
            return state;
    }
}

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
    const { recurringTransactions, saveRecurringTransaction, updateRecurringTransaction } = useRecurringTransactionStore();

    const [state, dispatch] = useReducer(reducer, {
        ...initialFullState,
        isRecurring: isRecurring === 'true'
    });

    const { form: formState, isRecurring: isRecurringState, recurringSchedule, ui } = state;

    const currentTransaction = useMemo(() =>
        transactions.find(t => t.id === transactionId), [transactionId, transactions]
    );
    const currentRecurring = useMemo(() =>
        recurringTransactions.find(r => r.id === transactionId), [transactionId, recurringTransactions]
    );

    // Load existing transaction data for editing
    useEffect(() => {
        if (editMode === 'true') {
            if (isRecurring === 'true' && currentRecurring) {
                dispatch({
                    type: 'LOAD_FORM',
                    state: {
                        form: {
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
                        },
                        isRecurring: true,
                        recurringSchedule: {
                            frequency: currentRecurring.frequency,
                            startDate: currentRecurring.startDate,
                            endDate: currentRecurring.endDate || null,
                            interval: currentRecurring.interval,
                        }
                    }
                });
            } else if (currentTransaction) {
                const transactionDate = new Date(currentTransaction.date);
                dispatch({
                    type: 'LOAD_FORM',
                    state: {
                        form: {
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
                        },
                        isRecurring: !!currentTransaction.recurringId
                    }
                });
            }
        }
    }, [editMode, currentTransaction, currentRecurring, isRecurring, accounts]);

    // Auto-select category for Transfer or Investment
    useEffect(() => {
        if (formState.type === 'transfer') {
            const transferCat = categories.find(c => c.type === 'transfer');
            if (transferCat && formState.category?.id !== transferCat.id) {
                dispatch({ type: 'SET_FORM_FIELD', field: 'category', value: transferCat });
            }
        } else if (formState.type === 'investment') {
            const investCat = categories.find(c => c.type === 'investment');
            if (investCat && formState.category?.id !== investCat.id) {
                dispatch({ type: 'SET_FORM_FIELD', field: 'category', value: investCat });
            }
        }
    }, [formState.type, categories]);

    const handleFormChange = useCallback((field: keyof FormState, value: any) => {
        dispatch({ type: 'SET_FORM_FIELD', field, value });
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
            if (!formState.category) dispatch({ type: 'SET_UI_FIELD', field: 'categorySheetVisible', value: true });
            else if (isNaN(floatAmount) || floatAmount <= 0) amountInputRef.current?.focus();
            return;
        }

        const id = editMode === 'true' ? (transactionId as string) : Date.now().toString();
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
                time: format(new Date(), 'HH:mm'),
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
                    return;
                }
            } else {
                await saveTransaction(transactionData);
            }
            router.back();
        }
    }, [formState, isRecurringState, recurringSchedule, editMode, transactionId, currentTransaction, currentRecurring, router, saveTransaction, updateTransaction, saveRecurringTransaction, updateRecurringTransaction]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme === 'dark' ? darkTheme.background : lightTheme.card }}>
            <Header showBack title="" transparent={true} />
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <TouchableOpacity
                        style={styles.typeCard}
                        onPress={() => typeBottomSheetRef.current?.present()}
                    >
                        <ThemedText style={styles.typeCardText}>
                            {editMode === 'true' ? 'Edit Transaction ' : 'New Transaction '}
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

                    <View style={[styles.amountContainer, { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background }]}>
                        <ThemedText style={styles.currencySymbol}>₹</ThemedText>
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
                            dispatch({ type: 'SET_FORM_FIELD', field: 'attachments', value: [{ type: 'image', url: uri }] });
                        }} />
                    </View>

                    <View style={styles.dateTimeRow}>
                        <TouchableOpacity
                            style={[styles.dateTimeField, { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background }]}
                            onPress={() => dispatch({ type: 'SET_UI_FIELD', field: 'showDatePicker', value: true })}
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
                            onPress={() => dispatch({ type: 'SET_UI_FIELD', field: 'showTimePicker', value: true })}
                        >
                            <View style={styles.inputFieldContent}>
                                <Feather name="clock" size={18} color={colors.primary} />
                                <ThemedText style={{ color: colors.text }}>
                                    {formState.time}
                                </ThemedText>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.inputField, { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background, borderWidth: 1, borderColor: colors.border }]}
                        onPress={() => dispatch({ type: 'SET_UI_FIELD', field: 'categorySheetVisible', value: true })}
                    >
                        <View style={styles.inputFieldContent}>
                            {formState.category ? (
                                <>
                                    <ThemedText style={{ fontSize: 20, marginRight: 8 }}>{formState.category.icon}</ThemedText>
                                    <ThemedText style={{ color: colors.text }}>{formState.category.name}</ThemedText>
                                </>
                            ) : (
                                <ThemedText style={{ color: colors.subtitle }}>Select Category</ThemedText>
                            )}
                        </View>
                        <Feather name="chevron-right" size={20} color={colors.subtitle} />
                    </TouchableOpacity>

                    {formState.type === 'transfer' || formState.type === 'investment' ? (
                        <>
                            <View style={[styles.inputField, { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background, borderWidth: 1, borderColor: colors.border }]}>
                                <ThemedText style={{ color: colors.subtitle, paddingRight: 8 }}>From</ThemedText>
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
                                <ThemedText style={{ color: colors.subtitle, paddingRight: 8 }}>To</ThemedText>
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

                    <TextInput
                        style={[styles.noteInput, { backgroundColor: theme === 'dark' ? darkTheme.card : lightTheme.background, borderWidth: 1, borderColor: colors.border, color: colors.text }]}
                        placeholder="Add a note"
                        placeholderTextColor={colors.subtitle}
                        value={formState.note}
                        onChangeText={text => handleFormChange('note', text)}
                        multiline
                        numberOfLines={6}
                    />

                    <View style={[styles.recurringCard, { backgroundColor: colors.card }]}>
                        <View style={styles.recurringHeader}>
                            <ThemedText>Repeat Transaction</ThemedText>
                            <Switch
                                value={isRecurringState}
                                onValueChange={(val) => dispatch({ type: 'SET_RECURRING', isRecurring: val })}
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
                                    onPress={() => dispatch({ type: 'SET_UI_FIELD', field: 'showStartDatePicker', value: true })}
                                >
                                    <ThemedText style={{ color: colors.text }}>
                                        Starts {format(new Date(recurringSchedule.startDate), 'MMM d, yyyy')}
                                    </ThemedText>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.recurringField, { backgroundColor: colors.background }]}
                                    onPress={() => dispatch({ type: 'SET_UI_FIELD', field: 'showEndDatePicker', value: true })}
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
                    <View style={{ height: 100 }} />
                </KeyboardAvoidingView>
            </ScrollView>

            <View style={styles.saveButtonContainer}>
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                        if (!formState.category) {
                            dispatch({ type: 'SET_UI_FIELD', field: 'categorySheetVisible', value: true });
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

            <TransactionTypeBottomSheet
                bottomSheetRef={typeBottomSheetRef}
                selectedType={formState.type}
                onSelectType={(type) => handleFormChange('type', type)}
                colors={colors}
            />

            <RecurringFrequencyBottomSheet
                bottomSheetRef={frequencyBottomSheetRef}
                selectedFrequency={recurringSchedule.frequency}
                onSelectFrequency={(frequency) => dispatch({ type: 'SET_RECURRING_FIELD', field: 'frequency', value: frequency })}
                colors={colors}
            />

            <CategoryBottomSheet
                onSelectCategory={cat => handleFormChange('category', cat)}
                isVisible={ui.categorySheetVisible}
                onClose={() => dispatch({ type: 'SET_UI_FIELD', field: 'categorySheetVisible', value: false })}
                type={formState.type}
                setType={type => handleFormChange('type', type)}
            />

            <DateTimePickerModal
                isVisible={ui.showDatePicker}
                mode="date"
                date={formState.date}
                onConfirm={(date) => {
                    handleFormChange('date', date);
                    dispatch({ type: 'SET_UI_FIELD', field: 'showDatePicker', value: false });
                }}
                onCancel={() => dispatch({ type: 'SET_UI_FIELD', field: 'showDatePicker', value: false })}
            />
            <DateTimePickerModal
                isVisible={ui.showTimePicker}
                mode="time"
                date={new Date(`1970-01-01T${formState.time}:00`)}
                onConfirm={(time) => {
                    handleFormChange('time', format(time, 'HH:mm'));
                    dispatch({ type: 'SET_UI_FIELD', field: 'showTimePicker', value: false });
                }}
                onCancel={() => dispatch({ type: 'SET_UI_FIELD', field: 'showTimePicker', value: false })}
            />
            <DateTimePickerModal
                isVisible={ui.showStartDatePicker}
                mode="date"
                date={new Date(recurringSchedule.startDate)}
                onConfirm={(date) => {
                    dispatch({ type: 'SET_RECURRING_FIELD', field: 'startDate', value: date.toISOString() });
                    dispatch({ type: 'SET_UI_FIELD', field: 'showStartDatePicker', value: false });
                }}
                onCancel={() => dispatch({ type: 'SET_UI_FIELD', field: 'showStartDatePicker', value: false })}
            />
            <DateTimePickerModal
                isVisible={ui.showEndDatePicker}
                mode="date"
                date={recurringSchedule.endDate ? new Date(recurringSchedule.endDate) : new Date()}
                onConfirm={(date) => {
                    dispatch({ type: 'SET_RECURRING_FIELD', field: 'endDate', value: date.toISOString() });
                    dispatch({ type: 'SET_UI_FIELD', field: 'showEndDatePicker', value: false });
                }}
                onCancel={() => dispatch({ type: 'SET_UI_FIELD', field: 'showEndDatePicker', value: false })}
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
});

export default TransactionFormScreen;