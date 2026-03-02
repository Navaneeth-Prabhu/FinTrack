import React, { forwardRef, useCallback, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, Keyboard, Pressable, Platform } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useSIPStore } from '@/stores/sipStore';
import { SIPPlan } from '@/types';
import { Ionicons } from '@expo/vector-icons';

export interface UpdateNAVSheetRef {
    present: (sip: SIPPlan) => void;
    dismiss: () => void;
}

const UpdateNAVSheet = forwardRef<UpdateNAVSheetRef>((props, ref) => {
    const bottomSheetRef = React.useRef<BottomSheet>(null);
    const { colors, getShadow } = useTheme();
    const { updateSIP } = useSIPStore();

    const [activeSIP, setActiveSIP] = useState<SIPPlan | null>(null);
    const [nav, setNav] = useState('');
    const [units, setUnits] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Expose methods to parent
    React.useImperativeHandle(ref, () => ({
        present: (sip: SIPPlan) => {
            setActiveSIP(sip);
            setNav(sip.nav ? sip.nav.toString() : '');
            setUnits(sip.units ? sip.units.toString() : '');
            bottomSheetRef.current?.expand();
        },
        dismiss: () => {
            bottomSheetRef.current?.close();
            Keyboard.dismiss();
        }
    }));

    // variables
    const snapPoints = useMemo(() => ['65%'], []);

    // callbacks
    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            setActiveSIP(null);
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
        if (!activeSIP) return;

        const parsedNav = parseFloat(nav);
        const parsedUnits = parseFloat(units);

        // Allow nullifying or updating
        const finalNav = isNaN(parsedNav) ? undefined : parsedNav;
        const finalUnits = isNaN(parsedUnits) ? undefined : parsedUnits;

        setIsSaving(true);
        try {
            await updateSIP({
                ...activeSIP,
                nav: finalNav,
                units: finalUnits,
                priceUpdatedAt: new Date().toISOString()
            });
            bottomSheetRef.current?.close();
        } catch (error) {
            console.error("Failed to update NAV", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!activeSIP) return null;

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
                        <ThemedText variant="h2" style={styles.title}>Update Holdings</ThemedText>
                        <ThemedText style={{ color: colors.subtitle }}>{activeSIP.fundName}</ThemedText>
                    </View>
                    <Pressable onPress={() => bottomSheetRef.current?.close()} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </Pressable>
                </View>

                <View style={styles.formGroup}>
                    <ThemedText style={[styles.label, { color: colors.subtitle }]}>Current NAV (₹)</ThemedText>
                    <BottomSheetTextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                        value={nav}
                        onChangeText={setNav}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 145.62"
                        placeholderTextColor={colors.subtitle}
                    />
                </View>

                <View style={[styles.formGroup, styles.lastGroup]}>
                    <ThemedText style={[styles.label, { color: colors.subtitle }]}>Total Units Allocated</ThemedText>
                    <BottomSheetTextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                        value={units}
                        onChangeText={setUnits}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 104.2"
                        placeholderTextColor={colors.subtitle}
                    />
                </View>

                <View style={[styles.infoBox, { backgroundColor: `${colors.accent}20` }]}>
                    <Ionicons name="information-circle" size={20} color={colors.primary} style={{ marginTop: 2 }} />
                    <ThemedText style={[styles.infoText, { color: colors.text }]}>
                        Find these exact numbers in your broker's app (like Groww or Zerodha) or your mutual fund statement.
                    </ThemedText>
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
                        {isSaving ? 'Saving...' : 'Save & Update Portfolio'}
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
        marginBottom: 20,
    },
    lastGroup: {
        marginBottom: 24,
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
    infoBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        marginBottom: 32,
        alignItems: 'flex-start',
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
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

export default UpdateNAVSheet;
