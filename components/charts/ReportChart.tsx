import React, { useCallback, useRef, useEffect, useMemo, useReducer } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { fetchTransactionsFromDB } from '@/db/repository/transactionRepository';
import { useTheme } from '@/hooks/useTheme';
import { useMetricsStore } from '@/stores/metricsStore';
import { ThemedText } from '../common/ThemedText';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { ChevronDown } from 'lucide-react-native';
import { fontSizes, tokens } from '@/constants/theme';
import BarChart from './ExpenseChartWidget';
import { Transaction } from '@/types';

// Define type for chart data bars
interface ChartBarData {
    label: string;
    value: number;
    frontColor?: string;
}

interface ChartState {
    period: 'week' | 'month' | 'year';
    type: 'income' | 'expense';
    selectedBarIndex: number;
    selectedBarValue: number;
    displayValue: number;
    selectedLabel: string;
}

type ChartAction =
    | { type: 'SET_PERIOD'; period: 'week' | 'month' | 'year' }
    | { type: 'SET_TYPE'; transactionType: 'income' | 'expense' }
    | { type: 'SELECT_BAR'; index: number; value: number; label: string }
    | { type: 'SET_DISPLAY_VALUE'; value: number }
    | { type: 'RESET_SELECTION' };

const chartReducer = (state: ChartState, action: ChartAction): ChartState => {
    switch (action.type) {
        case 'SET_PERIOD':
            return { ...state, period: action.period, selectedBarIndex: -1, selectedLabel: 'Total' };
        case 'SET_TYPE':
            return { ...state, type: action.transactionType, selectedBarIndex: -1, selectedLabel: 'Total' };
        case 'SELECT_BAR':
            return { ...state, selectedBarIndex: action.index, selectedBarValue: action.value, selectedLabel: action.label };
        case 'SET_DISPLAY_VALUE':
            return { ...state, displayValue: action.value };
        case 'RESET_SELECTION':
            return { ...state, selectedBarIndex: -1, selectedBarValue: 0, selectedLabel: 'Total' };
        default:
            return state;
    }
};

const initialState: ChartState = {
    period: 'week',
    type: 'expense',
    selectedBarIndex: -1,
    selectedBarValue: 0,
    displayValue: 0,
    selectedLabel: 'Total',
};

const ReportChart = () => {
    const { colors } = useTheme();
    const frequencyBottomSheetRef = useRef<BottomSheetModal>(null);
    const { chartData: rawChartData, isChartLoading, fetchChartMetrics } = useMetricsStore();

    const [state, dispatch] = useReducer(chartReducer, initialState);
    const {
        period, type,
        displayValue, selectedBarIndex, selectedBarValue, selectedLabel
    } = state;

    // Fetch new chart metrics from SQLite when period or type changes
    useEffect(() => {
        fetchChartMetrics(period, type);
    }, [period, type, fetchChartMetrics]);

    // Compute UI specific data
    const defaultColor = type === 'income' ? '#4CAF50' : colors.primary;
    const chartData = useMemo(() => {
        return rawChartData.map(d => ({ ...d, frontColor: defaultColor }));
    }, [rawChartData, defaultColor]);

    const totalAmount = useMemo(() => {
        return rawChartData.reduce((sum, item) => sum + item.value, 0);
    }, [rawChartData]);

    // Animation effect for display value
    useEffect(() => {
        let frameId: number | undefined;
        const animateValue = (start: number, end: number, duration: number) => {
            const startTime = Date.now();
            const change = end - start;

            const animateFrame = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;

                if (elapsed > duration) {
                    dispatch({ type: 'SET_DISPLAY_VALUE', value: end });
                    return;
                }

                const progress = elapsed / duration;
                const easeOutCubic = 1 - Math.pow(1 - progress, 3);
                const currentValue = start + change * easeOutCubic;

                dispatch({ type: 'SET_DISPLAY_VALUE', value: currentValue });
                frameId = requestAnimationFrame(animateFrame);
            };

            frameId = requestAnimationFrame(animateFrame);
        };

        const targetValue = selectedBarIndex !== -1 ? selectedBarValue : totalAmount;
        animateValue(displayValue, targetValue, 300);

        return () => {
            if (frameId !== undefined) {
                cancelAnimationFrame(frameId);
            }
        };
    }, [selectedBarIndex, selectedBarValue, totalAmount]);



    const handleBarPress = useCallback((item: ChartBarData, index: number) => {
        if (selectedBarIndex === index) {
            dispatch({ type: 'RESET_SELECTION' });
        } else {
            dispatch({ type: 'SELECT_BAR', index, value: item.value, label: item.label });
        }
    }, [selectedBarIndex]);

    const handleBackgroundPress = useCallback(() => {
        if (selectedBarIndex !== -1) {
            dispatch({ type: 'RESET_SELECTION' });
        }
    }, [selectedBarIndex]);

    const formatCurrency = useCallback((amount: number = 0): string => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }, []);

    const handleBottomSheetOpen = useCallback(() => {
        (frequencyBottomSheetRef.current as BottomSheetModal | null)?.present();
    }, []);

    const renderBackdrop = useCallback((props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ), []);

    const handlePeriodChange = useCallback((newPeriod: 'week' | 'month' | 'year') => {
        if (period !== newPeriod) {
            dispatch({ type: 'SET_PERIOD', period: newPeriod });
            (frequencyBottomSheetRef.current as BottomSheetModal | null)?.close();
        }
    }, [period]);

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <View style={styles.header}>
                <View style={styles.displayContainer}>
                    <ThemedText>Expense</ThemedText>
                    <ThemedText variant='h2' style={{
                        fontSize: fontSizes.FONT32,
                        color: colors.text,
                        fontWeight: tokens.fontWeight.semibold,
                        marginTop: 8
                    }}>
                        {formatCurrency(Math.round(displayValue))}
                    </ThemedText>
                    <ThemedText style={[styles.displayLabel, { color: colors.subtitle }]}>{selectedLabel}</ThemedText>
                </View>

                <TouchableOpacity
                    onPress={handleBottomSheetOpen}
                    style={[styles.filterButton, { backgroundColor: colors.muted }]}
                >
                    <ThemedText style={{ color: colors.subtitle }}>{period.charAt(0).toUpperCase() + period.slice(1)}</ThemedText>
                    <ChevronDown size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            {isChartLoading ? (
                <View style={styles.loadingContainer} />
            ) : (
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleBackgroundPress}
                    style={styles.chartContainer}
                >
                    <BarChart
                        data={chartData}
                        type={period}
                        onBarPress={handleBarPress}
                        showBarBackground={true}
                        barBackgroundColor={colors.accent}
                        barGap={period === 'month' ? 2 : 3}
                        textColor={colors.text}
                        chartHeight={170}
                        topPadding={20}
                        padding={0}
                        yLabelPadding={67}
                        yLabelCount={5}
                        yGridLines={true}
                        yGridLineColor={colors.accent}
                        barBorderRadius={10}
                        showTouchedValue={false}
                        fontSize={10}
                        labelFormatter={(val) => formatCurrency(val)}
                        externalSelectedBarIndex={selectedBarIndex}
                    />
                </TouchableOpacity>
            )}

            <BottomSheetModal
                snapPoints={['30%']}
                backgroundStyle={{ backgroundColor: colors.card }}
                handleIndicatorStyle={{ backgroundColor: colors.border }}
                enablePanDownToClose={true}
                ref={frequencyBottomSheetRef}
                backdropComponent={renderBackdrop}
            >
                <BottomSheetView style={{ flex: 1, padding: 16, gap: 16 }}>
                    <ThemedText style={{
                        fontWeight: '600',
                        fontSize: fontSizes.FONT16,
                        color: colors.text,
                        marginBottom: 8
                    }}>Select Period</ThemedText>
                    {(['week', 'month', 'year'] as Array<'week' | 'month' | 'year'>).map((p) => (
                        <TouchableOpacity
                            key={p}
                            style={[
                                styles.typeButton,
                                {
                                    backgroundColor: period === p ? colors.primary : colors.accent,
                                    borderWidth: period === p ? 2 : 1,
                                    borderColor: period === p ? colors.primary : colors.border,
                                    boxShadow: period === p ? `0 2 4 ${colors.primary}26` : 'none',
                                }
                            ]}
                            onPress={() => handlePeriodChange(p)}
                            activeOpacity={0.85}
                        >
                            <ThemedText
                                style={[
                                    styles.typeText,
                                    {
                                        color: period === p ? colors.card : colors.text,
                                        fontWeight: period === p ? '700' : '400',
                                        fontSize: fontSizes.FONT16,
                                        letterSpacing: 0.5,
                                    }
                                ]}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </ThemedText>
                        </TouchableOpacity>
                    ))}
                </BottomSheetView>
            </BottomSheetModal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    displayContainer: {
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        flexDirection: 'row',
        gap: 2,
        alignItems: 'center',
    },
    displayLabel: {
        fontSize: 12,
        textAlign: 'center',
    },
    typeButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 8,
        borderRadius: 8,
    },
    typeText: {
        fontSize: 14,
        textAlign: 'center',
    },
    loadingContainer: {
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 8,
        color: '#666',
    },
    chartContainer: {
        height: 200,
        position: 'relative',
    },
});

export default React.memo(ReportChart);