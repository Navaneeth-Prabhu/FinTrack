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
import { useTransactionStore } from '@/stores/transactionStore';
import { Platform } from 'react-native';
import { initializeSMSFeatures, setupPeriodicSMSScan } from '@/services/smsInitService';
import { useTheme } from '@/hooks/useTheme';
import SplashScreenComponent from '../components/SplashScreen';

// Prevent splash screen from hiding until we're ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isDark, colorScheme } = useTheme();

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Get biometrics preference from Zustand store
  const { biometrics } = usePreferenceStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { saveTransaction } = useTransactionStore();

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
      await fetchCategories();
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  // Setup SMS scanning (returns a cleanup function)
  useEffect(() => {
    // Only setup SMS scanning if categories are loaded
    if (categories && categories.length > 0) {
      // Set up periodic scanning (every 30 minutes)
      const cleanupSMSScan = setupPeriodicSMSScan(categories, saveTransaction, 30);

      // Cleanup on component unmount
      return cleanupSMSScan;
    }
  }, [categories, saveTransaction]);

  // Initialize app and handle biometric authentication conditionally
  useEffect(() => {
    if (loaded) {
      const initializeApp = async () => {
        try {
          // Step 1: Fetch recurring transactions
          // console.log('Fetching recurring transactions');
          await useRecurringTransactionStore.getState().fetchRecurringTransactions();

          // Step 2: Register the background task
          // console.log('Registering background task');
          await registerRecurringTask();

          // Step 3: Generate due transactions
          // console.log('Generating due transactions');
          await useRecurringTransactionStore.getState().generateRecurringTransactions();

          // Step 4: Load categories if not already loaded
          if (!categories || categories.length === 0) {
            await loadCategories();
          }

          // Step 5: Initialize SMS features after categories are loaded
          if (Platform.OS === 'android' && categories && categories.length > 0) {
            await initializeSMSFeatures(categories, saveTransaction);
          }

          // Step 6: Prompt for biometric authentication if supported AND enabled in preferences
          if (isBiometricSupported && biometrics) {
            // console.log('Prompting for biometric authentication');
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Authenticate to access FinTrack',
              cancelLabel: 'Cancel',
              disableDeviceFallback: false, // Allow passcode fallback
            });

            if (result.success) {
              // console.log('Biometric authentication successful');
              setIsAuthenticated(true);
            } else {
              // console.log('Biometric authentication failed');
              // Keep app locked until success; adjust this logic as needed
              return; // Prevents proceeding if authentication fails
            }
          } else {
            // console.log('Biometric authentication skipped (not supported or disabled)');
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
    }
  }, [loaded, isBiometricSupported, biometrics, categories, saveTransaction]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Show splash screen for 2 seconds
  if (showSplash) {
    return <SplashScreenComponent />;
  }

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
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </BottomSheetModalProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}