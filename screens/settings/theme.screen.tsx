import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import useThemeStore from '@/stores/preferenceStore'
import { Screen } from '@/components/layout/Screen'
import { useTheme } from '@/hooks/useTheme'
import { Ionicons } from '@expo/vector-icons'

const ThemeScreen = () => {
    const { theme, setTheme } = useThemeStore()
    const { colors } = useTheme();
    return (
        <Screen>
            <Text>ThemeScreen</Text>
            <View style={{ gap: 10, backgroundColor: colors.card, padding: 16, overflow: 'hidden', borderRadius: 8 }}>
                <Pressable style={{ flexDirection: 'row', justifyContent: 'space-between' }} onPress={() => setTheme('light')}>
                    <Text style={{ color: colors.text }}>light</Text>
                    <Ionicons name="checkmark-circle" size={24} color={theme === 'light' ? colors.primary : 'transparent'} />
                </Pressable>
                <Pressable style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }} onPress={() => setTheme('dark')}>
                    <Text style={{ color: colors.text }}>dark</Text>
                    <Ionicons name="checkmark-circle" size={24} color={theme === 'dark' ? colors.primary : 'transparent'} />
                </Pressable>
                <Pressable style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }} onPress={() => setTheme('system')}>
                    <Text style={{ color: colors.text }}>system</Text>
                    <Ionicons name="checkmark-circle" size={24} color={theme === 'system' ? colors.primary : 'transparent'} />
                </Pressable>
            </View>
        </Screen>
    )
}

export default ThemeScreen

const styles = StyleSheet.create({})