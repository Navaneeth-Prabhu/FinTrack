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

    return (
        <View style={[style, {
            backgroundColor: colors.card,
            padding: tokens.spacing.md,
            borderRadius: tokens.borderRadius.md,
        }]}>
            {children}
        </View>
    );
}