import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AlertCircle, RefreshCcw } from 'lucide-react-native';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorFallback error={this.state.error} onReset={this.handleReset} />
            );
        }

        return this.props.children;
    }
}

const ErrorFallback = ({ error, onReset }: { error: Error | null; onReset: () => void }) => {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <AlertCircle size={48} color={'#EF4444'} style={styles.icon} />
            <Text style={[styles.title, { color: theme.text }]}>Something went wrong</Text>
            <Text style={[styles.message, { color: theme.icon }]}>
                {error?.message || 'An unexpected error occurred.'}
            </Text>

            <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.tint }]}
                onPress={onReset}
            >
                <RefreshCcw size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    icon: {
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
