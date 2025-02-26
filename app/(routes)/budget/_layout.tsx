import { Stack } from 'expo-router';

export default function BudgetLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="[id]"
                options={{
                    headerShown: true,
                    title: '',
                    animation: 'slide_from_left',
                    headerShadowVisible: false
                }}
            />
            <Stack.Screen
                name="budgetForm"
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