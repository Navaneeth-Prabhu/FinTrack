import React, { useCallback, useRef, useEffect, useMemo, useReducer } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { fetchTransactionsFromDB } from '@/db/repository/transactionRepository';
import { useTheme } from '@/hooks/useTheme';
import { useTransactionStore } from '@/stores/transactionStore';
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
    transactions: Transaction[];
    period: 'week' | 'month' | 'year';
    chartData: ChartBarData[];
    type: 'income' | 'expense';
    isLoading: boolean;
    totalAmount: number;
    incomeTotalAmount: number;
    expenseTotalAmount: number;
    selectedBarIndex: number;
    selectedBarValue: number;
    displayValue: number;
    selectedLabel: string;
}

type ChartAction =
    | { type: 'SET_PERIOD'; period: 'week' | 'month' | 'year' }
    | { type: 'SET_TYPE'; transactionType: 'income' | 'expense' }
    | { type: 'SET_TRANSACTIONS'; transactions: Transaction[]; incomeTotal: number; expenseTotal: number }
    | { type: 'SET_CHART_DATA'; data: ChartBarData[]; totalAmount: number }
    | { type: 'SET_LOADING'; isLoading: boolean }
    | { type: 'SELECT_BAR'; index: number; value: number; label: string }
    | { type: 'SET_DISPLAY_VALUE'; value: number }
    | { type: 'RESET_SELECTION' };

const chartReducer = (state: ChartState, action: ChartAction): ChartState => {
    switch (action.type) {
        case 'SET_PERIOD':
            return { ...state, period: action.period, selectedBarIndex: -1, selectedLabel: 'Total' };
        case 'SET_TYPE':
            return { ...state, type: action.transactionType, selectedBarIndex: -1, selectedLabel: 'Total' };
        case 'SET_TRANSACTIONS':
            return {
                ...state,
                transactions: action.transactions,
                incomeTotalAmount: action.incomeTotal,
                expenseTotalAmount: action.expenseTotal
            };
        case 'SET_CHART_DATA':
            return {
                ...state,
                chartData: action.data,
                totalAmount: action.totalAmount,
                displayValue: state.selectedBarIndex === -1 ? action.totalAmount : state.displayValue
            };
        case 'SET_LOADING':
            return { ...state, isLoading: action.isLoading };
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
    transactions: [],
    period: 'week',
    chartData: [],
    type: 'expense',
    isLoading: true,
    totalAmount: 0,
    incomeTotalAmount: 0,
    expenseTotalAmount: 0,
    selectedBarIndex: -1,
    selectedBarValue: 0,
    displayValue: 0,
    selectedLabel: 'Total',
};

const ReportChart = () => {
    const { colors } = useTheme();
    const frequencyBottomSheetRef = useRef<BottomSheetModal>(null);
    const { transactions: storeTransactions } = useTransactionStore();

    const [state, dispatch] = useReducer(chartReducer, initialState);
    const {
        transactions, period, chartData, type, isLoading, totalAmount,
        displayValue, selectedBarIndex, selectedBarValue, selectedLabel
    } = state;

    // Filter transactions based on period
    const filterTransactions = useCallback(() => {
        try {
            dispatch({ type: 'SET_LOADING', isLoading: true });

            const now = new Date();
            let startDate: Date, endDate: Date;
            if (period === 'week') {
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(now);
                endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
                endOfWeek.setHours(23, 59, 59, 999);
                startDate = startOfWeek;
                endDate = endOfWeek;
            } else if (period === 'month') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                endOfMonth.setHours(23, 59, 59, 999);
                startDate = startOfMonth;
                endDate = endOfMonth;
            } else {
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const endOfYear = new Date(now.getFullYear(), 11, 31);
                endOfYear.setHours(23, 59, 59, 999);
                startDate = startOfYear;
                endDate = endOfYear;
            }

            const dateFiltered = storeTransactions.filter((t: Transaction) => {
                const txDate = new Date(t.date);
                return txDate >= startDate && txDate <= endDate;
            });

            const incomeTotal = dateFiltered
                .filter((t: Transaction) => t.type === 'income')
                .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

            const expenseTotal = dateFiltered
                .filter((t: Transaction) => t.type === 'expense')
                .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

            const typeFiltered = dateFiltered.filter((t: Transaction) => t.type === type);
            dispatch({
                type: 'SET_TRANSACTIONS',
                transactions: typeFiltered,
                incomeTotal: incomeTotal,
                expenseTotal: expenseTotal
            });
        } catch (error) {
            console.error('Failed to filter transactions:', error);
        } finally {
            dispatch({ type: 'SET_LOADING', isLoading: false });
        }
    }, [storeTransactions, period, type]);

    // Filter transactions when store data or filters change
    useEffect(() => {
        filterTransactions();
    }, [filterTransactions]);

    // Generate chart data and set total amount when transactions change
    useEffect(() => {
        const data = generateChartData();
        const total = transactions.reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);
        dispatch({ type: 'SET_CHART_DATA', data, totalAmount: total });
    }, [transactions]);

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

    // Generate chart data
    const generateChartData = useCallback((): ChartBarData[] => {
        const now = new Date();
        let data: ChartBarData[] = [];
        const defaultColor = type === 'income' ? '#4CAF50' : colors.primary;

        if (period === 'week') {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);

            data = Array.from({ length: 7 }, (_, i) => {
                const currentDate = new Date(startOfWeek);
                currentDate.setDate(startOfWeek.getDate() + i);
                const dayTotal = transactions
                    .filter((t: Transaction) => {
                        const txDate = new Date(t.date);
                        return txDate.getDate() === currentDate.getDate() &&
                            txDate.getMonth() === currentDate.getMonth() &&
                            txDate.getFullYear() === currentDate.getFullYear();
                    })
                    .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

                return { label: days[i], value: dayTotal, frontColor: defaultColor };
            });
        } else if (period === 'month') {
            const year = now.getFullYear();
            const month = now.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            data = Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dayTotal = transactions
                    .filter((t: Transaction) => {
                        const txDate = new Date(t.date);
                        return txDate.getDate() === day &&
                            txDate.getMonth() === month &&
                            txDate.getFullYear() === year;
                    })
                    .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

                return { label: day.toString(), value: dayTotal, frontColor: defaultColor };
            });
        } else if (period === 'year') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const year = now.getFullYear();

            data = months.map((month, index) => {
                const monthTotal = transactions
                    .filter((t: Transaction) => {
                        const txDate = new Date(t.date);
                        return txDate.getMonth() === index &&
                            txDate.getFullYear() === year;
                    })
                    .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

                return { label: month, value: monthTotal, frontColor: defaultColor };
            });
        }
        return data;
    }, [period, transactions, type, colors]);

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

            {isLoading ? (
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