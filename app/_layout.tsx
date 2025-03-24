import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerRecurringTask } from '@/services/recurringBackground';
import { useRecurringTransactionStore } from '@/stores/recurringTransactionStore';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as LocalAuthentication from 'expo-local-authentication';

// Prevent splash screen from hiding until we're ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  // Check biometric support on mount
  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricSupported(hasHardware && isEnrolled);
    })();
  }, []);

  // Initialize app and handle biometric authentication
  useEffect(() => {
    if (loaded) {
      const initializeApp = async () => {
        try {
          // Step 1: Fetch recurring transactions
          console.log('Fetching recurring transactions');
          await useRecurringTransactionStore.getState().fetchRecurringTransactions();

          // Step 2: Register the background task
          console.log('Registering background task');
          await registerRecurringTask();

          // Step 3: Generate due transactions
          console.log('Generating due transactions');
          await useRecurringTransactionStore.getState().generateRecurringTransactions();

          // Step 4: Prompt for biometric authentication if supported
          if (isBiometricSupported) {
            console.log('Prompting for biometric authentication');
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Authenticate to access FinTrack',
              cancelLabel: 'Cancel',
              disableDeviceFallback: false, // Allow passcode fallback
            });

            if (result.success) {
              console.log('Biometric authentication successful');
              setIsAuthenticated(true);
            } else {
              console.log('Biometric authentication failed');
              // Optionally, you could exit the app or keep prompting
              // For now, we'll allow access even if it fails (adjust as needed)
              setIsAuthenticated(true);
            }
          } else {
            console.log('Biometric authentication not supported, skipping');
            setIsAuthenticated(true); // Proceed without biometric if not supported
          }

          console.log('App initialization complete');
        } catch (error) {
          console.error('Failed to initialize app:', error);
          setIsAuthenticated(true); // Proceed even on error (adjust as needed)
        } finally {
          await SplashScreen.hideAsync();
        }
      };

      initializeApp();
    }
  }, [loaded, isBiometricSupported]);

  // Show nothing until authenticated and loaded
  if (!loaded || !isAuthenticated) {
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