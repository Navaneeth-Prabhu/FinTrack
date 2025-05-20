
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { fetchTransactionsFromDB } from '@/db/repository/transactionRepository';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '../common/ThemedText';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { ChevronDown } from 'lucide-react-native';
import { fontSizes, tokens } from '@/constants/theme';
import BarChart from './ExpenseChartWidget';

const ReportChart = () => {
    const { colors } = useTheme();
    const frequencyBottomSheetRef = useRef(null);

    // State
    const [transactions, setTransactions] = useState([]);
    const [period, setPeriod] = useState('week'); // 'week', 'month', 'year'
    const [chartData, setChartData] = useState([]);
    const [type, setType] = useState('expense'); // 'income', 'expense'
    const [isLoading, setIsLoading] = useState(true);
    const [totalAmount, setTotalAmount] = useState(0);
    const [incomeTotalAmount, setIncomeTotalAmount] = useState(0);
    const [expenseTotalAmount, setExpenseTotalAmount] = useState(0);
    const [selectedBarIndex, setSelectedBarIndex] = useState(-1); // Use -1 for no selection
    const [selectedBarValue, setSelectedBarValue] = useState(0);
    const [displayValue, setDisplayValue] = useState(0);
    const [selectedLabel, setSelectedLabel] = useState('Total');

    // Load transactions when period or type changes
    useEffect(() => {
        loadTransactions();
    }, [period, type]);

    // Generate chart data and set total amount when transactions change
    useEffect(() => {
        if (transactions.length > 0) {
            // Calculate total for the current transactions
            const total = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
            setTotalAmount(total);
            setDisplayValue(total);
        } else {
            setTotalAmount(0);
            setDisplayValue(0);
        }

        // Reset selection when data changes
        setSelectedBarIndex(-1);
        setSelectedLabel('Total');
        
        // Generate chart data
        const data = generateChartData();
        setChartData(data);
    }, [transactions]);

    // Animation effect for display value
    useEffect(() => {
        let frameId;
        const animateValue = (start, end, duration) => {
            const startTime = Date.now();
            const change = end - start;

            const animateFrame = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;

                if (elapsed > duration) {
                    setDisplayValue(end);
                    return;
                }

                // Easing function for smooth animation
                const progress = elapsed / duration;
                const easeOutCubic = 1 - Math.pow(1 - progress, 3);
                const currentValue = start + change * easeOutCubic;

                setDisplayValue(currentValue);
                frameId = requestAnimationFrame(animateFrame);
            };

            frameId = requestAnimationFrame(animateFrame);
        };

        // Determine target value based on selection
        const targetValue = selectedBarIndex !== -1 ? selectedBarValue : totalAmount;
        animateValue(displayValue, targetValue, 300);

        return () => {
            if (frameId) {
                cancelAnimationFrame(frameId);
            }
        };
    }, [selectedBarIndex, selectedBarValue, totalAmount]);

    // Load transactions based on period
    const loadTransactions = async () => {
        try {
            setIsLoading(true);
            
            const allTransactions = await fetchTransactionsFromDB();
            
            // Calculate date range based on period
            const now = new Date();
            let startDate, endDate;

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
            } else if (period === 'year') {
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const endOfYear = new Date(now.getFullYear(), 11, 31);
                endOfYear.setHours(23, 59, 59, 999);

                startDate = startOfYear;
                endDate = endOfYear;
            }

            // Filter transactions by date range
            const dateFiltered = allTransactions.filter(t => {
                const txDate = new Date(t.date);
                return txDate >= startDate && txDate <= endDate;
            });

            // Calculate totals for both income and expense
            const incomeTotal = dateFiltered
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            const expenseTotal = dateFiltered
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            setIncomeTotalAmount(incomeTotal);
            setExpenseTotalAmount(expenseTotal);

            // Filter by transaction type for the chart
            const typeFiltered = dateFiltered.filter(t => t.type === type);
            setTransactions(typeFiltered);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Generate chart data
    const generateChartData = useCallback(() => {
        const now = new Date();
        let data = [];

        // Define color based on transaction type
        const defaultColor = type === 'income' ? '#4CAF50' : colors.primary;
        
        if (period === 'week') {
            // Weekly data
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);

            data = Array.from({ length: 7 }, (_, i) => {
                const currentDate = new Date(startOfWeek);
                currentDate.setDate(startOfWeek.getDate() + i);

                // Sum transactions for this day
                const dayTotal = transactions
                    .filter(t => {
                        const txDate = new Date(t.date);
                        return txDate.getDate() === currentDate.getDate() &&
                            txDate.getMonth() === currentDate.getMonth() &&
                            txDate.getFullYear() === currentDate.getFullYear();
                    })
                    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

                return {
                    label: days[i],
                    value: dayTotal,
                    frontColor: defaultColor,
                };
            });
        } else if (period === 'month') {
            // Monthly data
            const year = now.getFullYear();
            const month = now.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            data = Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;

                // Sum transactions for this day
                const dayTotal = transactions
                    .filter(t => {
                        const txDate = new Date(t.date);
                        return txDate.getDate() === day &&
                            txDate.getMonth() === month &&
                            txDate.getFullYear() === year;
                    })
                    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

                return {
                    label: day.toString(),
                    value: dayTotal,
                    frontColor: defaultColor,
                };
            });
        } else if (period === 'year') {
            // Yearly data
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const year = now.getFullYear();

            data = months.map((month, index) => {
                // Sum transactions for this month
                const monthTotal = transactions
                    .filter(t => {
                        const txDate = new Date(t.date);
                        return txDate.getMonth() === index &&
                            txDate.getFullYear() === year;
                    })
                    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

                return {
                    label: month,
                    value: monthTotal,
                    frontColor: defaultColor,
                };
            });
        }

        return data;
    }, [period, transactions, type, colors]);

    // Handle bar press from BarChart
    const handleBarPress = useCallback((item, index) => {
        console.log(`Bar pressed: ${item.label} (${index}) - Current selected: ${selectedBarIndex}`);
        
        // Toggle selection on/off
        if (selectedBarIndex === index) {
            // If the same bar is pressed, unselect it
            setSelectedBarIndex(-1);
            setSelectedBarValue(0);
            setSelectedLabel('Total');
        } else {
            // Otherwise, select the new bar
            setSelectedBarIndex(index);
            setSelectedBarValue(item.value);
            setSelectedLabel(item.label);
        }
    }, [selectedBarIndex]);

    // Handle background press to reset selection
    const handleBackgroundPress = useCallback(() => {
        if (selectedBarIndex !== -1) {
            setSelectedBarIndex(-1);
            setSelectedBarValue(0);
            setSelectedLabel('Total');
        }
    }, [selectedBarIndex]);

    // Format currency for display
    const formatCurrency = useCallback((amount = 0) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }, []);

    // Handle bottom sheet
    const handleBottomSheetOpen = useCallback(() => {
        frequencyBottomSheetRef.current?.present();
    }, []);

    const renderBackdrop = useCallback((props : any) => (
        <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.5}
        />
    ), []);

    // Period selector handler
    const handlePeriodChange = useCallback((newPeriod) => {
        if (period !== newPeriod) {
            setPeriod(newPeriod);
            frequencyBottomSheetRef.current?.close();
        }
    }, [period]);

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <View style={styles.header}>
                {/* Display value and label */}
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
                    <Text style={[styles.displayLabel, { color: colors.subtitle }]}>
                        {selectedLabel}
                    </Text>
                </View>
                
                {/* Period selector button */}
                <TouchableOpacity
                    onPress={handleBottomSheetOpen}
                    style={[styles.filterButton, { backgroundColor: colors.muted }]}
                >
                    <ThemedText style={{ color: colors.subtitle }}>
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                    </ThemedText>
                    <ChevronDown size={20} color={colors.text} />
                </TouchableOpacity>
            </View>
            
            {/* Chart or loading indicator */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0066cc" />
                    <Text style={styles.loadingText}>Loading data...</Text>
                </View>
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
                        barBorderRadius={period === 'month' ? 10 : 10}
                        showTouchedValue={false}
                        fontSize={10}
                        labelFormatter={(val) => formatCurrency(val)}
                        externalSelectedBarIndex={selectedBarIndex} // Pass selection to BarChart
                    />
                </TouchableOpacity>
            )}

            {/* Bottom sheet for period selection */}
            <BottomSheetModal
                snapPoints={['30%']}
                backgroundStyle={{ backgroundColor: colors.card }}
                handleIndicatorStyle={{ backgroundColor: colors.border }}
                enablePanDownToClose={true}
                ref={frequencyBottomSheetRef}
                backdropComponent={renderBackdrop}
            >
                <BottomSheetView style={{ flex: 1, padding: 16, gap: 16 }}>
                    <Text style={{ 
                        fontWeight: '600', 
                        fontSize: fontSizes.FONT16, 
                        color: colors.text, 
                        marginBottom: 8 
                    }}>
                        Select Period
                    </Text>
                    {['week', 'month', 'year'].map((p) => (
                        <TouchableOpacity
                            key={p}
                            style={[
                                styles.typeButton,
                                {
                                    backgroundColor: period === p ? colors.primary : colors.accent,
                                    borderWidth: period === p ? 2 : 1,
                                    borderColor: period === p ? colors.primary : colors.border,
                                    shadowColor: period === p ? colors.primary : 'transparent',
                                    shadowOpacity: period === p ? 0.15 : 0,
                                    shadowRadius: period === p ? 4 : 0,
                                    elevation: period === p ? 2 : 0,
                                }
                            ]}
                            onPress={() => handlePeriodChange(p)}
                            activeOpacity={0.85}
                        >
                            <Text
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
                            </Text>
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
        height: 190,
        position: 'relative',
    },
});

export default React.memo(ReportChart);