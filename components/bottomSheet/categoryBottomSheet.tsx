import React, { useCallback, useRef, useState, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetFooter, BottomSheetView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Category } from '@/types';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '../common/ThemedText';
import { tokens } from '@/constants/theme';

interface CategoryBottomSheetProps {
    onSelectCategory: (category: Category) => void;
    type: 'income' | 'expense' | 'transfer' | 'investment';
    setType: (type: 'income' | 'expense' | 'transfer' | 'investment') => void;
}

export interface CategoryBottomSheetRef {
    present: () => void;
    dismiss: () => void;
}

const CategoryBottomSheet = React.memo(forwardRef<CategoryBottomSheetRef, CategoryBottomSheetProps>(({
    onSelectCategory,
    type,
    setType
}, ref) => {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const { colors } = useTheme();
    const { categories, fetchCategories } = useCategoryStore();

    useEffect(() => {
        fetchCategories();
    }, []);

    useImperativeHandle(ref, () => ({
        present: () => bottomSheetModalRef.current?.present(),
        dismiss: () => bottomSheetModalRef.current?.dismiss(),
    }));

    const handleSheetChanges = useCallback((index: number) => {
        // No-op for now as we don't have an onClose prop anymore
    }, []);

    const handleCategorySelect = useCallback((category: Category) => {
        onSelectCategory(category);
        bottomSheetModalRef.current?.dismiss();
    }, [onSelectCategory]);


    const applyFilter = useCallback((selectedFilter: 'income' | 'expense' | 'transfer' | 'investment') => {
        setType(selectedFilter);
    }, [setType]);

    const filteredCategories = useMemo(() =>
        categories.filter(cat => cat.type === type),
        [categories, type]
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

    const handleEditCategory = useCallback(() => {
        router.push('/category/categoryList');
        bottomSheetModalRef.current?.dismiss();
    }, []);

    const renderFooter = useCallback(
        (props: any) => (
            <BottomSheetFooter {...props} bottomInset={0}>
                <View style={[styles.filterContainer, { backgroundColor: colors.card }]}>
                    <View style={[styles.filterButtons, { borderColor: colors.border }]}>
                        <TouchableOpacity
                            onPress={() => applyFilter('income')}
                            style={[
                                styles.filterButton,
                                type === 'income' && { backgroundColor: colors.accent },
                            ]}
                        >
                            <ThemedText style={{ color: colors.text }}>Income</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => applyFilter('expense')}
                            style={[
                                styles.filterButton,
                                type === 'expense' && { backgroundColor: colors.accent },
                            ]}
                        >
                            <ThemedText style={{ color: colors.text }}>Expense</ThemedText>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        onPress={handleEditCategory}
                        style={[
                            styles.filterButton,
                            { backgroundColor: colors.accent },
                        ]}
                    >
                        <ThemedText style={{ color: colors.text }}>New</ThemedText>
                    </TouchableOpacity>
                </View>
            </BottomSheetFooter>
        )
        , [applyFilter, type, colors, handleEditCategory]);

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            index={0}
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
                            <TouchableOpacity onPress={handleEditCategory}>
                                <MaterialIcons
                                    name="edit" size={20}
                                    color={colors.text}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => bottomSheetModalRef.current?.dismiss()}>
                                <Ionicons
                                    name="close" size={26}
                                    color={colors.text}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                </View>
                <BottomSheetScrollView
                    contentContainerStyle={{
                        paddingBottom: 20, // Padding for smooth scrolling
                    }}
                >
                    <View style={styles.categoryContainer}>
                        {filteredCategories.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.categoryButton,
                                    {
                                        backgroundColor: colors.card,
                                        borderColor: item.color,
                                    },
                                ]}
                                onPress={() => handleCategorySelect(item)}
                            >
                                <ThemedText>{item.icon} {item.name}</ThemedText>
                            </TouchableOpacity>
                        ))}
                    </View>
                </BottomSheetScrollView>
            </BottomSheetView>
        </BottomSheetModal>
    );
}));

const styles = StyleSheet.create({
    contentContainer: {
        paddingHorizontal: 16,
    },
    header: {
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
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1.5,
        margin: 6,
    },
});

export default CategoryBottomSheet;
