import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Keyboard, Pressable, Platform } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useHoldingsStore } from '@/stores/holdingsStore';
import { Holding } from '@/types';
import { Ionicons } from '@expo/vector-icons';

export interface UpdatePriceSheetRef {
    present: (holding: Holding) => void;
    dismiss: () => void;
}

const UpdatePriceSheet = forwardRef<UpdatePriceSheetRef>((props, ref) => {
    const bottomSheetRef = React.useRef<BottomSheet>(null);
    const { colors } = useTheme();
    const { updateHolding } = useHoldingsStore();

    const [activeHolding, setActiveHolding] = useState<Holding | null>(null);
    const [price, setPrice] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Expose methods to parent
    React.useImperativeHandle(ref, () => ({
        present: (holding: Holding) => {
            setActiveHolding(holding);
            setPrice(holding.current_price ? holding.current_price.toString() : '');
            bottomSheetRef.current?.expand();
        },
        dismiss: () => {
            bottomSheetRef.current?.close();
            Keyboard.dismiss();
        }
    }));

    // variables
    const snapPoints = useMemo(() => ['50%'], []);

    // callbacks
    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            setActiveHolding(null);
            Keyboard.dismiss();
        }
    }, []);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                pressBehavior="close"
            />
        ),
        []
    );

    const handleSave = async () => {
        if (!activeHolding) return;

        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            bottomSheetRef.current?.close();
            return;
        }

        setIsSaving(true);
        try {
            await updateHolding({
                ...activeHolding,
                current_price: parsedPrice,
                price_updated_at: new Date().toISOString()
            });
            bottomSheetRef.current?.close();
        } catch (error) {
            console.error("Failed to update price", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!activeHolding) return null;

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
            backgroundStyle={{ backgroundColor: colors.background }}
            handleIndicatorStyle={{ backgroundColor: colors.subtitle }}
            keyboardBehavior={Platform.OS === 'ios' ? 'extend' : 'interactive'}
        >
            <BottomSheetScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <View>
                        <ThemedText variant="h2" style={styles.title}>Update Price</ThemedText>
                        <ThemedText style={{ color: colors.subtitle }}>{activeHolding.name}</ThemedText>
                    </View>
                    <Pressable onPress={() => bottomSheetRef.current?.close()} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </Pressable>
                </View>

                <View style={styles.formGroup}>
                    <ThemedText style={[styles.label, { color: colors.subtitle }]}>Current Price (₹)</ThemedText>
                    <BottomSheetTextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 2450.50"
                        placeholderTextColor={colors.subtitle}
                    />
                </View>

                <Pressable
                    onPress={handleSave}
                    disabled={isSaving}
                    style={({ pressed }) => [
                        styles.saveButton,
                        { backgroundColor: colors.primary },
                        (pressed || isSaving) && { opacity: 0.8 }
                    ]}
                >
                    <ThemedText style={styles.saveButtonText}>
                        {isSaving ? 'Saving...' : 'Save Price'}
                    </ThemedText>
                </Pressable>
            </BottomSheetScrollView>
        </BottomSheet>
    );
});

const styles = StyleSheet.create({
    contentContainer: {
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 32,
    },
    title: {
        marginBottom: 4,
    },
    closeBtn: {
        padding: 4,
        margin: -4,
    },
    formGroup: {
        marginBottom: 32,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        fontWeight: '500',
    },
    saveButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    }
});

export default UpdatePriceSheet;
