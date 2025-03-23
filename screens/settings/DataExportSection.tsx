import React, { useState } from 'react';
import { Pressable, Text, View, Alert, Platform, StyleSheet } from 'react-native';
import DatePicker from 'react-native-date-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '@/hooks/useTheme';
import { useTransactionStore } from '@/stores/transactionStore';
import BottomSheetModal from '@/components/bottomSheet/settingsBottomSheet';
import { fontSizes } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/common/ThemedText';

const DataExportSection: React.FC = () => {
    const { colors } = useTheme();
    const { transactions } = useTransactionStore();
    const [showExportModal, setShowExportModal] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const exportToCSV = async (dateRange: 'all' | 'custom') => {
        let filteredTransactions = transactions;
        if (dateRange === 'custom') {
            filteredTransactions = transactions.filter(t => {
                const transDate = new Date(t.date);
                return transDate >= startDate && transDate <= endDate;
            });
        }

        const csvHeader = "Date,Amount,Category,Type,Mode,Recipient\n";
        const csvRows = filteredTransactions.map(t => {
            return `${t.date},${t.amount},${t.category.name},${t.type},${t.mode},${t.paidTo}`;
        }).join('\n');

        const csvContent = csvHeader + csvRows;
        const fileName = `transactions_${dateRange}_${new Date().toISOString().replace(/:/g, '-')}.csv`;
        let filePath = Platform.OS === 'android'
            ? `${FileSystem.cacheDirectory}${fileName}`
            : `${FileSystem.documentDirectory}${fileName}`;

        try {
            await FileSystem.writeAsStringAsync(filePath, csvContent);
            setShowExportModal(false);
            Alert.alert(
                "Export Successful",
                Platform.OS === 'android'
                    ? `File saved to your Downloads folder or app cache. Check with a file manager at: ${filePath}`
                    : `File saved to your app's Documents folder. Find it in the Files app under "On My iPhone" > "Expense Tracker"`,
                [{ text: "OK" }]
            );
        } catch (error) {
            console.error('Error exporting CSV:', error);
            Alert.alert("Export Failed", "There was an error saving the file. Please try again.", [{ text: "OK" }]);
        }
    };

    return (
        <>
            <Pressable onPress={() => setShowExportModal(true)} style={styles.settingItem}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                    <MaterialCommunityIcons name="export-variant" size={20} color={colors.primary} />
                </View>
                <ThemedText style={styles.menuText}>Export Data</ThemedText>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
            </Pressable>

            <BottomSheetModal
                visible={showExportModal}
                onClose={() => setShowExportModal(false)}
                title="Export Transactions"
            >
                <Pressable style={{ paddingVertical: 15 }} onPress={() => exportToCSV('all')}>
                    <Text style={[styles.normalText, { color: colors.text }]}>Export All Transactions</Text>
                </Pressable>

                <View style={{ marginVertical: 15 }}>
                    <Text style={[styles.normalText, { color: colors.text }]}>Custom Date Range</Text>

                    <Pressable onPress={() => setShowStartPicker(true)} style={{ paddingVertical: 10, marginVertical: 5 }}>
                        <Text style={{ color: colors.text }}>Start: {startDate.toDateString()}</Text>
                    </Pressable>

                    {showStartPicker && (
                        <DatePicker
                            date={startDate}
                            onDateChange={(date) => { setStartDate(date); setShowStartPicker(false); }}
                            mode="date"
                            modal
                            open={showStartPicker}
                            onCancel={() => setShowStartPicker(false)}
                            onConfirm={(date) => { setStartDate(date); setShowStartPicker(false); }}
                        />
                    )}

                    <Pressable onPress={() => setShowEndPicker(true)} style={{ paddingVertical: 10, marginVertical: 5 }}>
                        <Text style={{ color: colors.text }}>End: {endDate.toDateString()}</Text>
                    </Pressable>

                    {showEndPicker && (
                        <DatePicker
                            date={endDate}
                            onDateChange={(date) => { setEndDate(date); setShowEndPicker(false); }}
                            mode="date"
                            modal
                            open={showEndPicker}
                            onCancel={() => setShowEndPicker(false)}
                            onConfirm={(date) => { setEndDate(date); setShowEndPicker(false); }}
                        />
                    )}

                    <Pressable
                        style={[styles.button, { backgroundColor: colors.primary }]}
                        onPress={() => exportToCSV('custom')}
                    >
                        <Text style={styles.buttonText}>Export Range</Text>
                    </Pressable>
                </View>
            </BottomSheetModal>
        </>
    );
};

export default DataExportSection;

const styles = StyleSheet.create({
    settingSection: {
        marginBottom: 30
    },
    sectionHeader: {
        fontSize: fontSizes.FONT23,
        fontFamily: "Poppins_600SemiBold",
        marginBottom: 10
    },
    settingItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    normalText: {
        fontSize: fontSizes.FONT19,
        opacity: 0.9,
        fontFamily: "Poppins_500Medium"
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    bottomSheet: {
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        minHeight: 400
    },
    button: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 15
    },
    buttonText: {
        color: '#fff',
        fontSize: fontSizes.FONT18,
        fontFamily: "Poppins_500Medium"
    },
    closeButton: {
        paddingVertical: 15,
        alignItems: 'center'
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuText: {
        fontSize: 16,
        flex: 1,
    },
    chevron: {
        marginLeft: 4,
    },
});