import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, Modal, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { fontSizes } from '@/constants/theme';


interface ColumnMapping {
    csvColumn: string | null;
    appField: string;
    required: boolean;
}

interface ColumnMappingSelectorProps {
    columnMappings: ColumnMapping[];
    setColumnMappings: React.Dispatch<React.SetStateAction<ColumnMapping[]>>;
    csvHeaders: string[];
}

const ColumnMappingSelector: React.FC<ColumnMappingSelectorProps> = ({
    columnMappings,
    setColumnMappings,
    csvHeaders
}) => {
    const { colors } = useTheme();
    const [showColumnSelectorModal, setShowColumnSelectorModal] = useState(false);
    const [selectedField, setSelectedField] = useState<string | null>(null);

    const renderMappingItem = ({ item }: { item: ColumnMapping }) => (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 }}>
            <Text style={[styles.normalText, { color: colors.text }]}>
                {item.appField} {item.required ? "(Required)" : ""}
            </Text>
            <Pressable
                style={{ borderWidth: 1, padding: 8, borderRadius: 4, borderColor: colors.text }}
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
            style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#ccc' }}
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
        <>
            <FlatList
                data={columnMappings}
                renderItem={renderMappingItem}
                keyExtractor={item => item.appField}
                style={{ maxHeight: 300 }}
            />

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
        </>
    );
};

export default ColumnMappingSelector;

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
        marginBottom: 15 
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
});