import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Screen } from '@/components/layout/Screen'
import CategoryFromScreen from '@/screens/category/categoryForm.screen'

const CategoryForm = () => {
    return (
        <Screen>
            <CategoryFromScreen />
        </Screen>
    )
}

export default CategoryForm

const styles = StyleSheet.create({})