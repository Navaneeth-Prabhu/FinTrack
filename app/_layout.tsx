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
import usePreferenceStore from '@/stores/preferenceStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { Platform } from 'react-native';
import { debugReadFinancialSMS, debugReadSMS } from '@/services/SMSDebugService';


// Prevent splash screen from hiding until we're ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  // Get biometrics preference from Zustand store
  const { biometrics } = usePreferenceStore();

  // Check biometric support on mount
  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricSupported(hasHardware && isEnrolled);
    })();
  }, []);

  const loadCategories = async () => {
    try {
      await useCategoryStore.getState().fetchCategories();
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  // New function to handle SMS reading for debugging
  const initSMSDebug = async () => {
    // Only run on Android
    if (Platform.OS !== 'android') {
      console.log('SMS reading is only available on Android');
      return;
    }

    try {
      console.log('Starting SMS debug process...');

      // Read and log general SMS messages
      await debugReadSMS();

      // Specifically look for financial messages
      await debugReadFinancialSMS();

      console.log('SMS debug process completed');
    } catch (error) {
      console.error('Error in SMS debug process:', error);
    }
  };

  // Initialize app and handle biometric authentication conditionally
  useEffect(() => {
    if (loaded) {
      const initializeApp = async () => {
        try {
          // await getAppSignature(); // Just logs the hash you'll need

          // Step 1: Fetch recurring transactions
          console.log('Fetching recurring transactions');
          await useRecurringTransactionStore.getState().fetchRecurringTransactions();

          // Step 2: Register the background task
          console.log('Registering background task');
          await registerRecurringTask();

          // Step 3: Generate due transactions
          console.log('Generating due transactions');
          await useRecurringTransactionStore.getState().generateRecurringTransactions();

          // NEW: Add SMS debugging early in the startup process
          // This runs regardless of authentication status
          await initSMSDebug();

          // Step 4: Prompt for biometric authentication if supported AND enabled in preferences
          if (isBiometricSupported && biometrics) {
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
              // Keep app locked until success; adjust this logic as needed
              return; // Prevents proceeding if authentication fails
            }
          } else {
            console.log('Biometric authentication skipped (not supported or disabled)');
            setIsAuthenticated(true); // Proceed without biometric
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
      loadCategories();
    }
  }, [loaded, isBiometricSupported, biometrics]); // Add biometrics as dependency

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