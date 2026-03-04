import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Keyboard } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import { Loan } from '@/types';
import { useLoanStore } from '@/stores/loanStore';
import { Button } from '@/components/common/Button';

interface RecordPaymentSheetProps {
    isOpen: boolean;
    onClose: () => void;
    loan: Loan;
}

export default function RecordPaymentSheet({ isOpen, onClose, loan }: RecordPaymentSheetProps) {
    const { colors } = useTheme();
    const { recordPayment } = useLoanStore();
    const bottomSheetRef = React.useRef<BottomSheet>(null);

    const [amountStr, setAmountStr] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            bottomSheetRef.current?.expand();
            setAmountStr(loan.emiAmount.toString());
        } else {
            bottomSheetRef.current?.close();
            Keyboard.dismiss();
            setAmountStr('');
        }
    }, [isOpen, loan]);

    const handleSheetChanges = React.useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const handleSave = async () => {
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return;

        setIsSubmitting(true);
        try {
            await recordPayment(loan.id, amount);
            onClose();
        } catch (error) {
            console.error('Failed to record payment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={['45%', '85%']}
            enablePanDownToClose
            onChange={handleSheetChanges}
            backdropComponent={(props) => (
                <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
            )}
            backgroundStyle={{ backgroundColor: colors.card }}
            handleIndicatorStyle={{ backgroundColor: colors.subtitle }}
        >
            <BottomSheetView style={styles.contentContainer}>
                <Text style={[styles.title, { color: colors.text }]}>Record Loan Payment</Text>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Payment Amount</Text>
                    <BottomSheetTextInput
                        style={[
                            styles.input,
                            { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }
                        ]}
                        keyboardType="numeric"
                        value={amountStr}
                        onChangeText={setAmountStr}
                        placeholderTextColor={colors.subtitle}
                    />
                    <Text style={[styles.helperText, { color: colors.subtitle }]}>
                        Default is your monthly EMI amount.
                    </Text>
                </View>

                <View style={styles.actionRow}>
                    <View style={styles.actionButton}>
                        <Button
                            onPress={onClose}
                            variant="outline"
                        >Cancel</Button>
                    </View>
                    <View style={styles.actionButton}>
                        <Button
                            onPress={handleSave}
                            loading={isSubmitting}
                        >Save Payment</Button>
                    </View>
                </View>
            </BottomSheetView>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        padding: 24,
    },
    title: {
        fontFamily: 'Urbanist-Bold',
        fontSize: 22,
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontFamily: 'Urbanist-SemiBold',
        fontSize: 14,
        marginBottom: 8,
    },
    input: {
        borderRadius: 12,
        padding: Platform.OS === 'ios' ? 16 : 12,
        fontFamily: 'Urbanist-Medium',
        fontSize: 16,
        borderWidth: 1,
    },
    helperText: {
        fontFamily: 'Urbanist-Medium',
        fontSize: 12,
        marginTop: 8,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    actionButton: {
        flex: 1,
    }
});
