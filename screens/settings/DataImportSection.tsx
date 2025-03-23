import React, { useState } from 'react';
import { Pressable, Text, View, Alert, FlatList, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/hooks/useTheme';
import { useTransactionStore } from '@/stores/transactionStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { Transaction } from '@/types';
import { fontSizes } from '@/constants/theme';
import ColumnMappingSelector from './ColumnMappingSelector';
import BottomSheetModal from '@/components/bottomSheet/settingsBottomSheet';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/common/ThemedText';

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

const DataImportSection: React.FC = () => {
    const { colors } = useTheme();
    const { transactions, fetchTransactions, saveBulkTransactions } = useTransactionStore();
    const { categories, fetchCategories, saveCategory } = useCategoryStore();
    const [showImportModal, setShowImportModal] = useState(false);
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

    const importCSV = async () => {
        try {
            console.log("Opening document picker...");
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/comma-separated-values', '*/*'],
                copyToCacheDirectory: true,
            });

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
                            transaction.type = value || "expense";
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
            await saveBulkTransactions(newTransactions);
            setShowImportModal(false);
            Alert.alert("Import Successful", `${newTransactions.length} transactions imported. ${newCategories.length} new categories created.`);
            fetchTransactions();
            fetchCategories();
        } catch (error) {
            console.error('Error saving imported transactions:', error);
            Alert.alert("Import Failed", "There was an error saving the transactions. Please try again.");
        }
    };

    return (
        <>
            <Pressable onPress={importCSV} style={styles.settingItem}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primaryForeground }]}>
                    <MaterialCommunityIcons name="database-import" size={20} color={colors.primary} />
                </View>
                <ThemedText style={[styles.menuText]}>Import Data</ThemedText>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} style={styles.chevron} />
            </Pressable>

            <BottomSheetModal
                visible={showImportModal}
                onClose={() => setShowImportModal(false)}
                title="Import Transactions"
            >
                <Text style={[styles.normalText, { color: colors.text }]}>Map CSV columns to app fields:</Text>

                <ColumnMappingSelector
                    columnMappings={columnMappings}
                    setColumnMappings={setColumnMappings}
                    csvHeaders={csvHeaders}
                />

                <Pressable
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={handleImport}
                >
                    <Text style={styles.buttonText}>Import</Text>
                </Pressable>
            </BottomSheetModal>
        </>
    );
};

export default DataImportSection;

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