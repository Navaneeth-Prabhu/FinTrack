import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts, Urbanist_400Regular, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold } from '@expo-google-fonts/urbanist';
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
import { initializeSMSFeatures } from '@/services/smsInitService';
import { useTheme } from '@/hooks/useTheme';
import SplashScreenComponent from '../components/SplashScreen';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

// Prevent splash screen from hiding until we're ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // All hooks must be called at the top, before any return
  const { isDark, colorScheme, colors } = useTheme();
  const [loaded] = useFonts({
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const { biometrics } = usePreferenceStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { saveTransaction } = useTransactionStore();

  // Check biometric support on mount
  useEffect(() => {
    (async () => {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync()
      ]);
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
  // Periodic SMS scanning removed for optimization - only scans on app open

  // Initialize app and handle biometric authentication conditionally
  useEffect(() => {
    if (loaded) {
      const initializeApp = async () => {
        try {
          // Execute startup tasks sequentially to prevent SQLite race conditions 
          // (multiple stores trying to create/open the DB at the exact same millisecond)
          if (categories.length === 0) {
            await loadCategories();
          }
          await useRecurringTransactionStore.getState().fetchRecurringTransactions();
          await useTransactionStore.getState().fetchTransactions(50);
          await registerRecurringTask();

          // Step 3: Generate due transactions (potentially depends on fetch)
          await useRecurringTransactionStore.getState().generateRecurringTransactions();

          // Step 5: Initialize SMS features after categories are loaded
          const currentCategories = useCategoryStore.getState().categories;
          if (Platform.OS === 'android' && currentCategories.length > 0) {
            // Run SMS initialization in background without blocking startup
            initializeSMSFeatures({
              categories: currentCategories,
              saveTransactionFn: saveTransaction,
            }).catch(err => console.error('[SMS::Init] Background init failed:', err));
          }

          // Step 6: Prompt for biometric authentication if supported AND enabled in preferences
          if (isBiometricSupported && biometrics) {
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Authenticate to access FinTrack',
              cancelLabel: 'Cancel',
              disableDeviceFallback: false,
            });

            if (result.success) {
              setIsAuthenticated(true);
            } else {
              return; // Prevents proceeding if authentication fails
            }
          } else {
            setIsAuthenticated(true); // Proceed without biometric
          }

          console.log('App initialization complete');
        } catch (error) {
          console.error('Failed to initialize app:', error);
          setIsAuthenticated(true); // Proceed even on error
        } finally {
          await SplashScreen.hideAsync();
        }
      };

      initializeApp();
    }
  }, [loaded, isBiometricSupported, biometrics, saveTransaction]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Update navigation bar color and button style on theme change (Android only)
  useEffect(() => {
    // Sync the root native view background to prevent white flashes during navigation/keyboard
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => { });

    if (Platform.OS === 'android') {
      // Set navigation bar color to match theme
      NavigationBar.setBackgroundColorAsync(colors.background).catch(() => { });
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark').catch(() => { });
    }
  }, [isDark, colors.background]);

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