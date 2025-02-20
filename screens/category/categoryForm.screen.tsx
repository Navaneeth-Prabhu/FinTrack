import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useState } from 'react'
import { ScrollView, TextInput } from 'react-native-gesture-handler'
import { ThemedText } from '@/components/common/ThemedText'
import { router, useLocalSearchParams } from 'expo-router'
import { useCategoryStore } from '@/stores/categoryStore'
import { useTheme } from '@/hooks/useTheme'
import { ColorsConstants, emojiConstants } from '@/constants/categories'

const CategoryFromScreen = () => {
    const { id, edit = "false" } = useLocalSearchParams<{ id: string, edit?: string }>()
    const { categories, updateCategory, saveCategory } = useCategoryStore()
    const category = categories.find(c => c.id === id)
    const { colors } = useTheme()
    const [name, setName] = useState(category?.name || '')
    const [icon, setIcon] = useState(category?.icon || '')
    const [type, setType] = useState(category?.type || 'expense')
    const [color, setColor] = useState(category?.color || 'white')

    const handleSubmit = () => {

        // Ensure all required fields are present and non-empty
        if (name && icon && type) {
            if (edit === "true" && category) {
                // Update existing category
                updateCategory({
                    ...category,
                    name,
                    icon,
                    type,
                    color, // Will be undefined if not set
                });
            } else {
                // Create new category
                saveCategory({
                    id: Date.now().toString(),
                    name,
                    icon,
                    type,
                    color, // Will be undefined if not set
                });
            }
            router.back();
        } else {
            console.log("Missing required fields: name, icon, or type");
        }
    };
    return (
        <ScrollView style={{ flex: 1, padding: 16 }}>
            <ThemedText>Edit Category</ThemedText>
            <View style={styles.addCategoryContainer}>
                <View
                    style={[
                        styles.iconCircle,
                        { backgroundColor: color || colors.primary },
                    ]}
                >
                    <Text style={styles.categoryIcon}>
                        {icon}
                    </Text>
                </View>
                <TextInput
                    style={[
                        styles.input,
                        { color: colors.text, borderColor: colors.border },
                    ]}
                    placeholder="New category"
                    placeholderTextColor={colors.subtitle}
                    value={name}
                    onChangeText={setName}
                />
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={handleSubmit}
                >
                    <Text style={{ color: colors.text, textAlign: 'center', textAlignVertical: 'center' }}> {edit == "true" ? "Update" : "Save"}</Text>
                </TouchableOpacity>
            </View>
            {/* Type selection */}
            <View style={styles.colorContainer}>
                {
                    ColorsConstants.map((c, index) => (
                        <TouchableOpacity
                            key={index}
                            style={{
                                borderColor: c == color ? c : colors.accent,
                                // backgroundColor: c,
                                width: 35, height: 35,
                                borderWidth: 8,
                                borderRadius: 8
                            }}
                            onPress={() => setColor(c)}
                        >
                            <View style={{ flex: 1, backgroundColor: c, borderRadius: 2 }} />
                        </TouchableOpacity>
                    ))
                }
            </View>
            <View style={styles.colorContainer}>
                {
                    emojiConstants?.map((emoji, index) => (
                        <TouchableOpacity
                            key={index}
                            style={{
                                borderColor: colors.accent,
                                backgroundColor: colors.accent,
                                padding: 5,
                                borderWidth: 8,
                                borderRadius: 8
                            }}
                            onPress={() => setIcon(emoji)}
                        >
                            <Text style={{ fontSize: 20 }}>{emoji}</Text>
                        </TouchableOpacity>
                    ))
                }
            </View>
        </ScrollView>
    )
}

export default CategoryFromScreen

const styles = StyleSheet.create({
    colorContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 10,
        marginTop: 16
    },
    addCategoryContainer: {
        flexDirection: 'row',
        marginTop: 16,
        alignItems: 'center',
        gap: 10,
    },
    input: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        marginRight: 8,
    },
    addButton: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        borderRadius: 20,
        paddingHorizontal: 16,
    },
    iconCircle: {
        // height: 40,
        // width: 40,
        aspectRatio: 1,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10
    },
    categoryIcon: {
        fontSize: 18,
    },
})