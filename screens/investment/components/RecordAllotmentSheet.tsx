import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Keyboard } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import { SIPPlan } from '@/types';
import { useSIPStore } from '@/stores/sipStore';
import { Button } from '@/components/common/Button';

interface RecordAllotmentSheetProps {
    isOpen: boolean;
    onClose: () => void;
    sip: SIPPlan;
}

export default function RecordAllotmentSheet({ isOpen, onClose, sip }: RecordAllotmentSheetProps) {
    const { colors } = useTheme();
    const { recordAllotment } = useSIPStore();
    const bottomSheetRef = React.useRef<BottomSheet>(null);

    const [amountStr, setAmountStr] = useState('');
    const [navStr, setNavStr] = useState('');
    const [unitsStr, setUnitsStr] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            bottomSheetRef.current?.expand();
            setAmountStr(sip.amount.toString());
            setNavStr(sip.nav ? sip.nav.toString() : '');
            setUnitsStr('');
        } else {
            bottomSheetRef.current?.close();
            Keyboard.dismiss();
        }
    }, [isOpen, sip]);

    const handleSheetChanges = React.useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const handleSave = async () => {
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return;

        const nav = navStr ? parseFloat(navStr) : undefined;
        let units = unitsStr ? parseFloat(unitsStr) : undefined;

        if (nav && !units) {
            units = amount / nav;
        }

        setIsSubmitting(true);
        try {
            await recordAllotment(sip.id, amount, nav, units);
            onClose();
        } catch (error) {
            console.error('Failed to record allotment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={['55%', '85%']}
            enablePanDownToClose
            onChange={handleSheetChanges}
            backdropComponent={(props) => (
                <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
            )}
            backgroundStyle={{ backgroundColor: colors.card }}
            handleIndicatorStyle={{ backgroundColor: colors.subtitle }}
        >
            <BottomSheetView style={styles.contentContainer}>
                <Text style={[styles.title, { color: colors.text }]}>Record SIP Allotment</Text>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Amount Invested</Text>
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
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>NAV (Optional)</Text>
                    <BottomSheetTextInput
                        style={[
                            styles.input,
                            { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }
                        ]}
                        keyboardType="numeric"
                        value={navStr}
                        onChangeText={setNavStr}
                        placeholder="Current NAV"
                        placeholderTextColor={colors.subtitle}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Units Allotted (Optional)</Text>
                    <BottomSheetTextInput
                        style={[
                            styles.input,
                            { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }
                        ]}
                        keyboardType="numeric"
                        value={unitsStr}
                        onChangeText={setUnitsStr}
                        placeholder="Auto-calculated if NAV is provided"
                        placeholderTextColor={colors.subtitle}
                    />
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
                        >Save Record</Button>
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
        marginBottom: 20,
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
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    actionButton: {
        flex: 1,
    }
});
