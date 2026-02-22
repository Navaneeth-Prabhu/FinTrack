import React, { useMemo, useCallback } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../common/ThemedText';

type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';

interface TransactionTypeBottomSheetProps {
    bottomSheetRef: React.RefObject<BottomSheetModal>;
    selectedType: TransactionType;
    onSelectType: (type: TransactionType) => void;
    colors: any;
}

const TransactionTypeBottomSheet: React.FC<TransactionTypeBottomSheetProps> = ({
    bottomSheetRef,
    selectedType,
    onSelectType,
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
                    <View style={styles.optionsContainer}>
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
    typeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 16,
    },
    typeOptionText: {
        fontSize: 16,
        fontWeight: '500',
    },
});

export default TransactionTypeBottomSheet;
