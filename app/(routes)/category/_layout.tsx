import { useTheme } from '@/hooks/useTheme';
import { Stack } from 'expo-router';

export default function CategoryLayout() {
    const { colors } = useTheme();
    return (
        <Stack
            screenOptions={{
                headerShown: true,
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
            <Stack.Screen
                name="categoryRecords"
                options={{
                    headerShown: true,
                    title: 'Category Records',
                    presentation: 'containedTransparentModal',
                    animation: 'fade',
                    contentStyle: { backgroundColor: 'transparent' },
                    headerTitleStyle: {
                        color: colors.text,
                    },
                    headerTintColor: colors.text,
                }}
            />
        </Stack>
    );
}