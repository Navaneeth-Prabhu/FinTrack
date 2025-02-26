import { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { Category, Transaction, RecurringTransaction } from '@/types';

const transactionTypes = [
    { id: '1', name: 'Cash', type: 'Bank' },
    { id: '2', name: 'HDFC', type: 'Bank' },
    { id: '3', name: 'Axis', type: 'Bank' },
];

const INITIAL_FORM_STATE = {
    amount: '',
    note: '',
    category: null,
    transactionType: transactionTypes[0],
    type: 'expense',
    date: new Date(),
    paidTo: '',
    paidBy: '',
    selectedTags: '',
    source: { type: "manual" },
    recurringId: undefined,
    attachments: undefined,
};

export const useTransactionForm = ({
    editMode,
    isRecurring,
    transactionId,
    currentTransaction,
    currentRecurring,
    saveTransaction,
    updateTransaction,
    saveRecurringTransaction,
    updateRecurringTransaction,
    recurringTransactions,
    router
}) => {
    // States
    const [formState, setFormState] = useState(INITIAL_FORM_STATE);
    const [isMoreVisible, setIsMoreVisible] = useState(false);
    const [bottomSheetState, setBottomSheetState] = useState(false);
    const [isRecurringState, setIsRecurringState] = useState(isRecurring);
    const [recurringSchedule, setRecurringSchedule] = useState({
        frequency: 'monthly',
        startDate: new Date().toISOString(),
        endDate: null,
        time: format(new Date(), 'HH:mm'),
        interval: 1,
    });

    // Load existing transaction data for editing
    useEffect(() => {
        if (editMode) {
            if (isRecurring && currentRecurring) {
                setFormState({
                    amount: currentRecurring.amount.toString(),
                    note: currentRecurring.description || '',
                    category: currentRecurring.category,
                    type: currentRecurring.type,
                    date: new Date(currentRecurring.startDate),
                    paidTo: currentRecurring.payee || '',
                    paidBy: '',
                    selectedTags: '',
                    transactionType: transactionTypes.find(t => t.name === currentRecurring.mode) || transactionTypes[0],
                    source: { type: 'manual' },
                    recurringId: currentRecurring.id,
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
                    type: currentTransaction.type,
                    date: new Date(currentTransaction.date),
                    paidTo: currentTransaction.paidTo || '',
                    paidBy: currentTransaction.paidBy || '',
                    transactionType: transactionTypes.find(t => t.name === currentTransaction.mode) || transactionTypes[0],
                    source: currentTransaction.source,
                    recurringId: currentTransaction.recurringId,
                    selectedTags: '',
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

    // Form handlers
    const handleFormChange = useCallback((field, value) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    }, []);

    const validateAmount = useCallback((input) => {
        const regex = /^[0-9]*\.?[0-9]*$/;
        if (regex.test(input)) {
            handleFormChange('amount', input);
        }
    }, [handleFormChange]);

    // Submit handler
    const handleSubmit = useCallback(async () => {
        if (!formState.category || !formState.amount) return;

        const id = editMode ? transactionId : Date.now().toString();

        if (isRecurring || (isRecurringState && !currentTransaction)) {
            const recurringData = {
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
            editMode
                ? await updateRecurringTransaction(recurringData)
                : await saveRecurringTransaction(recurringData);
        } else {
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
                createdAt: currentTransaction?.createdAt || Date.now().toString(),
                lastModified: Date.now().toString(),
                source: formState.source,
                recurringId: formState.recurringId,
            };
            editMode
                ? await updateTransaction(transactionData)
                : await saveTransaction(transactionData);
        }
        router.back();
    }, [
        formState,
        isRecurringState,
        recurringSchedule,
        editMode,
        transactionId,
        currentTransaction,
        currentRecurring,
        isRecurring,
        router,
        saveTransaction,
        updateTransaction,
        saveRecurringTransaction,
        updateRecurringTransaction
    ]);

    return {
        formState,
        handleFormChange,
        isRecurringState,
        setIsRecurringState,
        recurringSchedule,
        setRecurringSchedule,
        isMoreVisible,
        setIsMoreVisible,
        bottomSheetState,
        setBottomSheetState,
        validateAmount,
        handleSubmit,
        transactionTypes
    };
};