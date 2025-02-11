// components/common/Button.tsx
import { Pressable, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Text } from './Typography';
import { useTheme } from '@/hooks/useTheme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    onPress?: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    children: React.ReactNode;
}

export function Button({
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    children,
}: ButtonProps) {
    const { colors } = useTheme();

    const getVariantStyles = () => {
        const variants = {
            primary: {
                backgroundColor: colors.primary,
                borderWidth: 0,
            },
            secondary: {
                backgroundColor: colors.secondary,
                borderWidth: 0,
            },
            outline: {
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: colors.primary,
            },
            ghost: {
                backgroundColor: 'transparent',
                borderWidth: 0,
            },
            danger: {
                backgroundColor: colors.error,
                borderWidth: 0,
            },
        };
        return variants[variant];
    };

    const getSizeStyles = () => {
        const sizes = {
            sm: {
                paddingVertical: 8,
                paddingHorizontal: 16,
            },
            md: {
                paddingVertical: 12,
                paddingHorizontal: 24,
            },
            lg: {
                paddingVertical: 16,
                paddingHorizontal: 32,
            },
        };
        return sizes[size];
    };

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            style={({ pressed }) => [
                styles.button,
                getVariantStyles(),
                getSizeStyles(),
                fullWidth && styles.fullWidth,
                disabled && styles.disabled,
                pressed && styles.pressed,
            ]}>
            {loading ? (
                <ActivityIndicator color={variant === 'outline' ? colors.primary : 'white'} />
            ) : (
                <View style={styles.content}>
                    {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
                    <Text
                        variant="button"
                        style={[
                            { color: variant === 'outline' ? colors.primary : 'white' },
                            disabled && styles.disabledText,
                        ]}>
                        {children}
                    </Text>
                    {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fullWidth: {
        width: '100%',
    },
    disabled: {
        opacity: 0.5,
    },
    disabledText: {
        opacity: 0.7,
    },
    pressed: {
        opacity: 0.8,
    },
    iconLeft: {
        marginRight: 8,
    },
    iconRight: {
        marginLeft: 8,
    },
});