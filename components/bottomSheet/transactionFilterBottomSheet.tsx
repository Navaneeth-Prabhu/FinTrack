import React, { useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetFooter, BottomSheetFooterProps, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { ThemedText } from '../common/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import FilterChip from '../FilterChip';
import { Category } from '@/types';
import { TimePreset } from '../transactions/MonthNavigator';
import { useTheme } from '@/hooks/useTheme';

interface FilterBottomSheetProps {
    bottomSheetRef: React.RefObject<BottomSheetModal>;
    timePreset: TimePreset | null;
    onPresetSelect: (preset: TimePreset) => void;
    filterState: any;
    onFilterChange: (filterType: string, value: string) => void;
    onClearFilters: () => void;
    onApplyFilters: () => void;
    filterOptions: {
        transactionTypes: Array<{ label: string; value: string }>;
        accountTypes: Array<{ label: string; value: string }>;
        categories: Category[];
    };
}

const TIME_PRESET_OPTIONS = ['3M', '6M', 'All'] as TimePreset[];
const PRESET_LABELS: Record<string, string> = {
    '3M': 'Last 3 Months',
    '6M': 'Last 6 Months',
    'All': 'All Time',
};

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
    bottomSheetRef,
    timePreset,
    onPresetSelect,
    filterState,
    onFilterChange,
    onClearFilters,
    onApplyFilters,
    filterOptions
}) => {
    const { colors } = useTheme();

    // Memoize the snapPoints array to prevent unnecessary re-renders
    const snapPoints = useMemo(() => ['80%'], []);

    // Backdrop component - memoized
    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.7}
            />
        ),
        []
    );

    // Memoize the close handler to prevent recreation
    const handleClose = useCallback(() => {
        bottomSheetRef.current?.close();
    }, [bottomSheetRef]);

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            snapPoints={snapPoints}
            backgroundStyle={{ backgroundColor: colors.background }}
            handleIndicatorStyle={{ backgroundColor: colors.border }}
            backdropComponent={renderBackdrop}
            enablePanDownToClose={true}
            enableContentPanningGesture={true}
            enableHandlePanningGesture={true}
            enableOverDrag={true}
        >
            <BottomSheetView style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <ThemedText variant='h3'>Filters</ThemedText>
                        <View style={styles.iconContainer}>
                            <TouchableOpacity onPress={handleClose}>
                                <Ionicons
                                    name="close"
                                    size={26}
                                    color={colors.text}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Time Period Section */}
                <View>
                    <ThemedText variant='body1' style={{ marginBottom: 14 }}>Time Period</ThemedText>
                    <View style={styles.optionsRow}>
                        {TIME_PRESET_OPTIONS.map((preset) => (
                            <FilterChip
                                key={preset}
                                label={PRESET_LABELS[preset]}
                                selected={timePreset === preset}
                                onPress={() => onPresetSelect(preset)}
                                selectedColor={colors.primary}
                            />
                        ))}
                    </View>
                </View>

                {/* Transaction Type Section */}
                <View>
                    <ThemedText variant='body1' style={{ marginBottom: 14 }}>Transaction Type</ThemedText>
                    <View style={styles.optionsRow}>
                        {filterOptions.transactionTypes.map(type => (
                            <FilterChip
                                key={type.value}
                                label={type.label}
                                selected={filterState.transactionType.includes(type.value)}
                                onPress={() => onFilterChange('transactionType', type.value)}
                                selectedColor={
                                    type.value === 'income' ? colors.income :
                                        type.value === 'expense' ? colors.expense : colors.primary
                                }
                            />
                        ))}
                    </View>
                </View>

                {/* Categories Section */}
                <View>
                    <ThemedText variant='body1' style={{ marginBottom: 14 }}>Categories</ThemedText>
                    <View style={styles.optionsRow}>
                        {filterOptions.categories.map(category => (
                            <FilterChip
                                key={category.id}
                                label={category.name}
                                selected={filterState.categories.includes(category.name)}
                                onPress={() => onFilterChange('categories', category.name)}
                                selectedColor={category.color}
                            />
                        ))}
                    </View>
                </View>

                {/* Footer Section */}
                <View style={[styles.footerContainer, { backgroundColor: colors.background }]}>
                    <TouchableOpacity
                        style={[styles.footerButton, styles.clearButton]}
                        onPress={onClearFilters}
                    >
                        <ThemedText variant='body1'>Clear</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.footerButton, { backgroundColor: colors.primary }]}
                        onPress={onApplyFilters}
                    >
                        <ThemedText variant='body1'>Apply</ThemedText>
                    </TouchableOpacity>
                </View>
            </BottomSheetView>
        </BottomSheetModal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        marginBottom: 16,
        gap: 6,
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10
    },
    content: {
        flex: 1,
        justifyContent: 'flex-start',
        gap: 20,
        paddingHorizontal: 20
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: 16,
        gap: 10,
        flexWrap: 'wrap'
    },
    wrap: {
        flexWrap: 'wrap',
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingBottom: 32,
        gap: 18
    },
    footerButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearButton: {
        backgroundColor: 'transparent',
        borderColor: 'gray',
        borderWidth: 1,
    },
});