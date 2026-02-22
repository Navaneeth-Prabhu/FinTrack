import React, { useMemo, useCallback } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { ThemedText } from '../common/ThemedText';

type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface RecurringFrequencyBottomSheetProps {
    bottomSheetRef: React.RefObject<BottomSheetModal>;
    selectedFrequency: RecurringFrequency;
    onSelectFrequency: (frequency: RecurringFrequency) => void;
    colors: any;
}

const RecurringFrequencyBottomSheet: React.FC<RecurringFrequencyBottomSheetProps> = ({
    bottomSheetRef,
    selectedFrequency,
    onSelectFrequency,
    colors
}) => {
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
                        Select Frequency
                    </ThemedText>
                    <View style={styles.optionsContainer}>
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
                    </View>
                </BottomSheetView>
            </BottomSheetModal>
        </BottomSheetModalProvider>
    );
};

const styles = StyleSheet.create({
    bottomSheetContent: {
        flex: 1,
        padding: 16,
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    optionsContainer: {
        gap: 12,
    },
    frequencyOption: {
        padding: 16,
        borderRadius: 12,
    },
    frequencyOptionText: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default RecurringFrequencyBottomSheet;
