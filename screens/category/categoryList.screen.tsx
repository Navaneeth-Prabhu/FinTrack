import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useEffect, useState } from 'react'
import { router } from 'expo-router';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTheme } from '@/hooks/useTheme';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { ThemedText } from '@/components/common/ThemedText';

interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
}

const CategoryListScreen = () => {
    const { colors } = useTheme();
    const { categories } = useCategoryStore();
    const [data, setData] = useState<Category[]>(categories || []);
    const [filter, setFilter] = useState<'income' | 'expense'>('expense');

    useEffect(() => {
        const filteredData = (categories || []).filter(item => item.type === filter);
        setData(filteredData);
    }, [categories, filter]);

    const handleReorder = (newOrder: Category[]) => {
        // dispatch(reorderCategories(newOrder));
        setData(newOrder);
    };

    const handleDelete = (id: string) => {
        // dispatch(removeCategory(id));
    };

    console.log(categories,
        'categories'
    )
    return (
        <View style={{ flex: 1, paddingHorizontal: 16, backgroundColor: colors.background }}>
            <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.filterButtons, { borderColor: colors.border }]}>
                    <TouchableOpacity
                        onPress={() => setFilter('income')}
                        style={[
                            styles.filterButton,
                            filter === 'income' && { backgroundColor: colors.accent },
                        ]}
                    >
                        <ThemedText style={{ color: colors.text }}>Income</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setFilter('expense')}
                        style={[
                            styles.filterButton,
                            filter === 'expense' && { backgroundColor: colors.accent },
                        ]}
                    >
                        <ThemedText style={{ color: colors.text }}>Expense</ThemedText>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    onPress={() => router.push('/category/categoryForm')}
                    style={[styles.filterButton, { backgroundColor: colors.accent }]}
                >
                    <ThemedText style={{ color: colors.text, textAlignVertical: 'center' }}>
                        New
                    </ThemedText>
                </TouchableOpacity>
            </View>
            <DraggableFlatList
                data={data}
                renderItem={({ item, drag, isActive }) => (
                    <TouchableOpacity
                        onLongPress={drag}

                        style={{
                            backgroundColor: colors.card,
                            padding: 10,
                            flexDirection: 'row',
                            gap: 20,
                            alignItems: 'center',
                        }}
                        onPress={() => router.push({
                            pathname: '/category/categoryForm',
                            params: { edit: "true", transactionId: item.id }
                        })}
                    >
                        <View
                            style={{
                                width: 30,
                                height: 30,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 8,
                                position: 'relative',
                                overflow: 'hidden',
                                backgroundColor: colors.card,
                            }}
                        >
                            <View
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    right: 0,
                                    backgroundColor: item.color,
                                    opacity: 0.9,
                                }}
                            />
                            <ThemedText>{item.icon}</ThemedText>
                        </View>
                        <ThemedText>{item.name}</ThemedText>
                    </TouchableOpacity>
                )}
                keyExtractor={item => item.id}
                onDragEnd={({ data }) => handleReorder(data)}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth }} />}
                ListFooterComponent={() => <View style={{ height: 100 }} />}
                ListHeaderComponent={() => <View style={{ height: 100 }} />}
            />
        </View>
    );
};

export default CategoryListScreen;
const styles = StyleSheet.create({
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        left: 0,
        zIndex: 999,
        padding: 16,
        paddingBottom: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    filterContainer: {
        padding: 16,
        paddingBottom: 34
    },
    filterButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        borderWidth: 2,
        borderRadius: 50
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 50,
    },
    activeFilter: {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
})
