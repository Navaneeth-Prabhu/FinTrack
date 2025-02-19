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
}
``
const createTextStyles = (scale: number) => ({
  fontSize: fontSizes[`FONT${scale}`],
  lineHeight: fontSizes[`FONT${scale + 8}`], // Add 8 to fontSize for lineHeight
});

export function ThemedText({
  variant = 'body1',
  color,
  align,
  style,
  children,
  ...props
}: TextProps) {
  const { colors } = useTheme();

  const getVariantStyles = (): TextStyle => {
    const variants: Record<TextVariant, TextStyle> = {
      h1: {
        ...createTextStyles(48),
        fontFamily: 'Poppins-SemiBold',
      },
      h2: {
        ...createTextStyles(24),
        // fontFamily: 'Poppins-SemiBold',
        fontWeight: '500',
      },
      h3: {
        ...createTextStyles(20),
        // fontFamily: 'Poppins-SemiBold',
        fontWeight: '600',
      },
      subtitle: {
        ...createTextStyles(18),
        // fontFamily: 'Poppins-Medium',
        color: colors.subtitle,
        fontWeight: '500'
      },
      body1: {
        ...createTextStyles(16),
        // fontFamily: 'Poppins-Regular',
        color: colors.subtitle,
      },
      body2: {
        ...createTextStyles(14),
        // fontFamily: 'Poppins-Regular',
        color: colors.subtitle,
      },
      caption: {
        ...createTextStyles(12),
        fontFamily: 'Poppins-Regular',
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
    <RNText style={[styles.text, style]} {...props}>
      {children}
    </RNText>
  );
}