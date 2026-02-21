import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetFooter, BottomSheetView } from '@gorhom/bottom-sheet';
import { Href, router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Category } from '@/types';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '../common/ThemedText';
import { tokens } from '@/constants/theme';

interface CategoryBottomSheetProps {
    isVisible: boolean;
    onClose: () => void;
    onSelectCategory: (category: Category) => void;
    type: 'income' | 'expense' | 'transfer' | 'investment';
    setType: (type: 'income' | 'expense' | 'transfer' | 'investment') => void;
}

const CategoryBottomSheet: React.FC<CategoryBottomSheetProps> = ({
    isVisible,
    onClose,
    onSelectCategory,
    type,
    setType
}) => {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const [newCategory, setNewCategory] = useState('');
    const [iconBackgroundColor, setIconBackgroundColor] = useState<string | null>(null); // Track icon color
    const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'transfer' | 'investment'>('income');
    const { colors } = useTheme();

    const { categories, fetchCategories } = useCategoryStore();

    useEffect(() => {
        fetchCategories();
    }, [])

    useEffect(() => {
        setFilter(type);
    }, [type]);

    useEffect(() => {
        if (isVisible) {
            bottomSheetModalRef.current?.present();
        } else {
            bottomSheetModalRef.current?.dismiss();
        }
    }, [isVisible]);

    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const handleCategorySelect = useCallback((category: Category) => {
        onSelectCategory(category);
        onClose();
    }, [onSelectCategory, onClose]);


    const applyFilter = useCallback((selectedFilter: 'income' | 'expense' | 'transfer' | 'investment') => {
        setFilter(selectedFilter);
        setType(selectedFilter);
    }, []);

    const filteredCategories = useMemo(() =>
        categories.filter(cat => cat.type === filter),
        [categories, filter]
    );

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
            />
        ),
        []
    );

    const handleEditCategory = () => {
        router.push('/category/categoryList');
        onClose();
    }
    const renderFooter = useCallback(
        (props: any) => (
            <BottomSheetFooter {...props} bottomInset={0}>
                <View style={[styles.filterContainer, { backgroundColor: colors.card }]}>
                    <View style={[styles.filterButtons, { borderColor: colors.border }]}>
                        <TouchableOpacity
                            onPress={() => applyFilter('income')}
                            style={[
                                styles.filterButton,
                                filter === 'income' && { backgroundColor: colors.accent },
                            ]}
                        >
                            <ThemedText style={{ color: colors.text }}>Income</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => applyFilter('expense')}
                            style={[
                                styles.filterButton,
                                filter === 'expense' && { backgroundColor: colors.accent },
                            ]}
                        >
                            <ThemedText style={{ color: colors.text }}>Expense</ThemedText>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        onPress={() => handleEditCategory()}
                        style={[
                            styles.filterButton,
                            { backgroundColor: colors.accent },
                        ]}
                    >
                        <ThemedText style={{ color: colors.text, textAlignVertical: 'center' }}>New</ThemedText>
                    </TouchableOpacity>
                </View>
            </BottomSheetFooter>
        )
        , [applyFilter, filter]);

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            index={1}
            snapPoints={useMemo(() => ['55%'], [])}
            onChange={handleSheetChanges}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
            backgroundStyle={{ backgroundColor: colors.card }}
            handleIndicatorStyle={{ display: 'none' }}
            footerComponent={renderFooter}
        >
            <BottomSheetView style={[styles.contentContainer]}>
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <ThemedText style={[styles.title, { color: colors.text }]}>
                            Select Category
                        </ThemedText>
                        <View style={styles.iconContainer} >
                            <MaterialIcons
                                onPress={() => handleEditCategory()}
                                name="edit" size={20}
                                color={colors.text}
                            />
                            <Ionicons
                                onPress={() => onClose()}
                                name="close" size={26}
                                color={colors.text}
                            />
                        </View>
                    </View>

                </View>
                <BottomSheetScrollView
                    contentContainerStyle={{
                        paddingBottom: 20, // Padding for smooth scrolling
                    }}
                >
                    <View style={styles.categoryContainer}>
                        {filteredCategories.map((item, index) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.categoryButton,
                                    {
                                        backgroundColor: colors.card,
                                        borderColor: item.color,
                                        // borderColor: lightenColor(item.color, 40)
                                    },
                                ]}
                                onPress={() => handleCategorySelect(item)}
                            >
                                <ThemedText>
                                    {item.icon} {item.name}
                                </ThemedText>
                            </TouchableOpacity>
                        ))}
                    </View>
                </BottomSheetScrollView>
            </BottomSheetView>
        </BottomSheetModal>
    );
};


const styles = StyleSheet.create({
    contentContainer: {
        // flex: 1,
        // padding: 16,
        paddingHorizontal: 16,
    },
    header: {
        // backgroundColor: 'white',
        marginBottom: 16,
        gap: 6,
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10
    },
    title: {
        fontSize: 18,
        fontWeight: tokens.fontWeight.semibold,
        marginBottom: 8,
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        paddingBottom: 32
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
    list: {
        flex: 1,
    },
    categoryItem: {
        width: '33%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
    },
    iconCircle: {
        height: 40,
        width: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryIcon: {
        fontSize: 18,
        color: 'white',
    },
    categoryName: {
        textAlign: 'center',
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
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        // paddingBottom: 24,
        alignItems: 'center',
    },
    categoryButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1.5,
        margin: 6,
        // width:100,
    },
});

export default CategoryBottomSheet;
