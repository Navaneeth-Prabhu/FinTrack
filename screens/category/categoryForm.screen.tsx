import { StyleSheet, Text, TouchableOpacity, View, TextInput, ScrollView, useWindowDimensions } from 'react-native';
import React, { useLayoutEffect, useReducer } from 'react';
import { ThemedText } from '@/components/common/ThemedText';
import { router, useLocalSearchParams } from 'expo-router';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTheme } from '@/hooks/useTheme';
import { categoryIcons, ColorsConstants, emojiConstants } from '@/constants/categories';

type State = {
    name: string;
    icon: string;
    type: 'income' | 'expense' | 'transfer' | 'investment';
    color: string;
    activeTab: string;
};

type Action =
    | { type: 'SET_NAME'; payload: string }
    | { type: 'SET_ICON'; payload: string }
    | { type: 'SET_TYPE'; payload: State['type'] }
    | { type: 'SET_COLOR'; payload: string }
    | { type: 'SET_ACTIVE_TAB'; payload: string };

const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'SET_NAME': return { ...state, name: action.payload };
        case 'SET_ICON': return { ...state, icon: action.payload };
        case 'SET_TYPE': return { ...state, type: action.payload };
        case 'SET_COLOR': return { ...state, color: action.payload };
        case 'SET_ACTIVE_TAB': return { ...state, activeTab: action.payload };
        default: return state;
    }
};

const ITEMS_PER_ROW = 7;
const SPACING = 8;

const CategoryFormScreen = () => {
    const { id, edit = "false" } = useLocalSearchParams<{ id: string, edit?: string }>();
    const { categories, updateCategory, saveCategory } = useCategoryStore();
    const category = categories.find(c => c.id === id);
    const { colors } = useTheme();
    const { width: SCREEN_WIDTH } = useWindowDimensions();

    const [state, dispatch] = useReducer(reducer, {
        name: category?.name || '',
        icon: category?.icon || '❗',
        type: (category?.type as State['type']) || 'expense',
        color: category?.color || '#888888',
        activeTab: 'icons',
    });

    const ITEM_SIZE = (SCREEN_WIDTH - (SPACING * (ITEMS_PER_ROW + 10))) / ITEMS_PER_ROW;

    useLayoutEffect(() => {
        if (edit === "true" && category) {
            // Initialization is handled by initialState
        }
    }, [edit, category]);

    const handleSubmit = () => {
        const { name, icon, type, color } = state;
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

    const IconComponent = categoryIcons.lucide.find(i => i.name === state.icon)?.component;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
                <ThemedText style={styles.title}>{edit === "true" ? "Edit Category" : "New Category"}</ThemedText>

                <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
                    <View style={[styles.iconCircle, { backgroundColor: state.color || colors.primary }]}>
                        {
                            IconComponent !== undefined
                                ? <IconComponent size={24} strokeWidth={2} color={colors.text} />
                                : <Text style={styles.categoryIcon}>{state.icon}</Text>
                        }
                    </View>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                        placeholder="Category Name"
                        placeholderTextColor={colors.subtitle}
                        value={state.name}
                        onChangeText={(text) => dispatch({ type: 'SET_NAME', payload: text })}
                    />
                </View>

                <ThemedText style={styles.sectionTitle}>Transaction Type</ThemedText>
                <View style={[styles.typeSelectionContainer, { backgroundColor: colors.card }]}>
                    {(['income', 'expense', 'transfer', 'investment'] as const).map((t) => (
                        <TouchableOpacity
                            key={t}
                            style={[
                                styles.typeButton,
                                state.type === t && { backgroundColor: t === 'income' ? colors.income : t === 'expense' ? colors.expense : colors.primary }
                            ]}
                            onPress={() => dispatch({ type: 'SET_TYPE', payload: t })}
                        >
                            <ThemedText style={[
                                styles.typeButtonText,
                                state.type === t ? { color: 'white' } : {}
                            ]}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </ThemedText>
                        </TouchableOpacity>
                    ))}
                </View>

                <ThemedText style={styles.sectionTitle}>Pick a Color</ThemedText>
                <View style={styles.selectionContainer}>
                    {ColorsConstants.map((c) => (
                        <TouchableOpacity
                            key={c}
                            style={[
                                styles.selectionItem,
                                {
                                    width: ITEM_SIZE, height: ITEM_SIZE,
                                    backgroundColor: c, borderColor: c === state.color ? colors.subtitle : 'transparent'
                                }
                            ]}
                            onPress={() => dispatch({ type: 'SET_COLOR', payload: c })}
                        />
                    ))}
                </View>

                <ThemedText style={styles.sectionTitle}>Pick an Icon</ThemedText>
                <View style={styles.selectionContainer}>
                    {emojiConstants.map((emoji) => (
                        <TouchableOpacity
                            key={emoji}
                            style={[styles.iconItem, { width: ITEM_SIZE, height: ITEM_SIZE, backgroundColor: colors.card }]}
                            onPress={() => dispatch({ type: 'SET_ICON', payload: emoji })}
                        >
                            <Text style={styles.iconText}>{emoji}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {state.activeTab === 'icons' && (
                    <View style={styles.iconsGrid}>
                        {categoryIcons.lucide.map((icon) => {
                            const Comp = icon.component;
                            return (
                                <TouchableOpacity
                                    key={icon.name}
                                    style={[styles.iconItem, { width: ITEM_SIZE, height: ITEM_SIZE, backgroundColor: colors.card, marginBottom: SPACING }]}
                                    onPress={() => dispatch({ type: 'SET_ICON', payload: icon.name })}
                                >
                                    <Comp size={24} strokeWidth={2} color={colors.text} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            <View style={styles.saveButtonContainer}>
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={handleSubmit}
                >
                    <Text style={styles.saveButtonText}>{edit === "true" ? "Update Category" : "Save Category"}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default CategoryFormScreen;

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
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
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
        gap: SPACING,
    },
    selectionItem: {
        borderRadius: 10,
        borderWidth: 3,
    },
    iconItem: {
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
        padding: 20,
        paddingBottom: 32,
        backgroundColor: 'transparent',
    },
    saveButton: {
        width: '100%',
        alignItems: 'center',
        height: 50,
        borderRadius: 10,
        justifyContent: 'center'
    },
    iconsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: SPACING,
        marginTop: 10,
        paddingBottom: 20
    },
    typeSelectionContainer: {
        flexDirection: 'row',
        padding: 8,
        borderRadius: 12,
        gap: 8,
        justifyContent: 'space-between',
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    typeButtonText: {
        fontSize: 12,
        fontWeight: '600',
    }
});
