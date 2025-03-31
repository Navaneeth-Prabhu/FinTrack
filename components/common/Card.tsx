import { useTheme } from "@/hooks/useTheme";
import { View, ViewStyle } from "react-native";

interface CardProps {
    variant?: 'default' | 'elevated' | 'outlined';
    children: React.ReactNode;
    style?: ViewStyle;
}

export function Card({ variant = 'default', children, style }: CardProps) {
    const { colors, tokens, getShadow } = useTheme();

    const variantStyles = {
        outlined: {
            borderWidth: 1,
            borderColor: colors.border,
        },
        elevated: getShadow(2),
        default: {},
    };

    return (
        <View style={[style, variantStyles[variant], {
            backgroundColor: colors.card,
            padding: tokens.spacing.md,
            borderRadius: tokens.borderRadius.md,
        }]}>
            {children}
        </View>
    );
}
