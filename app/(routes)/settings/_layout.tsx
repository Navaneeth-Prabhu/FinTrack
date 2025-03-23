import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useTheme } from '@/hooks/useTheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.

export default function _layout() {
    const colorScheme = useColorScheme();
    const { colors } = useTheme();

    return (
        <Stack screenOptions={{
            headerShown: true, headerStyle: { backgroundColor: colors.background },
            headerTitleStyle: { color: colors.text }, navigationBarColor: colors.text,
            animation: 'fade'
        }}>
            <Stack.Screen name="themes" options={{ headerShown: true }} />
            <Stack.Screen name="index" options={{ headerShown: true, title: 'Settings' }} />
            <Stack.Screen name="support/index" options={{ headerShown: true }} />
        </Stack>
    );
}
