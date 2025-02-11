// hooks/useTheme.ts
import { Platform, useColorScheme } from 'react-native';
import { useCallback } from 'react';
// import * as NavigationBar from 'expo-navigation-bar';
import { lightTheme, darkTheme, tokens } from '@/constants/theme';

export function useTheme() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
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

    return {
        isDark,
        colors,
        tokens,
        getColor,
        getShadow,
        // setNavBarColor,
    };
}

// Example usage with styled components (if you're using them)
export const theme = {
    light: lightTheme,
    dark: darkTheme,
    tokens,
};