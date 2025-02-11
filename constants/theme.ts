export const lightTheme = {
    // Base colors
    background: '#FAFAFA',
    foreground: '#000000',
    card: '#FFFFFF',
    cardForeground: '#000000',
    primary: '#8F85FF',
    primaryForeground: '#FFFFFF',
    secondary: '#8F85FF',
    text: '#000000',
    subtitle: '#72727A',

    // Semantic colors
    accent: '#F6F6F7',
    accentForeground: '#1F1F1F',
    muted: '#F1F1F1',
    mutedForeground: '#737373',

    // State colors
    success: '#22C55E',
    successForeground: '#FFFFFF',
    warning: '#F59E0B',
    warningForeground: '#FFFFFF',
    error: '#EF4444',
    errorForeground: '#FFFFFF',
    info: '#3B82F6',
    infoForeground: '#FFFFFF',

    // Border & Shadow
    border: 'rgba(0, 0, 0, 0.1)',
    shadowLight: 'rgba(0, 0, 0, 0.05)',
    shadowMedium: 'rgba(0, 0, 0, 0.1)',

    // Input & Form
    input: '#FFFFFF',
    inputForeground: '#000000',
    ring: 'rgba(143, 133, 255, 0.3)', // Based on primary color
} as const;

export const darkTheme = {
    // Base colors
    background: '#111111',
    foreground: '#FFFFFF',
    card: '#1E1E1E',
    cardForeground: '#FFFFFF',
    primary: '#8F85FF',
    primaryForeground: '#FFFFFF',
    secondary: '#8F85FF',
    text: '#FAFAFA',
    subtitle: '#A2A2AB',

    // Semantic colors
    accent: '#2C2C2E',
    accentForeground: '#FFFFFF',
    muted: '#2C2C2E',
    mutedForeground: '#A1A1AA',

    // State colors
    success: '#22C55E',
    successForeground: '#FFFFFF',
    warning: '#F59E0B',
    warningForeground: '#FFFFFF',
    error: '#EF4444',
    errorForeground: '#FFFFFF',
    info: '#3B82F6',
    infoForeground: '#FFFFFF',

    // Border & Shadow
    border: 'rgba(255, 255, 255, 0.1)',
    shadowLight: 'rgba(0, 0, 0, 0.3)',
    shadowMedium: 'rgba(0, 0, 0, 0.4)',

    // Input & Form
    input: '#2C2C2E',
    inputForeground: '#FFFFFF',
    ring: 'rgba(143, 133, 255, 0.3)', // Based on primary color
} as const;

type ThemeType = typeof lightTheme;
type ThemeColor = keyof ThemeType;

// For component specific tokens
export const tokens = {
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },
    borderRadius: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        full: 9999,
    },
    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 32,
    },
    fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },
} as const;