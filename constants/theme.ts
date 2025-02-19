import { Dimensions, DimensionValue, PixelRatio } from "react-native";

export const lightTheme = {
    // Base colors
    background: '#F8F9FC',           // Slightly blue-tinted white for depth
    secondaryBackground: '#FFFFFF',   // Pure white for secondary areas
    foreground: '#000000',
    card: '#FFFFFF',
    secondarycard: '#F8F9FC',                // Pure white for cards
    cardForeground: '#000000',
    primary: '#8F85FF',
    primaryForeground: '#FFFFFF',
    secondary: '#8F85FF',
    text: '#1A1A1A',                // Slightly softer than pure black
    subtitle: '#6B7280',            // Warmer gray for better readability

    // Semantic colors
    accent: '#F3F4F8',              // Slightly blueish for accent
    accentForeground: '#1F1F1F',
    muted: '#F1F5F9',              // Softer muted background
    mutedForeground: '#64748B',     // Warmer muted text

    // State colors (kept the same as they work well)
    success: '#22C55E',
    successForeground: '#FFFFFF',
    warning: '#F59E0B',
    warningForeground: '#FFFFFF',
    error: '#EF4444',
    errorForeground: '#FFFFFF',
    info: '#3B82F6',
    infoForeground: '#FFFFFF',

    income: '#4CAF50',
    expense: '#FF5252',

    // Border & Shadow
    border: 'rgba(0, 0, 0, 0.08)',   // Lighter border
    shadowLight: 'rgba(0, 0, 0, 0.03)',
    shadowMedium: 'rgba(0, 0, 0, 0.05)',

    // Input & Form
    input: '#FFFFFF',
    inputForeground: '#000000',
    ring: 'rgba(143, 133, 255, 0.3)',
} as const;

export const darkTheme = {
    // Base colors
    background: '#111111',
    secondaryBackground: '#1E1E1E',
    foreground: '#FFFFFF',
    card: '#1E1E1E',
    secondarycard: '#111111',
    cardForeground: '#FFFFFF',
    primary: '#8F85FF',
    primaryForeground: '#FFFFFF',
    secondary: '#8F85FF',
    text: '#F2F2F7',               // Slightly softer white
    subtitle: '#A2A2AB',           // Kept the same - works well

    // Semantic colors
    accent: '#27272A',             // Slightly warmer accent
    accentForeground: '#FFFFFF',
    muted: '#8E8E93',             // Adjusted for better contrast
    mutedForeground: '#A1A1AA',    // Kept the same - works well

    income: '#4CAF50',            // Kept the same
    expense: '#FF5252',           // Kept the same

    // State colors
    success: '#22C55E',           // Kept the same - works well
    successForeground: '#FFFFFF',
    warning: '#F59E0B',
    warningForeground: '#FFFFFF',
    error: '#EF4444',
    errorForeground: '#FFFFFF',
    info: '#3B82F6',
    infoForeground: '#FFFFFF',

    // Border & Shadow
    border: 'rgba(255, 255, 255, 0.08)', // Reduced opacity for subtlety
    shadowLight: 'rgba(0, 0, 0, 0.4)',
    shadowMedium: 'rgba(0, 0, 0, 0.5)',

    // Input & Form
    input: '#27272A',              // Slightly adjusted for better contrast
    inputForeground: '#FFFFFF',
    ring: 'rgba(143, 133, 255, 0.3)',
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

export const SCREEN_HEIGHT = Dimensions.get("window").height;
export const SCREEN_WIDTH = Dimensions.get("window").width;


export const windowWidth = (width: DimensionValue): number => {
    if (!width) {
        return 0;
    }
    let tempWidth = SCREEN_WIDTH * (parseFloat(width.toString()) / 480);
    return PixelRatio.roundToNearestPixel(tempWidth);
};

export const fontSizes = {
    FONT6: windowWidth(6),
    FONT7: windowWidth(7),
    FONT8: windowWidth(8),
    FONT9: windowWidth(9),
    FONT10: windowWidth(10),
    FONT11: windowWidth(11),
    FONT12: windowWidth(12),
    FONT13: windowWidth(13),
    FONT14: windowWidth(14),
    FONT15: windowWidth(15),
    FONT16: windowWidth(16),
    FONT17: windowWidth(17),
    FONT18: windowWidth(18),
    FONT19: windowWidth(19),
    FONT20: windowWidth(20),
    FONT21: windowWidth(21),
    FONT22: windowWidth(22),
    FONT23: windowWidth(23),
    FONT24: windowWidth(24),
    FONT25: windowWidth(25),
    FONT26: windowWidth(26),
    FONT27: windowWidth(27),
    FONT28: windowWidth(28),
    FONT30: windowWidth(30),
    FONT32: windowWidth(32),
    FONT35: windowWidth(35),
    FONT48: windowWidth(48),
};