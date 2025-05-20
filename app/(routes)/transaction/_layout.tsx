import { useTheme } from '@/hooks/useTheme';
import { Stack } from 'expo-router';

export default function TransactionLayout() {
     const { colors } = useTheme();
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                headerStyle: {
                    backgroundColor: colors.background
                },
            }}
        >
            <Stack.Screen
                name="[id]"
                options={{
                    headerShown: true,
                    title: '',
                    animation: 'slide_from_left',
                    headerShadowVisible: false,
                    headerTintColor: colors.text,
                    statusBarStyle: 'dark',
                }}
            />
            <Stack.Screen
                name="transactionForm"
                options={{
                    headerShown: false,
                    presentation: 'containedTransparentModal',
                    animation: 'fade',
                    contentStyle: { backgroundColor: 'transparent' }
                }}
            />
            <Stack.Screen
                name="searchTransaction"
                options={{
                    headerShown: false,
                    presentation: 'containedTransparentModal',
                    animation: 'fade',
                    contentStyle: { backgroundColor: 'transparent' }
                }}
            />
        </Stack>
    );
}