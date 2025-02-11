import { useTheme } from "@/hooks/useTheme";
import { View, ViewStyle } from "react-native";

// components/themed/Card.tsx
interface CardProps {
    variant?: 'default' | 'elevated' | 'outlined';
    children: React.ReactNode;
    style?: ViewStyle;
}

export function Card({ variant = 'default', children, style }: CardProps) {
    const { colors, tokens, getShadow } = useTheme();

    // const getCardStyle = createVariant(
    //   {
    //     padding: tokens.spacing.md,
    //     borderRadius: tokens.borderRadius.md,
    //     backgroundColor: colors.card,
    //   },
    //   {
    //     default: {},
    //     elevated: {
    //       ...getShadow(4),
    //     },
    //     outlined: {
    //       borderWidth: 1,
    //       borderColor: colors.border,
    //     },
    //   }
    // );

    return <View style={[style]}>{children}</View>;
}