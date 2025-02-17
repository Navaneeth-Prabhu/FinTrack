import { Dimensions, DimensionValue, PixelRatio } from "react-native";

export const lightTheme = {
    // Base colors
    background: '#F9F9F9',
    secondaryBackground: '#FFFFFF',
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

    income: '#4CAF50',
    expense: '#FF5252',

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
    secondaryBackground: '#1E1E1E',
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
    muted: '#A2A2AB',
    mutedForeground: '#A1A1AA',

    income: '#4CAF50',
    expense: '#FF5252',

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