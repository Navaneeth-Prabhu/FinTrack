// services/nativeSmsModule.ts — ADD this diagnostic block near the top,
// just after the NativeModules destructuring.
//
// This surfaces "SmsModule not found" as a visible warning in release
// instead of silently returning [] on every SMS read attempt.

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

export interface RawSmsMessage {
    _id: string;
    address: string;
    body: string;
    date: number;
}

interface SmsModuleInterface {
    getTransactionSms(maxCount: number, minDate: number): Promise<string>;
    startSmsObserver(): void;
    stopSmsObserver(): void;
    addListener(eventName: string): void;
    removeListeners(count: number): void;
}

const { SmsModule: _SmsModule } = NativeModules as { SmsModule: SmsModuleInterface | undefined };

// ─── DIAGNOSTIC: Warn loudly if module is missing in release ─────────────────
// If you see this warning, your proguard-rules.pro is missing the SMS keep rules.
if (Platform.OS === 'android' && !_SmsModule) {
    console.error(
        '[SmsModule] ❌ NativeModules.SmsModule is undefined! ' +
        'R8/ProGuard stripped it in this release build. ' +
        'Fix: proguard-rules.pro is missing -keep class com.fintrack.FinTrack.** { *; }'
    );
}

export async function readSmsMessages(
    maxCount = 300,
    minDate = 0,
): Promise<RawSmsMessage[]> {
    if (Platform.OS !== 'android' || !_SmsModule) {
        return [];
    }

    try {
        const raw = await _SmsModule.getTransactionSms(maxCount, minDate);
        const parsed = JSON.parse(raw) as RawSmsMessage[];
        console.log(`[SmsModule] ✅ Read ${parsed.length} financial SMS messages`);
        return parsed;
    } catch (error) {
        console.error('[SmsModule] ❌ Failed to read SMS:', error);
        return [];
    }
}

export function startNativeSmsObserver(): void {
    if (Platform.OS === 'android' && _SmsModule) {
        _SmsModule.startSmsObserver();
    }
}

export function stopNativeSmsObserver(): void {
    if (Platform.OS === 'android' && _SmsModule) {
        _SmsModule.stopSmsObserver();
    }
}

export const SmsModuleEmitter = Platform.OS === 'android' && _SmsModule
    ? new NativeEventEmitter(_SmsModule as any)
    : null;