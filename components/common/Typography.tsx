// components/common/Typography.tsx
import { useTheme } from '@/hooks/useTheme';
import { Text as RNText, TextStyle, StyleSheet } from 'react-native';

type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body1'
  | 'body2'
  | 'caption'
  | 'button'
  | 'overline';

interface TypographyProps {
  variant?: TypographyVariant;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  style?: TextStyle;
  children: React.ReactNode;
}

export function Text({
  variant = 'body1',
  color,
  align,
  style,
  children,
  ...props
}: TypographyProps) {
  const { colors } = useTheme();

  const getVariantStyles = (): TextStyle => {
    const variants: Record<TypographyVariant, TextStyle> = {
      h1: {
        fontSize: 32,
        fontWeight: 'bold',
        lineHeight: 40,
      },
      h2: {
        fontSize: 28,
        fontWeight: 'bold',
        lineHeight: 36,
      },
      h3: {
        fontSize: 24,
        fontWeight: '600',
        lineHeight: 32,
      },
      h4: {
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 28,
      },
      body1: {
        fontSize: 16,
        lineHeight: 24,
      },
      body2: {
        fontSize: 14,
        lineHeight: 20,
      },
      caption: {
        fontSize: 12,
        lineHeight: 16,
      },
      button: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 24,
      },
      overline: {
        fontSize: 10,
        fontWeight: '500',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
      },
    };
    return variants[variant];
  };

  return (
    <RNText
      style={[
        getVariantStyles(),
        { color: color || colors.text },
        align && { textAlign: align },
        style,
      ]}
      {...props}>
      {children}
    </RNText>
  );
}