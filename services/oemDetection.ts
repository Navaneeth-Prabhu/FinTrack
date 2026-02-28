/**
 * oemDetection.ts — OEM Battery Optimization Prompt
 *
 * On MIUI (Xiaomi/Redmi), Samsung, Oppo/Realme, Vivo, Huawei, and OnePlus devices,
 * the OS aggressively kills background processes including SMS listeners.
 *
 * This module detects the user's OEM and prompts them to whitelist FinTrack
 * in battery settings so the real-time SMS listener keeps working.
 */

import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

// ─── Constants ────────────────────────────────────────────────────────────────

const OEM_PROMPT_KEY = '@fintrack_oem_prompt_shown';

export type OEM = 'xiaomi' | 'samsung' | 'oppo' | 'vivo' | 'huawei' | 'oneplus' | 'other';

export interface OEMInfo {
    brand: OEM;
    displayName: string;
    settingsIntent?: string; // Android intent action string (for Linking.openURL)
    instructionSteps: string[];
}

// ─── OEM Settings Mapping ─────────────────────────────────────────────────────
// Android deep-link intents for battery optimization settings.
// Fallback to general Settings if OEM intent fails.

const OEM_MAP: Record<string, OEMInfo> = {
    xiaomi: {
        brand: 'xiaomi',
        displayName: 'Xiaomi / MIUI',
        settingsIntent: 'intent:#Intent;action=miui.intent.action.APP_PERM_EDIT;end',
        instructionSteps: [
            '1. Open Settings → Apps → FinTrack',
            '2. Tap "Battery Saver"',
            '3. Select "No Restrictions"',
            '4. Also go to Settings → Battery → App Battery Saver → FinTrack → "No Restrictions"',
        ],
    },
    redmi: {
        brand: 'xiaomi',
        displayName: 'Redmi / MIUI',
        settingsIntent: 'intent:#Intent;action=miui.intent.action.APP_PERM_EDIT;end',
        instructionSteps: [
            '1. Open Settings → Apps → FinTrack',
            '2. Tap "Battery Saver" → No Restrictions',
        ],
    },
    samsung: {
        brand: 'samsung',
        displayName: 'Samsung',
        settingsIntent: 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;end',
        instructionSteps: [
            '1. Open Settings → Device Care → Battery',
            '2. Tap "Background usage limits"',
            '3. Tap "Sleeping apps" and remove FinTrack',
            '4. Go to Settings → Apps → FinTrack → Battery → allow "Unrestricted"',
        ],
    },
    oppo: {
        brand: 'oppo',
        displayName: 'OPPO / ColorOS',
        settingsIntent: 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;end',
        instructionSteps: [
            '1. Open Settings → Battery → Energy-saving management',
            '2. Find FinTrack → set to "Do not optimize"',
        ],
    },
    realme: {
        brand: 'oppo',
        displayName: 'Realme / ColorOS',
        settingsIntent: 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;end',
        instructionSteps: [
            '1. Open Settings → Battery → App power management',
            '2. Set FinTrack to "Allow background activity"',
        ],
    },
    vivo: {
        brand: 'vivo',
        displayName: 'Vivo / FuntouchOS',
        settingsIntent: 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;end',
        instructionSteps: [
            '1. Open iManager → App Management → FinTrack',
            '2. Set Background clean-up to OFF',
        ],
    },
    huawei: {
        brand: 'huawei',
        displayName: 'Huawei / EMUI',
        settingsIntent: 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;end',
        instructionSteps: [
            '1. Open Phone Manager → App Launch',
            '2. Turn OFF auto-management for FinTrack',
            '3. Enable Background activity, Auto-launch, Secondary launch',
        ],
    },
    honor: {
        brand: 'huawei',
        displayName: 'Honor',
        settingsIntent: 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;end',
        instructionSteps: [
            '1. Open Settings → Apps → FinTrack → Battery → Allow background activity',
        ],
    },
    oneplus: {
        brand: 'oneplus',
        displayName: 'OnePlus / OxygenOS',
        settingsIntent: 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;end',
        instructionSteps: [
            '1. Open Settings → Battery → Battery Optimization',
            '2. Find FinTrack → select "Don\'t Optimize"',
        ],
    },
};

// ─── OEM Detection ────────────────────────────────────────────────────────────

export const detectOEM = async (): Promise<OEMInfo | null> => {
    if (Platform.OS !== 'android') return null;

    const brand = (await DeviceInfo.getBrand()).toLowerCase();
    const manufacturer = (await DeviceInfo.getManufacturer()).toLowerCase();

    // Match brand first, then manufacturer
    const key = Object.keys(OEM_MAP).find(
        (k) => brand.includes(k) || manufacturer.includes(k)
    );

    return key ? OEM_MAP[key] : null;
};

// ─── Prompt Logic ─────────────────────────────────────────────────────────────

/**
 * Show the OEM battery prompt once per install.
 * Call this after SMS permission is granted and SMS features are initialized.
 */
export const showOEMBatteryPromptIfNeeded = async (): Promise<void> => {
    if (Platform.OS !== 'android') return;

    // Only show once
    const alreadyShown = await AsyncStorage.getItem(OEM_PROMPT_KEY);
    if (alreadyShown) return;

    const oemInfo = await detectOEM();
    if (!oemInfo) return; // Generic Android — no aggressive kill behavior

    await AsyncStorage.setItem(OEM_PROMPT_KEY, 'true');

    Alert.alert(
        '⚠️ Enable Background SMS',
        [
            `Your ${oemInfo.displayName} device may stop FinTrack from reading SMS in the background.`,
            '',
            'To ensure automatic transaction detection works:',
            ...oemInfo.instructionSteps,
        ].join('\n'),
        [
            {
                text: 'Open Settings',
                onPress: () => openBatterySettings(oemInfo),
            },
            {
                text: 'Later',
                style: 'cancel',
            },
        ]
    );
};

/**
 * Attempt to open OEM-specific battery settings, falling back to general app settings.
 */
export const openBatterySettings = async (oemInfo: OEMInfo): Promise<void> => {
    const fallback = `package:com.fintrack.app`; // your package name
    const fallbackUrl = `android.settings.APPLICATION_DETAILS_SETTINGS`;

    if (oemInfo.settingsIntent) {
        const canOpen = await Linking.canOpenURL(oemInfo.settingsIntent);
        if (canOpen) {
            await Linking.openURL(oemInfo.settingsIntent);
            return;
        }
    }

    // Fallback to system app info
    try {
        await Linking.openSettings();
    } catch {
        await Linking.openURL(`intent:#Intent;action=${fallbackUrl};end`);
    }
};

/**
 * Reset the OEM prompt flag (for testing / re-prompting after app update)
 */
export const resetOEMPromptFlag = async (): Promise<void> => {
    await AsyncStorage.removeItem(OEM_PROMPT_KEY);
};
