// services/nativeSmsModule.ts
// Typed TypeScript bridge for the custom SmsModule native module.
// This is the ONLY file that touches NativeModules - all other SMS code imports from here.

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

export interface RawSmsMessage {
    _id: string;
    address: string;
    body: string;
    date: number; // Unix timestamp in milliseconds
}

interface SmsModuleInterface {
    getTransactionSms(maxCount: number, minDate: number, maxDate: number): Promise<string>;
    startSmsObserver(): void;
    stopSmsObserver(): void;
    addListener(eventName: string): void;
    removeListeners(count: number): void;
}

const { SmsModule: _SmsModule } = NativeModules as { SmsModule: SmsModuleInterface | undefined };

// Diagnostic: Catch R8/ProGuard stripping or New Arch registration failure
// In release builds, if SmsModule is undefined it means either:
//   1. proguard-rules.pro is missing -keep class com.fintrack.FinTrack.** { *; }
//   2. newArchEnabled=true in gradle.properties (breaks old-style ReactContextBaseJavaModule)
// Run: adb logcat | grep "[SmsModule]" to see this on device
if (Platform.OS === 'android') {
    if (!_SmsModule) {
        console.error(
            '[SmsModule] CRITICAL: NativeModules.SmsModule is undefined!\n' +
            'Checklist:\n' +
            '  1. proguard-rules.pro must have: -keep class com.fintrack.FinTrack.** { *; }\n' +
            '  2. gradle.properties must have: newArchEnabled=false\n' +
            '  3. Run a clean release build after fixing: cd android && ./gradlew clean assembleRelease\n' +
            'All SMS parsing is silently disabled until this is resolved.'
        );
    } else {
        console.log('[SmsModule] Native module registered successfully');
    }
}

export interface ReadSmsResult {
    messages: RawSmsMessage[];
    oldestScannedDate: number;
    scannedCount: number;
}

/**
 * Read financial SMS messages from the inbox.
 * Returns metadata and messages.
 */
export async function readSmsMessages(
    maxCount = 300,
    minDate = 0,
    maxDate = 0,
): Promise<ReadSmsResult> {
    const fallback: ReadSmsResult = { messages: [], oldestScannedDate: maxDate || Date.now(), scannedCount: 0 };
    
    if (Platform.OS !== 'android' || !_SmsModule) {
        if (Platform.OS === 'android') {
            console.warn('[SmsModule] readSmsMessages called but module is unavailable');
        }
        return fallback;
    }

    try {
        const raw = await _SmsModule.getTransactionSms(maxCount, minDate, maxDate);
        const parsed = JSON.parse(raw);
        
        // Handle both new {messages, oldestScannedDate} and legacy [...] formats
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return {
                messages: parsed.messages || [],
                oldestScannedDate: parsed.oldestScannedDate || 0,
                scannedCount: parsed.scannedCount || 0
            };
        } else if (Array.isArray(parsed)) {
            // Legacy fallback
            const oldest = parsed.length > 0 ? Math.min(...parsed.map((m: any) => m.date)) : (maxDate || 0);
            return { messages: parsed, oldestScannedDate: oldest, scannedCount: parsed.length };
        }
        
        return fallback;
    } catch (error) {
        console.error('[SmsModule] getTransactionSms failed:', error);
        return fallback;
    }
}

/** Start the native ContentObserver. No-op on iOS. */
export function startNativeSmsObserver(): void {
    if (Platform.OS === 'android' && _SmsModule) {
        _SmsModule.startSmsObserver();
    }
}

/** Stop the native ContentObserver. No-op on iOS. */
export function stopNativeSmsObserver(): void {
    if (Platform.OS === 'android' && _SmsModule) {
        _SmsModule.stopSmsObserver();
    }
}

/**
 * The NativeEventEmitter for the SmsModule.
 * Emits 'SmsReceived' events with a JSON string payload: RawSmsMessage.
 */
export const SmsModuleEmitter = Platform.OS === 'android' && _SmsModule
    ? new NativeEventEmitter(_SmsModule as any)
    : null;
