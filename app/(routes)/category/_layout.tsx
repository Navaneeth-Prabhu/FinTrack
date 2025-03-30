import { Stack } from 'expo-router';

export default function CategoryLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: true,
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
                name="categoryList"
                options={{
                    headerShown: true,
                    title: 'Categories',
                    presentation: 'containedTransparentModal',
                    animation: 'fade',
                    contentStyle: { backgroundColor: 'transparent' }
                }}
            />
            <Stack.Screen
                name="categoryForm"
                options={{
                    headerShown: true,
                    title: '',
                    presentation: 'containedTransparentModal',
                    animation: 'fade',
                    contentStyle: { backgroundColor: 'transparent' }
                }}
            />
        </Stack>
    );
}