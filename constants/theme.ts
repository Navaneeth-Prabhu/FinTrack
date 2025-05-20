import { Dimensions, DimensionValue, PixelRatio } from "react-native";

// export const lightTheme = {
//     // Base colors
//     // background: '#f9fafb',
//     // background: '#F8F9FA',
//     // background: '#F9FAFC',
//     background: '#F7F7F7',
//     secondaryBackground: '#FFFFFF',
//     foreground: '#000000',
//     card: '#FFFFFF',
//     secondarycard: '#F8F9FC',
//     cardForeground: '#000000',
//     primary: '#8F85FF',
//     primaryForeground: '#rgba(143, 133, 255, 0.15)',
//     secondary: '#8F85FF',
//     text: '#333333',
//     subtitle: '#6B7280',

//     // Semantic colors
//     accent: '#F3F4F8',              // Slightly blueish for accent
//     accentForeground: '#1F1F1F',
//     muted: '#A0A0A0',              // Softer muted background
//     mutedForeground: '#64748B',     // Warmer muted text

//     // State colors (kept the same as they work well)
//     success: '#22C55E',
//     successForeground: '#FFFFFF',
//     warning: '#F59E0B',
//     warningForeground: '#FFFFFF',
//     error: '#EF4444',
//     errorForeground: '#FFFFFF',
//     info: '#3B82F6',
//     infoForeground: '#FFFFFF',

//     income: '#4CAF50',
//     expense: '#FF5252',

//     // Border & Shadow
//     border: '#d9d9d9',   // Lighter border
//     // border: 'rgba(0, 0, 0, 0.08)',   // Lighter border
//     shadowLight: 'rgba(0, 0, 0, 0.03)',
//     shadowMedium: 'rgba(0, 0, 0, 0.05)',

//     // Input & Form
//     input: '#FFFFFF',
//     inputForeground: '#000000',
//     ring: 'rgba(143, 133, 255, 0.3)',
// } as const;

// export const darkTheme = {
//     // Base colors
//     background: '#111111',
//     secondaryBackground: '#111111',
//     foreground: '#FFFFFF',
//     card: '#1E1E1E',
//     secondarycard: '#1E1E1E',
//     cardForeground: '#FFFFFF',
//     primary: '#A59BFF',
//     primaryForeground: '#3A3A3C',
//     secondary: '#8F85FF',
//     text: '#F2F2F7',               // Slightly softer white
//     subtitle: '#A2A2AB',           // Kept the same - works well

//     // Semantic colors
//     accent: '#27272A',             // Slightly warmer accent
//     accentForeground: '#FFFFFF',
//     muted: '#6E6E6E',             // Adjusted for better contrast
//     mutedForeground: '#A1A1AA',    // Kept the same - works well

//     income: '#4CAF50',            // Kept the same
//     expense: '#FF5252',           // Kept the same

//     // State colors
//     success: '#22C55E',           // Kept the same - works well
//     successForeground: '#FFFFFF',
//     warning: '#F59E0B',
//     warningForeground: '#FFFFFF',
//     error: '#EF4444',
//     errorForeground: '#FFFFFF',
//     info: '#3B82F6',
//     infoForeground: '#FFFFFF',

//     // Border & Shadow
//     border: 'rgba(255, 255, 255, 0.08)', // Reduced opacity for subtlety
//     shadowLight: 'rgba(0, 0, 0, 0.4)',
//     shadowMedium: 'rgba(0, 0, 0, 0.5)',

//     // Input & Form
//     input: '#27272A',              // Slightly adjusted for better contrast
//     inputForeground: '#FFFFFF',
//     ring: 'rgba(143, 133, 255, 0.3)',
// } as const;


export const lightTheme = {
    // Base colors
    background: '#f7f7f7',          // Slightly cooler off-white for better contrast
    // background: '#F9FAFC',          // Slightly cooler off-white for better contrast
    secondaryBackground: '#FFFFFF', // Pure white
    foreground: '#2D2A40',          // Dark purple-gray for better brand alignment
    card: '#FFFFFF',                // White cards
    secondarycard: '#F4F5F9',       // Subtle differentiation for secondary cards
    cardForeground: '#2D2A40',      // Match foreground for consistency
    primary: '#8F85FF',             // Your brand purple
    primaryForeground: 'rgba(143, 133, 255, 0.15)',
    secondary: '#7269E3',           // Darker purple for secondary actions
    text: '#2D2A40',                // Match foreground for consistency
    subtitle: '#6E6A8F',            // Medium purple-gray for subtitles

    // Semantic colors
    accent: '#f7f6f9',              // Very light purple for subtle accents
    // accent: '#EFEEFF',              // Very light purple for subtle accents
    accentForeground: '#2D2A40',    // Consistent text color
    muted: '#E8E9F0',               // Softer muted with purple tint
    mutedForeground: '#A6A4BA',     // Lighter purple-gray

    // State colors (refined for better harmony)
    success: '#4CD791',             // Mint green (softer, modern)
    successForeground: '#FFFFFF',
    warning: '#FFB84D',             // Soft orange
    warningForeground: '#FFFFFF',
    error: '#F27D7D',               // Soft red
    errorForeground: '#FFFFFF',
    info: '#5DADEC',                // Soft blue
    infoForeground: '#FFFFFF',

    income: '#4CD791',              // Match success for consistency
    expense: '#F27D7D',             // Match error for consistency

    // Border & Shadow
    border: '#ECEDF2',              // Light purple-gray border
    shadowLight: 'rgba(143, 133, 255, 0.05)', // Brand-colored shadow
    shadowMedium: 'rgba(143, 133, 255, 0.08)',

    // Input & Form
    input: '#FFFFFF',
    inputForeground: '#2D2A40',
    ring: 'rgba(143, 133, 255, 0.3)',
} as const;

export const darkTheme = {
    // Base colors
    background: '#111111',          // Very dark, near-black
    secondaryBackground: '#181818', // Slightly lighter than background
    foreground: '#F0F0F5',          // Off-white text
    card: '#1E1E1E',                // Dark gray cards
    secondarycard: '#252525',       // Slightly lighter secondary cards
    cardForeground: '#F0F0F5',      // Match foreground
    primary: '#8F85FF',             // Your brand purple
    primaryForeground: '#2A2A2A',   // Dark background for text on primary
    secondary: '#7269E3',           // Slightly darker purple for secondary
    text: '#F0F0F5',                // Match foreground
    subtitle: '#AAAAAF',            // Light gray with slight cool tint

    // Semantic colors
    accent: '#2A2A2A',              // Subtle dark accent
    accentForeground: '#F0F0F5',    // Consistent text
    muted: '#292929',               // Subtle muted
    mutedForeground: '#8A8A8F',     // Medium gray

    income: '#40C682',              // Slightly darker green
    expense: '#E06060',             // Slightly darker red

    // State colors
    success: '#40C682',             // Slightly darker green
    successForeground: '#FFFFFF',
    warning: '#E6A140',             // Darker orange
    warningForeground: '#FFFFFF',
    error: '#E06060',               // Darker red
    errorForeground: '#FFFFFF',
    info: '#4A90CD',                // Darker blue
    infoForeground: '#FFFFFF',

    // Border & Shadow
    border: '#333333',              // Dark gray borders
    shadowLight: 'rgba(0, 0, 0, 0.3)',
    shadowMedium: 'rgba(0, 0, 0, 0.4)',

    // Input & Form
    input: '#252525',               // Slightly lighter than cards
    inputForeground: '#F0F0F5',
    ring: 'rgba(143, 133, 255, 0.3)', // Purple highlight for focus
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