import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { useTransactionStore } from '@/stores/transactionStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { Transaction } from '@/types';

export interface Category {
    id: string;
    name: string;
    color: string;
    icon: string;
    type: string;
}

export interface CSVRow {
    [key: string]: string;
}

export interface ColumnMapping {
    csvColumn: string | null;
    appField: string;
    required: boolean;
}

export const useImportExport = () => {
    const { transactions, fetchTransactions, saveBulkTransactions } = useTransactionStore();
    const { categories, fetchCategories, saveCategory } = useCategoryStore();
    
    // Export states
    const [showExportModal, setShowExportModal] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    
    // Import states
    const [showImportModal, setShowImportModal] = useState(false);
    const [showColumnSelectorModal, setShowColumnSelectorModal] = useState(false);
    const [selectedField, setSelectedField] = useState<string | null>(null);
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

    const exportCSV = async (dateRange: 'all' | 'custom') => {
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

    return {
        // Export states and functions
        showExportModal,
        setShowExportModal,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        showStartPicker,
        setShowStartPicker,
        showEndPicker,
        setShowEndPicker,
        exportCSV,
        
        // Import states and functions
        showImportModal,
        setShowImportModal,
        showColumnSelectorModal,
        setShowColumnSelectorModal,
        selectedField,
        setSelectedField,
        csvData,
        csvHeaders,
        columnMappings,
        setColumnMappings,
        importCSV,
        handleImport
    };
};