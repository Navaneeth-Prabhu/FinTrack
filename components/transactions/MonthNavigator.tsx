import React, { memo, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ThemedText } from '@/components/common/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { darkTheme, lightTheme } from '@/constants/theme';
import usePreferenceStore from '@/stores/preferenceStore';

// ─── Types ────────────────────────────────────────────────────────────────────
export type TimePreset = '3M' | '6M' | 'All';

interface MonthNavigatorProps {
    /** The currently selected month (used only when timePreset is null) */
    selectedMonth: Date;
    /** null → monthly mode; a string value → preset mode */
    timePreset: TimePreset | null;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    /** Selecting an already-active preset deactivates it and returns to monthly mode */
    onPresetSelect: (preset: TimePreset) => void;
}

// ─── Constants (hoisted to module scope — rule: no inline objects) ─────────────
const PRESETS: TimePreset[] = ['3M', '6M', 'All'];

const PRESET_LABELS: Record<TimePreset, string> = {
    '3M': 'Last 3 Months',
    '6M': 'Last 6 Months',
    'All': 'All Time',
};

// ─── Component ────────────────────────────────────────────────────────────────
export const MonthNavigator: React.FC<MonthNavigatorProps> = memo(({
    selectedMonth,
    timePreset,
    onPrevMonth,
    onNextMonth,
    onPresetSelect,
}) => {
    const { colors } = useTheme();
    const { theme } = usePreferenceStore();
    const isDark = theme === 'dark';

    // Next-month arrow is disabled when we are already on the current month
    const isCurrentMonth = isSameMonth(selectedMonth, new Date());

    // Formatted label e.g. "February 2026"
    const monthLabel = format(selectedMonth, 'MMMM yyyy');

    // ── Stable press handlers ─────────────────────────────────────────────────
    const handlePreset3M = useCallback(() => onPresetSelect('3M'), [onPresetSelect]);
    const handlePreset6M = useCallback(() => onPresetSelect('6M'), [onPresetSelect]);
    const handlePresetAll = useCallback(() => onPresetSelect('All'), [onPresetSelect]);
    const presetHandlers: Record<TimePreset, () => void> = {
        '3M': handlePreset3M,
        '6M': handlePreset6M,
        'All': handlePresetAll,
    };

    // ── Derived colours ───────────────────────────────────────────────────────
    const chipBg = isDark ? darkTheme.card : lightTheme.card;
    const activeChipBg = colors.primary;
    const arrowColor = colors.subtitle;
    const disabledArrowColor = isDark ? '#3a3a3a' : '#d0d0d0';

    return (
        <View style={styles.wrapper}>
            {/* ── Month row (hidden while a preset is active) ────────────────── */}
            {timePreset === null ? (
                <View style={styles.monthRow}>
                    <Pressable
                        onPress={onPrevMonth}
                        style={styles.arrowButton}
                        hitSlop={HIT_SLOP}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={22}
                            color={arrowColor}
                        />
                    </Pressable>

                    <ThemedText variant="h3" style={styles.monthLabel}>
                        {monthLabel}
                    </ThemedText>

                    <Pressable
                        onPress={isCurrentMonth ? undefined : onNextMonth}
                        style={styles.arrowButton}
                        hitSlop={HIT_SLOP}
                    >
                        <Ionicons
                            name="chevron-forward"
                            size={22}
                            color={isCurrentMonth ? disabledArrowColor : arrowColor}
                        />
                    </Pressable>
                </View>
            ) : (
                // When a preset is active, show its name instead of month navigation
                <View style={styles.presetActiveRow}>
                    <ThemedText style={[styles.presetActiveLabel, { color: colors.subtitle }]}>
                        {PRESET_LABELS[timePreset]}
                    </ThemedText>
                </View>
            )}

            {/* ── Preset chips ──────────────────────────────────────────────── */}
            <View style={styles.chipsRow}>
                {PRESETS.map((preset) => {
                    const isActive = timePreset === preset;
                    return (
                        <Pressable
                            key={preset}
                            onPress={presetHandlers[preset]}
                            style={[
                                styles.chip,
                                { backgroundColor: isActive ? activeChipBg : chipBg },
                            ]}
                        >
                            <ThemedText
                                style={[
                                    styles.chipText,
                                    { color: isActive ? '#fff' : colors.subtitle },
                                ]}
                            >
                                {preset}
                            </ThemedText>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
});

// ─── Hit slop (hoisted — avoids inline object per render) ─────────────────────
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 } as const;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    wrapper: {
        paddingBottom: 4,
    },
    monthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginBottom: 10,
    },
    arrowButton: {
        padding: 6,
    },
    monthLabel: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        flex: 1,
    },
    presetActiveRow: {
        alignItems: 'center',
        marginBottom: 10,
    },
    presetActiveLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    chipsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 4,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
