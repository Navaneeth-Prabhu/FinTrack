import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from 'zustand/middleware'

export type ThemeMode = 'dark' | 'light' | 'system';

interface PreferenceState {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    biometrics: boolean;
    setBiometrics: (biometrics: boolean) => void;
}

const usePreferenceStore = create<PreferenceState>()(
    persist(
        (set) => ({
            theme: 'system',
            setTheme: (theme) => set({ theme }),
            biometrics: false,
            setBiometrics: (biometrics) => set({ biometrics }),
        }), {
        name: 'theme-store',
        storage: createJSONStorage(() => AsyncStorage),
    }
    )
);

export default usePreferenceStore;