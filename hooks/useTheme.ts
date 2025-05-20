// hooks/useTheme.ts
import { Platform, useColorScheme as useNativeColorScheme } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
// import * as NavigationBar from 'expo-navigation-bar';
import { lightTheme, darkTheme, tokens } from '@/constants/theme';
import usePreferenceStore from '@/stores/preferenceStore';

export function useTheme() {
    const systemColorScheme = useNativeColorScheme();
    const { theme } = usePreferenceStore();
    
    // Determine if dark mode is active based on preference and system
    const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
    
    // Get the current theme colors based on dark/light status
    const colors = isDark ? darkTheme : lightTheme;

    // Get semantic color with fallback
    const getColor = useCallback(
        (color: keyof typeof colors | string) => {
            return (colors as any)[color] || color;
        },
        [colors]
    );

    // Shadow utility
    const getShadow = useCallback(
        (elevation: number) => ({
            shadowColor: colors.shadowMedium,
            shadowOffset: {
                width: 0,
                height: elevation,
            },
            shadowOpacity: 0.1,
            shadowRadius: elevation * 0.75,
            elevation: elevation,
        }),
        [colors]
    );

    // Platform specific utilities
    // const setNavBarColor = useCallback(async () => {
    //     if (Platform.OS === 'android') {
    //         await NavigationBar.setBackgroundColorAsync(colors.background);
    //         await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
    //     }
    // }, [colors, isDark]);

    // Update the resolvedTheme in the store for any components that need it directly
    useEffect(() => {
        const resolvedTheme = isDark ? 'dark' : 'light';
        usePreferenceStore.setState({ resolvedTheme });
    }, [isDark]);

    return {
        isDark,
        colors,
        tokens,
        getColor,
        getShadow,
        // setNavBarColor,
        // Add a convenience property for direct theme value
        colorScheme: isDark ? 'dark' : 'light',
    };
}

// Example usage with styled components (if you're using them)
export const theme = {
    light: lightTheme,
    dark: darkTheme,
    tokens,
};