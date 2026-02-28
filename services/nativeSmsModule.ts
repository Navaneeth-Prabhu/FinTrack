// services/nativeSmsModule.ts
// Typed TypeScript bridge for the custom SmsModule native module.
// This is the ONLY file that touches NativeModules — all other SMS code imports from here.

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

export interface RawSmsMessage {
    _id: string;
    address: string;
    body: string;
    date: number; // Unix timestamp in milliseconds
}

interface SmsModuleInterface {
    /**
     * Read SMS inbox messages.
     * @param maxCount  Max messages to return (sorted newest first)
     * @param minDate   Unix timestamp (ms). 0 = no filter.
     * @returns JSON string of RawSmsMessage[]
     */
    getTransactionSms(maxCount: number, minDate: number): Promise<string>;

    /** Start the ContentObserver that watches content://sms/inbox for new messages. */
    startSmsObserver(): void;

    /** Stop the ContentObserver. Call on app unmount / cleanup. */
    stopSmsObserver(): void;

    /** Required by React Native for NativeEventEmitter */
    addListener(eventName: string): void;
    removeListeners(count: number): void;
}

const { SmsModule: _SmsModule } = NativeModules as { SmsModule: SmsModuleInterface | undefined };

/**
 * Read financial SMS messages from the inbox.
 * Returns an empty array on iOS or if the native module is unavailable.
 */
export async function readSmsMessages(
    maxCount = 300,
    minDate = 0,
): Promise<RawSmsMessage[]> {
    if (Platform.OS !== 'android' || !_SmsModule) {
        return [];
    }

    try {
        const raw = await _SmsModule.getTransactionSms(maxCount, minDate);
        return JSON.parse(raw) as RawSmsMessage[];
    } catch (error) {
        console.error('[SmsModule] Failed to read SMS:', error);
        return [];
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
 * Use this in useSMSObserver to listen for real-time incoming SMS.
 */
export const SmsModuleEmitter = Platform.OS === 'android' && _SmsModule
    ? new NativeEventEmitter(_SmsModule as any)
    : null;
