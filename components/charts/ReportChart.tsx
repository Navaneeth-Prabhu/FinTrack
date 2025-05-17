import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import BarChart from './ExpenseChartWidget';
import { fetchTransactionsFromDB } from '@/db/repository/transactionRepository';
import { useTheme } from '@/hooks/useTheme';

const ReportChart = () => {
    const { colors } = useTheme();
    const [transactions, setTransactions] = useState([]);
    const [period, setPeriod] = useState('month'); // 'week', 'month', 'year'
    const [chartData, setChartData] = useState([]);
    const [type, setType] = useState('expense'); // 'income', 'expense'
    const [isLoading, setIsLoading] = useState(true);
    const [totalAmount, setTotalAmount] = useState(0);

    useEffect(() => {
        loadTransactions();
    }, [period, type]);

    useEffect(() => {
        if (transactions.length > 0) {
            const data = generateChartData();
            setChartData(data);

            // Calculate total
            const total = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
            setTotalAmount(total);
        } else {
            setChartData([]);
            setTotalAmount(0);
        }
    }, [transactions]);

    // Parse date strings to standardized format (YYYY-MM-DD)
    const parseDate = (dateString) => {
        // Handle both ISO string format and timestamp format
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const loadTransactions = async () => {
        try {
            setIsLoading(true);
            // Fetch all transactions and filter in memory
            // This avoids issues with date format inconsistencies in the database
            const allTransactions = await fetchTransactionsFromDB();

            // Filter by transaction type
            const typeFiltered = allTransactions.filter(t => t.type === type);

            // Now filter by date range based on selected period
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

            // Filter by date range
            const dateFiltered = typeFiltered.filter(t => {
                const txDate = new Date(t.date);
                return txDate >= startDate && txDate <= endDate;
            });

            console.log(`Found ${dateFiltered.length} ${type} transactions in selected ${period}`);

            setTransactions(dateFiltered);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateChartData = () => {
        if (!transactions || transactions.length === 0) {
            return [];
        }

        const now = new Date();
        let data = [];

        if (period === 'week') {
            // Create data for each day of current week
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
                    frontColor: type === 'income' ? '#4CAF50' : '#F44336'
                };
            });
        } else if (period === 'month') {
            // Create data for each day of current month
            const year = now.getFullYear();
            const month = now.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            data = Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateObj = new Date(year, month, day);

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
                    label: day.toString(), // Day of month as string
                    value: dayTotal,
                    frontColor: type === 'income' ? '#4CAF50' : '#F44336'
                };
            });
        } else if (period === 'year') {
            // Create data for each month of current year
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
                    frontColor: type === 'income' ? '#4CAF50' : '#F44336'
                };
            });
        }

        return data;
    };

    const handleBarPress = (item, index) => {
        console.log(`Selected: ${item.label} with value ${item.value}`);
        // Add additional functionality as needed
    };

    // Format currency for display
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Transaction Summary</Text>

                {/* Total amount display */}
                <Text style={[
                    styles.totalAmount,
                    { color: type === 'income' ? '#4CAF50' : '#F44336' }
                ]}>
                    {formatCurrency(totalAmount)}
                </Text>

                {/* Transaction type selector */}
                <View style={styles.typeControl}>
                    <TouchableOpacity
                        style={[styles.typeButton, type === 'expense' && styles.activeType]}
                        onPress={() => setType('expense')}
                    >
                        <Text style={[styles.typeText, type === 'expense' && styles.activeTypeText]}>Expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.typeButton, type === 'income' && styles.activeType]}
                        onPress={() => setType('income')}
                    >
                        <Text style={[styles.typeText, type === 'income' && styles.activeTypeText]}>Income</Text>
                    </TouchableOpacity>
                </View>

                {/* Period selector */}
                <View style={styles.segmentedControl}>
                    <TouchableOpacity
                        style={[styles.segmentButton, period === 'week' && styles.activeSegment]}
                        onPress={() => setPeriod('week')}
                    >
                        <Text style={[styles.segmentText, period === 'week' && styles.activeSegmentText]}>Week</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentButton, period === 'month' && styles.activeSegment]}
                        onPress={() => setPeriod('month')}
                    >
                        <Text style={[styles.segmentText, period === 'month' && styles.activeSegmentText]}>Month</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentButton, period === 'year' && styles.activeSegment]}
                        onPress={() => setPeriod('year')}
                    >
                        <Text style={[styles.segmentText, period === 'year' && styles.activeSegmentText]}>Year</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0066cc" />
                    <Text style={styles.loadingText}>Loading data...</Text>
                </View>
            ) : chartData.length > 0 ? (
                <View style={styles.chartContainer}>
                    <BarChart
                        data={chartData}
                        type={period}
                        onBarPress={handleBarPress}
                        showBarBackground={true}
                        barBackgroundColor={colors.accent}
                        barGap={period === 'month' ? 3 : 5} // Smaller gap for monthly view with many bars
                        textColor="#506690"
                        chartHeight={220}
                        topPadding={20}
                        padding={0}
                        yLabelPadding={67}
                        yLabelCount={5}
                        yGridLines={true}
                        yGridLineColor={colors.accent}
                        barBorderRadius={period === 'month' ? 2 : 6} // Smaller radius for monthly view
                        showTouchedValue={true}
                        fontSize={10}
                        labelFormatter={(val) => formatCurrency(val)}
                    />
                </View>
            ) : (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>No {type} data available for this {period}</Text>
                </View>
            )}

            {/* Debug info - uncomment if needed */}
            {/* <View style={styles.debugContainer}>
                <Text style={styles.debugText}>
                    Showing {transactions.length} transactions
                </Text>
                {transactions.length > 0 && (
                    <Text style={styles.debugText}>
                        Latest transaction: {transactions[0].date} - ₹{transactions[0].amount}
                    </Text>
                )}
            </View> */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
    },
    header: {
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },
    typeControl: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    typeButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 8,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
    },
    activeType: {
        backgroundColor: '#E0E0E0',
    },
    typeText: {
        fontSize: 14,
        color: '#666',
    },
    activeTypeText: {
        color: '#333',
        fontWeight: '500',
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 2,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeSegment: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    segmentText: {
        fontSize: 14,
        color: '#666',
    },
    activeSegmentText: {
        color: '#333',
        fontWeight: '600',
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
        height: 250,
    },
    noDataContainer: {
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        color: '#999',
        fontSize: 14,
    },
    debugContainer: {
        marginTop: 12,
        padding: 8,
        backgroundColor: '#f8f8f8',
        borderRadius: 4,
    },
    debugText: {
        fontSize: 12,
        color: '#666',
    },
});

export default ReportChart;