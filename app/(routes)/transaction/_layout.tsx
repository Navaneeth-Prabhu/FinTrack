import { Stack } from 'expo-router';

export default function TransactionLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'fade'
            }}
        >
            <Stack.Screen
                name="[id]"
                options={{
                    headerShown: true,
                    title: '',
                    animation: 'fade',
                    headerShadowVisible: false
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
        </Stack>
    );
}