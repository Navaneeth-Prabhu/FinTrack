import { Dimensions, StyleSheet, Text, TouchableOpacity, View, TextInput, ScrollView } from 'react-native';
import React, { useLayoutEffect, useState } from 'react';
import { ThemedText } from '@/components/common/ThemedText';
import { router, useLocalSearchParams } from 'expo-router';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTheme } from '@/hooks/useTheme';
import { categoryIcons, ColorsConstants, emojiConstants } from '@/constants/categories';
import { Colors } from '@/constants/Colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEMS_PER_ROW = 7;
const SPACING = 8; // Adjust spacing between items

// Calculate item size dynamically (Subtract spacing to prevent overflow)
const ITEM_SIZE = (SCREEN_WIDTH - (SPACING * (ITEMS_PER_ROW + 10))) / ITEMS_PER_ROW;

const CategoryFromScreen = () => {
    const { id, edit = "false" } = useLocalSearchParams<{ id: string, edit?: string }>();
    const { categories, updateCategory, saveCategory } = useCategoryStore();
    const category = categories.find(c => c.id === id);
    const { colors } = useTheme();
    const [name, setName] = useState(category?.name || '');
    const [icon, setIcon] = useState(category?.icon || '');
    const [type, setType] = useState(category?.type || 'expense');
    const [color, setColor] = useState(category?.color || 'white');
    const [activeTab, setActiveTab] = useState('icons'); // Default tab
    const [selectedIcon, setSelectedIcon] = useState({ type: 'emoji', value: emojiConstants[0] });

    useLayoutEffect(() => {
        if (edit === "true" && category) {

        }
    })

    const handleSubmit = () => {
        if (name && icon && type) {
            if (edit === "true" && category) {
                updateCategory({ ...category, name, icon, type, color });
            } else {
                saveCategory({ id: Date.now().toString(), name, icon, type, color });
            }
            router.back();
        } else {
            console.log("Missing required fields: name, icon, or type");
        }
    };
    const IconComponent = categoryIcons.lucide.find(i => i.name === icon)?.component;

    console.log("IconComponent", IconComponent);
    return (
        <>
            <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
                <ThemedText style={styles.title}>{edit === "true" ? "Edit Category" : "New Category"}</ThemedText>

                {/* Icon Preview */}
                <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
                    <View style={[styles.iconCircle, { backgroundColor: color || colors.primary }]}>
                        {
                            IconComponent !== undefined
                                ? <IconComponent size={24} strokeWidth={2} color={colors.text} />
                                : <Text style={styles.categoryIcon}>{icon}</Text>
                        }
                       
                    </View>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                        placeholder="Category Name"
                        placeholderTextColor={colors.subtitle}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                {/* Colors Selection */}
                <ThemedText style={styles.sectionTitle}>Pick a Color</ThemedText>
                <View style={styles.selectionContainer}>
                    {ColorsConstants.map((c, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.selectionItem,
                                { backgroundColor: c, borderColor: c === color ? colors.subtitle : 'transparent' }
                            ]}
                            onPress={() => setColor(c)}
                        />
                    ))}
                </View>

                {/* Icons Selection */}
                <ThemedText style={styles.sectionTitle}>Pick an Icon</ThemedText>
                <View style={styles.selectionContainer}>
                    {emojiConstants.map((emoji, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.iconItem, { backgroundColor: colors.card }]}
                            onPress={() => setIcon(emoji)}
                        >
                            <Text style={styles.iconText}>{emoji}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {activeTab === 'icons' && (
                    <View style={styles.iconsGrid}>
                        {categoryIcons.lucide.map((icon, index) => {
                            const IconComponent = icon.component;
                            return (
                                <TouchableOpacity
                                    key={`icon-${index}`}
                                    style={[styles.iconItem, { backgroundColor: colors.card }]}
                                    onPress={() => setIcon(icon.name)}
                                >
                                    <IconComponent size={24} strokeWidth={2} color={colors.text} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

            </ScrollView>

            {/* Save Button */}
            {/* <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
                    <Text style={styles.saveButtonText}>{edit === "true" ? "Update Category" : "Save Category"}</Text>
                </TouchableOpacity>
            </View> */}
            <View style={styles.saveButtonContainer}>
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={handleSubmit}
                >
                    <Text style={styles.saveButtonText}>{edit === "true" ? "Update Category" : "Save Category"}</Text>
                </TouchableOpacity>
            </View>
        </>
    );
};

export default CategoryFromScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        padding: 12,
        borderRadius: 12,
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    categoryIcon: {
        fontSize: 24,
    },
    input: {
        flex: 1,
        height: 45,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 16,
        fontSize: 16,
        marginLeft: 12
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
    },
    selectionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: SPACING, // Ensures consistent spacing
    },
    selectionItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        borderRadius: 10,
        borderWidth: 3,
    },
    iconItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 18,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    saveButtonContainer: {
        position: 'absolute',
        width: '100%',
        padding: 20,
        paddingBottom: 32,
        alignItems: 'center',
        bottom: 0,
    },
    saveButton: {
        width: '100%',
        alignItems: 'center',
        height: 50,
        borderRadius: 10,
        marginBottom: 16,
        justifyContent: 'center'
    },
    // selectionContainer: {
    //     width: '100%',
    //     marginVertical: 10,
    //   },
    tabSelector: {
        flexDirection: 'row',
        marginBottom: 15,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        // borderColor: colors.border,
        alignSelf: 'center',
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: Colors.dark.background,
    },
    activeTab: {
        // backgroundColor: colors.primary,
    },
    iconsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    //   iconItem: {
    //     width: '16%', // For 6 items per row
    //     aspectRatio: 1,
    //     justifyContent: 'center',
    //     alignItems: 'center',
    //     margin: '2%',
    //     borderRadius: 8,
    //   },
    //   iconText: {
    //     fontSize: 22,
    //   }
});
