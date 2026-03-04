import { Text as RNText, TextStyle, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { fontSizes } from '@/constants/theme';

type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'subtitle'
  | 'body1'
  | 'body2'
  | 'caption';

interface TextProps {
  variant?: TextVariant;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  style?: TextStyle | TextStyle[];
  children: React.ReactNode;
  numberOfLines?: number;
}
``
const createTextStyles = (scale: number) => ({
  fontSize: fontSizes[`FONT${scale}` as keyof typeof fontSizes],
  lineHeight: fontSizes[`FONT${scale + 8}` as keyof typeof fontSizes], // Add 8 to fontSize for lineHeight
});

export function ThemedText({
  variant = 'body1',
  color,
  align,
  style,
  children,
  numberOfLines,
  ...props
}: TextProps) {
  // All hooks must be called unconditionally at the top
  const { colors } = useTheme();

  const getVariantStyles = (): TextStyle => {
    const variants: Record<TextVariant, TextStyle> = {
      h1: {
        ...createTextStyles(48),
        fontFamily: 'Urbanist_600Bold',
      },
      h2: {
        ...createTextStyles(24),
        fontFamily: 'Urbanist_600SemiBold',
        fontWeight: undefined,
      },
      h3: {
        ...createTextStyles(20),
        fontFamily: 'Urbanist_600SemiBold',
        fontWeight: undefined,
      },
      subtitle: {
        ...createTextStyles(18),
        fontFamily: 'Urbanist_500Medium',
        color: colors.subtitle,
        fontWeight: undefined,
      },
      body1: {
        ...createTextStyles(16),
        fontFamily: 'Urbanist_400Regular',
        color: colors.subtitle,
      },
      body2: {
        ...createTextStyles(14),
        fontFamily: 'Urbanist_400Regular',
        color: colors.subtitle,
      },
      caption: {
        ...createTextStyles(12),
        fontFamily: 'Urbanist_400Regular',
      },
    };
    return variants[variant];
  };

  const styles = StyleSheet.create({
    text: {
      ...getVariantStyles(),
      color: color || colors.text,
      textAlign: align || 'left',
    },
  });

  return (
    <RNText style={[styles.text, style]} {...props} numberOfLines={numberOfLines}>
      {children}
    </RNText>
  );
}