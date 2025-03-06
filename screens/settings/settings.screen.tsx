import {
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    View,
    Modal,
    Alert,
    FlatList,
} from "react-native";
import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
import { fontSizes } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import useThemeStore from "@/stores/themeStore";
import { Screen } from "@/components/layout/Screen";
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import DatePicker from 'react-native-date-picker';
import { Platform } from 'react-native';
import { useTransactionStore } from "@/stores/transactionStore";
import { useCategoryStore } from "@/stores/categoryStore";
import { Transaction } from "@/types";

interface Category {
    id: string;
    name: string;
    color: string;
    icon: string;
    type: string;
}

interface CSVRow {
    [key: string]: string;
}

interface ColumnMapping {
    csvColumn: string | null;
    appField: string;
    required: boolean;
}

export default function SettingsScreen() {
    const { colors, tokens } = useTheme();
    const { theme, setTheme } = useThemeStore();
    const { transactions, fetchTransactions, saveBulkTransactions } = useTransactionStore();
    const { categories, fetchCategories, saveCategory } = useCategoryStore(); // Use category store
    const [courseUpdates, setCourseUpdates] = useState<any>("");
    const [supportTicketResponse, setSupportTicketResponse] = useState<any>("");
    const [latestUpdates, setLatestUpdates] = useState<any>("");
    const [showExportModal, setShowExportModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showColumnSelectorModal, setShowColumnSelectorModal] = useState(false);
    const [selectedField, setSelectedField] = useState<string | null>(null);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [csvData, setCsvData] = useState<CSVRow[]>([]);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([
        { csvColumn: null, appField: "date", required: true },
        { csvColumn: null, appField: "amount", required: true },
        { csvColumn: null, appField: "category", required: true },
        { csvColumn: null, appField: "type", required: false },
        { csvColumn: null, appField: "mode", required: false },
        { csvColumn: null, appField: "paidTo", required: false },
    ]);

    useEffect(() => {
        fetchTransactions();
        fetchCategories(); // Fetch categories on mount
    }, [fetchTransactions, fetchCategories]);

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

    const importCSV = async () => {
        try {
            console.log("Opening document picker...");
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/comma-separated-values', '*/*'],
                copyToCacheDirectory: true,
            });
            console.log("Picker result:", result);

            if (result.canceled) {
                console.log("User cancelled the picker");
                return;
            }

            if (!result.assets || result.assets.length === 0) {
                throw new Error("No file selected");
            }

            const { uri } = result.assets[0];
            console.log("Selected file URI:", uri);

            const fileContent = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.UTF8,
            });
            console.log("File content:", fileContent);

            const rows = fileContent.split('\n').filter(row => row.trim() !== '');
            if (rows.length === 0) {
                throw new Error("CSV file is empty");
            }

            const headers = rows[0].split(',').map(header => header.trim().replace(/"/g, ''));
            console.log("CSV headers:", headers);

            const data = rows.slice(1).map(row => {
                const values = row.split(',').map(value => value.trim().replace(/"/g, ''));
                const rowData: CSVRow = {};
                headers.forEach((header, index) => {
                    rowData[header] = values[index] || '';
                });
                return rowData;
            }).filter(row => Object.values(row).some(val => val !== ''));

            console.log("Parsed CSV data:", data);

            if (data.length === 0) {
                throw new Error("No valid data found in CSV");
            }

            setCsvHeaders(headers);
            setCsvData(data);
            setShowImportModal(true);
        } catch (error) {
            console.error('Error importing CSV:', error);
            Alert.alert(
                "Import Failed",
                error instanceof Error ? error.message : "There was an error reading the file. Please try again.",
                [{ text: "OK" }]
            );
        }
    };

    const handleImport = async () => {
        const missingRequired = columnMappings.filter(m => m.required && !m.csvColumn);
        if (missingRequired.length > 0) {
            Alert.alert("Error", `Please map all required fields: ${missingRequired.map(m => m.appField).join(', ')}`);
            return;
        }

        const newTransactions: Transaction[] = [];
        const existingCategories = new Map<string, Category>(
            categories.map(c => [c.name.toLowerCase(), c])
        );
        const newCategories: Category[] = [];

        for (const row of csvData) {
            const transaction: Partial<Transaction> = {
                id: `${Date.now()}-${newTransactions.length}`,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                source: { type: "auto" },
            };

            columnMappings.forEach(mapping => {
                if (mapping.csvColumn) {
                    const value = row[mapping.csvColumn];
                    switch (mapping.appField) {
                        case "date":
                            transaction.date = new Date(value).toISOString();
                            break;
                        case "amount":
                            transaction.amount = parseFloat(value);
                            break;
                        case "category":
                            if (value) {
                                const categoryNameLower = value.toLowerCase();
                                let category = existingCategories.get(categoryNameLower);
                                if (!category) {
                                    category = {
                                        id: `${Date.now()}-${newCategories.length}`,
                                        name: value, // Keep original case for display
                                        color: "#0B7189",
                                        icon: "❗", // Default icon
                                        type: "expense",
                                    };
                                    newCategories.push(category);
                                    existingCategories.set(categoryNameLower, category);
                                    saveCategory(category); // Persist new category
                                }
                                transaction.category = category;
                            }
                            break;
                        case "type":
                            transaction.type = value;
                            break;
                        case "mode":
                            transaction.mode = value;
                            break;
                        case "paidTo":
                            transaction.paidTo = value;
                            break;
                    }
                }
            });

            transaction.type = transaction.type || "expense";
            transaction.mode = transaction.mode || "Cash";
            transaction.paidTo = transaction.paidTo || "Unknown Recipient";

            if (transaction.date && !isNaN(Date.parse(transaction.date)) && !isNaN(transaction.amount!) && transaction.category) {
                newTransactions.push(transaction as Transaction);
            } else {
                console.warn("Skipping invalid transaction:", transaction);
            }
        }

        try {
            console.log("Saving transactions:", newTransactions);
            console.log("New categories created:", newCategories);
            await saveBulkTransactions(newTransactions);
            setShowImportModal(false);
            Alert.alert("Import Successful", `${newTransactions.length} transactions imported. ${newCategories.length} new categories created.`);
            fetchTransactions();
            fetchCategories(); // Refresh categories
        } catch (error) {
            console.error('Error saving imported transactions:', error);
            Alert.alert("Import Failed", "There was an error saving the transactions. Please try again.");
        }
    };

    const renderMappingItem = ({ item }: { item: ColumnMapping }) => (
        <View style={styles.mappingItem}>
            <Text style={[styles.normalText, { color: colors.text }]}>
                {item.appField} {item.required ? "(Required)" : ""}
            </Text>
            <Pressable
                style={[styles.dropdownButton, { borderColor: colors.text }]}
                onPress={() => {
                    setSelectedField(item.appField);
                    setShowColumnSelectorModal(true);
                }}
            >
                <Text style={{ color: colors.text }}>
                    {item.csvColumn || "Select column"}
                </Text>
            </Pressable>
        </View>
    );

    const renderColumnOption = ({ item }: { item: string }) => (
        <Pressable
            style={styles.columnOption}
            onPress={() => {
                setColumnMappings(prev =>
                    prev.map(m =>
                        m.appField === selectedField ? { ...m, csvColumn: item === "None" ? null : item } : m
                    )
                );
                setShowColumnSelectorModal(false);
            }}
        >
            <Text style={[styles.normalText, { color: colors.text }]}>{item}</Text>
        </Pressable>
    );

    return (
        <Screen style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar />
            <View style={{
                flexDirection: "row",
                alignItems: "center",
                height: 50,
                backgroundColor: colors.background,
                paddingHorizontal: 20,
                paddingBottom: 10,
                shadowColor: colors.accent,
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 1,
                elevation: 5,
            }}>
                <Pressable onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <AntDesign name="left" size={20} color={colors.primary} />
                    <Text style={{ color: colors.text, fontSize: fontSizes.FONT20 }}>Back</Text>
                </Pressable>
                <Text style={{ color: colors.text, textAlign: "center", fontSize: fontSizes.FONT22 }}>Settings</Text>
            </View>

            <ScrollView style={{ padding: 20 }}>
                <Text style={[styles.sectionHeader, { color: colors.text }]}>Push Notifications</Text>
                {/* ... existing notification settings ... */}

                <View style={styles.settingSection}>
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>Appearance</Text>
                    {/* ... existing appearance settings ... */}

                    <Pressable onPress={() => setShowExportModal(true)} style={styles.settingItem}>
                        <Text style={[styles.normalText, { color: colors.text }]}>Export Data</Text>
                    </Pressable>
                    <Pressable onPress={importCSV} style={styles.settingItem}>
                        <Text style={[styles.normalText, { color: colors.text }]}>Import Data</Text>
                    </Pressable>
                </View>
            </ScrollView>

            <Modal animationType="slide" transparent={true} visible={showExportModal} onRequestClose={() => setShowExportModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.bottomSheet, { backgroundColor: colors.background }]}>
                        <Text style={[styles.sectionHeader, { color: colors.text }]}>Export Transactions</Text>
                        <Pressable style={styles.exportOption} onPress={() => exportToCSV('all')}>
                            <Text style={[styles.normalText, { color: colors.text }]}>Export All Transactions</Text>
                        </Pressable>
                        <View style={styles.dateRangeContainer}>
                            <Text style={[styles.normalText, { color: colors.text }]}>Custom Date Range</Text>
                            <Pressable onPress={() => setShowStartPicker(true)} style={styles.dateButton}>
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
                            <Pressable onPress={() => setShowEndPicker(true)} style={styles.dateButton}>
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
                            <Pressable style={[styles.exportButton, { backgroundColor: colors.primary }]} onPress={() => exportToCSV('custom')}>
                                <Text style={styles.exportButtonText}>Export Range</Text>
                            </Pressable>
                        </View>
                        <Pressable onPress={() => setShowExportModal(false)} style={styles.closeButton}>
                            <Text style={[styles.normalText, { color: colors.text }]}>Close</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal animationType="slide" transparent={true} visible={showImportModal} onRequestClose={() => setShowImportModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.bottomSheet, { backgroundColor: colors.background }]}>
                        <Text style={[styles.sectionHeader, { color: colors.text }]}>Import Transactions</Text>
                        <Text style={[styles.normalText, { color: colors.text }]}>Map CSV columns to app fields:</Text>
                        <FlatList
                            data={columnMappings}
                            renderItem={renderMappingItem}
                            keyExtractor={item => item.appField}
                            style={{ maxHeight: 300 }}
                        />
                        <Pressable style={[styles.exportButton, { backgroundColor: colors.primary }]} onPress={handleImport}>
                            <Text style={styles.exportButtonText}>Import</Text>
                        </Pressable>
                        <Pressable onPress={() => setShowImportModal(false)} style={styles.closeButton}>
                            <Text style={[styles.normalText, { color: colors.text }]}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={showColumnSelectorModal}
                onRequestClose={() => setShowColumnSelectorModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.bottomSheet, { backgroundColor: colors.background }]}>
                        <Text style={[styles.sectionHeader, { color: colors.text }]}>
                            Select Column for {selectedField}
                        </Text>
                        <FlatList
                            data={["None", ...csvHeaders]}
                            renderItem={renderColumnOption}
                            keyExtractor={item => item}
                            style={{ maxHeight: 300 }}
                        />
                        <Pressable
                            style={styles.closeButton}
                            onPress={() => setShowColumnSelectorModal(false)}
                        >
                            <Text style={[styles.normalText, { color: colors.text }]}>Close</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </Screen>
    );
}

const styles = StyleSheet.create({
    settingSection: { marginBottom: 30 },
    sectionHeader: { fontSize: fontSizes.FONT23, fontFamily: "Poppins_600SemiBold", marginBottom: 10 },
    settingItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
    normalText: { fontSize: fontSizes.FONT19, opacity: 0.9, fontFamily: "Poppins_500Medium" },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    bottomSheet: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: 400 },
    exportOption: { paddingVertical: 15 },
    dateRangeContainer: { marginVertical: 15 },
    dateButton: { paddingVertical: 10, marginVertical: 5 },
    exportButton: { padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15 },
    exportButtonText: { color: '#fff', fontSize: fontSizes.FONT18, fontFamily: "Poppins_500Medium" },
    closeButton: { paddingVertical: 15, alignItems: 'center' },
    mappingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
    dropdownButton: { borderWidth: 1, padding: 8, borderRadius: 4 },
    columnOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#ccc' },
});