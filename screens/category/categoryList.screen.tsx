import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { router } from 'expo-router';
import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator
} from 'react-native-draggable-flatlist';
import { Feather } from '@expo/vector-icons';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/common/ThemedText';
import { CategoryIcon } from '@/components/transactions/CategoryIcon';

interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
}

const CategoryListScreen = () => {
    const { colors } = useTheme();
    const { categories, reorderCategories } = useCategoryStore();
    const [data, setData] = useState<Category[]>([]);
    const [filter, setFilter] = useState<'income' | 'expense'>('expense');

    console.log(categories)
    // Ensure consistent filtering and data update
    useEffect(() => {
        const filteredData = (categories || [])
            .filter(item => item.type === filter)
            .sort((a, b) => {
                // Maintain original order within filtered items
                const originalIndex = categories.findIndex(cat => cat.id === a.id);
                const originalIndexB = categories.findIndex(cat => cat.id === b.id);
                return originalIndex - originalIndexB;
            });
        setData(filteredData);
    }, [categories, filter]);

    const handleReorder = (newOrder: Category[]) => {
        // Update local state immediately for smooth UX
        setData(newOrder);

        // Prepare full category list update
        const fullCategoryUpdate = categories.map(category => {
            const newIndex = newOrder.findIndex(item => item.id === category.id);
            return { ...category, order: newIndex };
        }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        // Dispatch update to store
        reorderCategories(fullCategoryUpdate);
    };

    const handleDelete = (id: string) => {
        // Implement delete logic
        // You might want to add a confirmation dialog
        const updatedCategories = categories.filter(cat => cat.id !== id);
        reorderCategories(updatedCategories);
    };

    const renderItem = ({
        item,
        drag,
        isActive
    }: RenderItemParams<Category>) => (
        <ScaleDecorator>
            <View
                style={[
                    styles.itemContainer,
                    {
                        backgroundColor: colors.card,
                        borderColor: isActive ? colors.accent : 'transparent'
                    }
                ]}
            >
                {/* Category Icon */}
                <CategoryIcon category={item} />
                {/* <View
                    style={[
                        styles.iconContainer,
                        { backgroundColor: item.color }
                    ]}
                >
                    <ThemedText style={styles.itemIcon}>{item.icon}</ThemedText>
                </View> */}

                {/* Category Name */}
                <TouchableOpacity
                    onPress={() => router.push({
                        pathname: '/category/categoryForm',
                        params: { edit: "true", id: item.id }
                    })}
                    style={styles.categoryNameContainer}
                >
                    <ThemedText style={styles.categoryName}>
                        {item.name}
                    </ThemedText>
                </TouchableOpacity>

                {/* Delete Button */}
                <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={styles.deleteButton}
                >
                    <Feather name="trash-2" size={20} color={colors.destructive} />
                </TouchableOpacity>

                {/* Drag Handle */}
                <TouchableOpacity
                    onPressIn={drag}
                    style={styles.dragHandle}
                >
                    <Feather name="menu" size={20} color={colors.text} />
                </TouchableOpacity>
            </View>
        </ScaleDecorator>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <DraggableFlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                onDragEnd={({ data: newData }) => handleReorder(newData)}
                containerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContentContainer}
            />

            {/* Filter Section */}
            <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.filterButtons, { borderColor: colors.border }]}>
                    {(['income', 'expense'] as const).map(type => (
                        <TouchableOpacity
                            key={type}
                            onPress={() => setFilter(type)}
                            style={[
                                styles.filterButton,
                                filter === type && {
                                    backgroundColor: colors.accent
                                }
                            ]}
                        >
                            <ThemedText style={{ color: colors.text }}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </ThemedText>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* New Category Button */}
                <TouchableOpacity
                    onPress={() => router.push('/category/categoryForm')}
                    style={[styles.newButton, { backgroundColor: colors.accent }]}
                >
                    <Feather name="plus" size={20} color={colors.text} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContainer: {
        paddingHorizontal: 16,
    },
    listContentContainer: {
        paddingTop: 16,
        paddingBottom: 100,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 2,
        gap: 10,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemIcon: {
        fontSize: 18,
    },
    categoryNameContainer: {
        flex: 1,
    },
    categoryName: {
        fontSize: 16,
    },
    deleteButton: {
        marginRight: 12,
        padding: 8,
    },
    dragHandle: {
        padding: 8,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        paddingBottom: 32,
    },
    filterButtons: {
        flexDirection: 'row',
        borderWidth: 2,
        borderRadius: 50,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 50,
    },
    newButton: {
        padding: 12,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default CategoryListScreen;