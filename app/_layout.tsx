import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerRecurringTask } from '@/services/recurringBackground';
import { useRecurringTransactionStore } from '@/stores/recurringTransactionStore';
import * as BackgroundFetch from 'expo-background-fetch';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    const initializeApp = async () => {
      if (loaded) {
        try {
          // Check if task is already registered to avoid duplicates
          const isRegistered = await BackgroundFetch.getStatusAsync();
          if (isRegistered !== BackgroundFetch.BackgroundFetchStatus.Restricted) {
            await registerRecurringTask();
          }
          await useRecurringTransactionStore.getState().fetchRecurringTransactions();
        } catch (error) {
          console.error('Failed to initialize recurring transactions:', error);
        }
        SplashScreen.hideAsync();
      }
    };

    initializeApp();
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="inverted" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
          <Stack.Screen
            name="(routes)/transaction"
            options={{
              headerShown: false,
              presentation: 'containedTransparentModal',
              animation: 'fade',
            }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}