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
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize app after resources are loaded
  useEffect(() => {
    if (loaded) {
      const initializeApp = async () => {
        try {
          // First, fetch recurring transactions
          console.log('Fetching recurring transactions');
          await useRecurringTransactionStore.getState().fetchRecurringTransactions();

          // Then, register the background task
          console.log('Registering background task');
          await registerRecurringTask();

          // Generate any due transactions immediately
          console.log('Generating due transactions');
          await useRecurringTransactionStore.getState().generateRecurringTransactions();

          console.log('App initialization complete');
        } catch (error) {
          console.error('Failed to initialize app:', error);
        } finally {
          // Hide splash screen regardless of success/failure
          await SplashScreen.hideAsync();
        }
      };

      initializeApp();
    }
  }, [loaded]);


  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <BottomSheetModalProvider>
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
        </BottomSheetModalProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}