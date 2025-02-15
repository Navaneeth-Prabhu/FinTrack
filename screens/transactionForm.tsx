import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard, ScrollView, Image, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
// import CustomDateTimePicker from '@/src/components/CustomDateTimePicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
// import * as ImagePicker from 'expo-image-picker';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
// import OfflineTransactionScanner from '@/src/components/OfflineTransactionScanner';
import { Category } from '@/types';
import { useTransactionStore } from '@/stores/transactionStore';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/common/ThemedText';
import CategoryBottomSheet from '@/components/bottomSheet/categoryBottomSheet';


interface mode {
    id: string;
    name?: string; // Axis, Hdfc
    type: string; // Manual, Bank
}

interface RecurringScheduleType {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    startDate: Date;
    endDate?: Date;
    dayOfMonth?: number;
}

const transactionTypes = [
    { id: '1', name: 'Cash', type: 'Bank' },
    { id: '2', name: 'HDFC', type: 'Bank' },
    { id: '3', name: 'Axis', type: 'Bank' },
];

const tags = ['Friends', 'Online', 'Office', 'Family', 'School'];

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

const INITIAL_RECURRING_SCHEDULE: RecurringScheduleType = {
    frequency: 'monthly',
    interval: 1,
    startDate: new Date(),
    endDate: undefined,
    dayOfMonth: undefined,
};
export const TransactionForm: React.FC = () => {
    const router = useRouter();
    const { colors } = useTheme();
    const { editMode, transactionId, recurringId } = useLocalSearchParams();
    const amountInputRef = useRef<TextInput>(null);
    const [showScanner, setShowScanner] = useState(false);
    const { transactions, saveTransaction, updateTransaction } = useTransactionStore();

    const detailAnimatedStyle = useAnimatedStyle(() => {
        return {
            // transform: [
            //   {
            //     scale: interpolate(
            //       animatedValue.value,
            //       [0, 1],
            //       [0.5, 1],
            //       Extrapolation.CLAMP
            //     )
            //   }
            // ],
            // opacity: interpolate(
            //   animatedValue.value,
            //   [0, 1],
            //   [0, 1],
            //   Extrapolation.CLAMP
            // )
        };
    });
    // States
    const [formState, setFormState] = useState(INITIAL_FORM_STATE);
    const [isMoreVisible, setIsMoreVisible] = useState(false);
    const [bottomSheetState, setBottomSheetState] = useState(false);
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringSchedule, setRecurringSchedule] = useState<RecurringScheduleType>(INITIAL_RECURRING_SCHEDULE);

    // Calculate next processing date
    const calculateNextProcessingDate = useMemo(() => {
        return (schedule: RecurringScheduleType): Date => {
            const nextDate = new Date(schedule.startDate);

            switch (schedule.frequency) {
                case 'daily':
                    nextDate.setDate(nextDate.getDate() + schedule.interval);
                    break;
                case 'weekly':
                    nextDate.setDate(nextDate.getDate() + (schedule.interval * 7));
                    break;
                case 'monthly':
                    nextDate.setMonth(nextDate.getMonth() + schedule.interval);
                    if (schedule.dayOfMonth) {
                        nextDate.setDate(schedule.dayOfMonth);
                    }
                    break;
                case 'yearly':
                    nextDate.setFullYear(nextDate.getFullYear() + schedule.interval);
                    break;
            }
            return nextDate;
        };
    }, []);


    // Selectors
    const currentTransaction = transactionId ? transactions.find(t => t.id === transactionId) : null;

    // Load existing transaction data for editing
    useEffect(() => {
        if (editMode && currentTransaction) {
            setFormState(prevState => ({
                ...prevState,
                amount: currentTransaction.amount.toString(),
                note: currentTransaction.note || '',
                category: currentTransaction.category,
                type: currentTransaction.type,
                date: new Date(currentTransaction.date),
                paidTo: currentTransaction.paidTo || '',
                paidBy: currentTransaction.paidBy || '',
                selectedTags: currentTransaction.tags || '',
                transactionType: currentTransaction.mode || transactionTypes[0],
            }));
        }
    }, [editMode, currentTransaction]);

    // Load existing recurring data
    // useEffect(() => {
    //     if (editMode && currentRecurring) {
    //         setIsRecurring(true);
    //         setRecurringSchedule({
    //             frequency: currentRecurring.frequency || 'monthly',
    //             interval: currentRecurring.interval,
    //             startDate: new Date(currentRecurring.start_date),
    //             endDate: currentRecurring.end_date ? new Date(currentRecurring.end_date) : undefined,
    //             dayOfMonth: currentRecurring.day_of_month || undefined,
    //         });
    //     }
    // }, [editMode, currentRecurring]);

    // Show category bottom sheet if no category selected
    useEffect(() => {
        if (!formState.category && !bottomSheetState) {
            const timer = setTimeout(() => {
                setBottomSheetState(prev => ({ ...prev, isCategoryVisible: true }));
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

    const pickImage = async () => {
        // const result = await ImagePicker.launchImageLibraryAsync({
        //     mediaTypes: ImagePicker.MediaTypeOptions.Images,
        //     allowsEditing: true,
        //     aspect: [4, 3],
        //     quality: 1,
        // });

        // if (!result.canceled) {
        //     handleFormChange('attachment', result.assets[0].uri);
        // }
    };

    // Memoized submit handler
    const handleSubmit = useCallback(async () => {
        if (!formState.category || !formState.amount) {
            if (!formState.category) {
                setBottomSheetState(prev => ({ ...prev, isCategoryVisible: true }));
            } else {
                amountInputRef.current?.focus();
            }
            return;
        }

        try {
            Keyboard.dismiss();
            await new Promise(resolve => setTimeout(resolve, Platform.OS === 'ios' ? 300 : 100));

            const transactionData = {
                id: editMode ? (Array.isArray(transactionId) ? transactionId[0] : transactionId) : Date.now().toString(),
                amount: parseFloat(formState.amount),
                note: formState.note,
                category: formState.category,
                type: formState.type,
                date: formState.date.toISOString(),
                paidTo: formState.type === 'expense' ? formState.paidTo || 'Unknown Recipient' : undefined,
                paidBy: formState.type === 'income' ? formState.paidBy || 'Unknown Payer' : undefined,
                mode: formState.transactionType,
                createdAt: editMode ? (Array.isArray(currentTransaction?.createdAt) ? currentTransaction?.createdAt[0] : transactionId) : Date.now().toString(),
                lastModified: Date.now().toString(),
                source: { type: 'manual' },
            };


            const savedTransaction = await dispatch(editMode ? updateTransaction(transactionData) : saveTransaction(transactionData)).unwrap();

            // if (isRecurring) {
            //     const recurringData: RecurringSchedule = {
            //         id: editMode ? recurringId : Date.now().toString(),
            //         transaction_id: savedTransaction.id,
            //         frequency: recurringSchedule.frequency,
            //         interval: recurringSchedule.interval,
            //         start_date: recurringSchedule.startDate.toISOString(),
            //         end_date: recurringSchedule.endDate?.toISOString(),
            //         day_of_month: recurringSchedule.dayOfMonth,
            //         next_processing_date: calculateNextProcessingDate(recurringSchedule).toISOString(),
            //         status: 'active',
            //     };

            //     await dispatch(
            //         editMode ? updateRecurringTransaction(recurringData) : saveRecurringTransaction(recurringData)
            //     ).unwrap();

            //     if (isRecurring) {
            //         const recurringData: RecurringSchedule = {
            //             id: editMode ? recurringId : Date.now().toString(),
            //             transaction_id: savedTransaction.id,
            //             frequency: recurringSchedule.frequency,
            //             interval: recurringSchedule.interval,
            //             start_date: recurringSchedule.startDate.toISOString(),
            //             end_date: recurringSchedule.endDate?.toISOString(),
            //             day_of_month: recurringSchedule.dayOfMonth,
            //             next_processing_date: calculateNextProcessingDate(recurringSchedule).toISOString(),
            //             status: 'active',
            //         };

            //         await dispatch(
            //             editMode ? updateRecurringTransaction(recurringData) : saveRecurringTransaction(recurringData)
            //         ).unwrap();
            //     }

            //     router.back();
            // } catch (error) {
            //     console.error('Failed to save transaction:', error);
            }
        }, [formState, editMode, transactionId, recurringId, isRecurring, recurringSchedule, currentTransaction, dispatch, router]);

    const handleAmountDetected = (detectedAmount) => {
        // setAmount(detectedAmount);
        console.log(detectedAmount);
        setShowScanner(false);
    };

    return (
        <BottomSheetModalProvider>
            {/* {
                showScanner && (
                    <OfflineTransactionScanner
                        // onAmountDetected={handleAmountDetected}
                        onClose={() => setShowScanner(false)}
                    />
                )
            } */}
            <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                    {/* Type Selector */}
                    <Animated.View style={[styles.typeContainer,
                        detailAnimatedStyle]}>
                        <TouchableOpacity
                            style={[
                                styles.typeButton,
                                {
                                    backgroundColor: formState.type === 'income' ? colors.primary : colors.card,
                                    borderColor: colors.border
                                },
                            ]}
                            onPress={() => handleFormChange('type', 'income')}
                        >
                            <ThemedText
                                style={{ color: formState.type === 'income' ? 'white' : colors.text }}
                                variant={formState.type === 'income' ? 'semibold' : 'default'}
                            >
                                Income
                            </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.typeButton,
                                {
                                    backgroundColor: formState.type === 'expense' ? colors.primary : colors.card,
                                    borderColor: colors.border
                                },
                            ]}
                            onPress={() => handleFormChange('type', 'expense')}
                        >
                            <ThemedText
                                style={{ color: formState.type === 'expense' ? 'white' : colors.text }}
                                variant={formState.type === 'expense' ? 'semibold' : 'default'}
                            >
                                Expense
                            </ThemedText>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Category Selection */}
                    <TouchableOpacity
                        style={[styles.input, {
                            justifyContent: 'center',
                            borderColor: colors.border,
                            backgroundColor: colors.card
                        }]}
                        onPress={() => setBottomSheetState(prev => ({ ...prev, isCategoryVisible: true }))}
                    >
                        <Text style={{ color: formState.category ? colors.text : colors.subtitle }}>
                            {formState.category ? `${formState.category.icon} ${formState.category.name}` : 'Select Category'}
                        </Text>
                    </TouchableOpacity>

                    {/* Amount Input */}
                    <View style={[styles.amountContainer, { borderColor: colors.border }]}>
                        <ThemedText style={styles.currencySymbol}>₹</ThemedText>
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
                        <TouchableOpacity onPress={() => setShowScanner(true)} style={[styles.qrButton, { backgroundColor: colors.card }]}>
                            <Ionicons name="qr-code" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Date Picker */}
                    {/* <CustomDateTimePicker
                        value={formState.date}
                        onChange={(date) => handleFormChange('date', date)}
                    /> */}

                    {/* Paid By/To Input */}
                    <TextInput
                        style={[styles.input, {
                            color: colors.text,
                            borderColor: colors.border,
                            marginTop: 10
                        }]}
                        placeholder={formState.type === 'income' ? "Paid By" : "Paid To"}
                        placeholderTextColor={colors.text}
                        value={formState.type === 'income' ? formState.paidBy : formState.paidTo}
                        onChangeText={(text) =>
                            handleFormChange(formState.type === 'income' ? 'paidBy' : 'paidTo', text)
                        }
                    />

                    {/* Transaction Types Scroll */}
                    <ScrollView
                        horizontal
                        style={styles.transactionTypeContainer}
                        showsHorizontalScrollIndicator={false}
                    >
                        {transactionTypes.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => handleFormChange('transactionType', item)}
                                style={[
                                    styles.transactionTypeButton,
                                    // {
                                    //   backgroundColor: formState.transactionType.id === item.id ? colors.card : colors.background,
                                    //   borderColor: colors.border,
                                    // },
                                ]}
                            >
                                <ThemedText style={styles.transactionTypeText}>{item.name}</ThemedText>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[styles.addTransactionTypeButton, { borderColor: colors.border }]}
                        >
                            <Feather name="plus" size={18} color={colors.text} />
                        </TouchableOpacity>
                    </ScrollView>


                    {/* Add Recurring Transaction Section */}
                    <View style={styles.recurringSection}>
                        <View style={styles.recurringHeader}>
                            <ThemedText>Make this a recurring transaction</ThemedText>
                            <Switch
                                value={isRecurring}
                                onValueChange={() => setIsRecurring(!isRecurring)}
                            />
                        </View>

                        {/* {isRecurring && (
                            <RecurringFrequencySelector
                                recurringSchedule={recurringSchedule}
                                setRecurringSchedule={setRecurringSchedule} />
                        )} */}
                    </View>
                    {/* More Options */}
                    {isMoreVisible && (
                        <>
                            <TextInput
                                style={[styles.input, {
                                    color: colors.text,
                                    borderColor: colors.border
                                }]}
                                placeholder="Notes"
                                placeholderTextColor={colors.subtitle}
                                value={formState.note}
                                onChangeText={(text) => handleFormChange('note', text)}
                                multiline
                            />

                            <TouchableOpacity
                                style={[styles.input, {
                                    justifyContent: 'center',
                                    borderColor: colors.border,
                                    backgroundColor: colors.card
                                }]}
                                onPress={() => setBottomSheetState(prev => ({ ...prev, isTagsVisible: true }))}
                            >
                                {/* <Text style={{
                  color: formState.selectedTags.length > 0 ? colors.text : colors.subtitle
                }}>
                  {formState.selectedTags.length > 0 ? formState.selectedTags.join(', ') : 'Add Tags'}
                </Text> */}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.input, {
                                    justifyContent: 'center',
                                    borderColor: colors.border,
                                    backgroundColor: colors.card
                                }]}
                                onPress={pickImage}
                            >
                                <Text style={{ color: colors.text }}>
                                    {formState.attachment ? 'Image Added' : 'Add Attachment'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Show More/Less Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            flexDirection: 'row'
                        }]}
                        onPress={() => setIsMoreVisible(!isMoreVisible)}
                    >
                        <Text style={{ color: colors.text }}>
                            {isMoreVisible ? 'Show less' : 'Show more'}
                        </Text>
                        <Feather
                            name={isMoreVisible ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={colors.text}
                        />
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </ScrollView>

            {/* Save Button */}
            <View style={styles.saveButtonContainer}>
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={handleSubmit}
                >
                    <ThemedText style={{ color: 'white' }} variant="semibold">
                        {!formState.category
                            ? 'Select Category'
                            : !formState.amount
                                ? 'Add Amount'
                                : 'Save Transaction'}
                    </ThemedText>
                </TouchableOpacity>
            </View>

            {/* Category Bottom Sheet */}
            <CategoryBottomSheet
                onSelectCategory={(cat) => handleFormChange('category', cat)}
                isVisible={bottomSheetState}
                onClose={() => setBottomSheetState(false)}
                type={formState.type}
                setType={(type) => handleFormChange('type', type)}
            />
        </BottomSheetModalProvider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        paddingBottom: 10,
        marginBottom: 10,
    },
    currencySymbol: {
        fontSize: 24,
        paddingLeft: 10,
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
        marginBottom: 10,
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
    typeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        gap: 10
    },
    typeButton: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
    },
    submitButton: {
        width: '100%',
        padding: 15,
        alignItems: 'center',
        marginVertical: 10,
        borderRadius: 10,
    },
    saveButtonContainer: {
        position: 'absolute',
        width: '100%',
        padding: 20,
        paddingBottom: 32,
        alignItems: 'center',
        bottom: 0,
    },
    saveButton: {
        width: '100%',
        alignItems: 'center',
        height: 50,
        borderRadius: 10,
        justifyContent: 'center'
    },
    attachmentPreview: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
        marginBottom: 10,
        borderRadius: 10,
    },
    recurringSection: {
        marginTop: 16,
        marginBottom: 16,
    },
    recurringHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    recurringOptions: {
        marginTop: 8,
        padding: 16,
        borderRadius: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    picker: {
        flex: 1,
        marginLeft: 12,
        height: 40,
    },
    intervalInput: {
        width: 50,
        height: 40,
        borderWidth: 1,
        borderRadius: 4,
        marginHorizontal: 8,
        paddingHorizontal: 8,
        textAlign: 'center',
    },
});

export default TransactionForm;