// stores/preferenceStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ColorScheme = 'dark' | 'light';

interface PreferenceState {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    biometrics: boolean;
    setBiometrics: (biometrics: boolean) => void;
    // Add this to store the resolved theme for components that need direct access
    resolvedTheme: ColorScheme;
}

const usePreferenceStore = create<PreferenceState>()(
    persist(
        (set) => ({
            theme: 'system',
            setTheme: (theme) => set({ theme }),
            biometrics: false,
            setBiometrics: (biometrics) => set({ biometrics }),
            // Default value, will be updated by the useTheme hook
            resolvedTheme: 'light',
        }), {
        name: 'preference-store',
        storage: createJSONStorage(() => AsyncStorage),
    })
);

export default usePreferenceStore;