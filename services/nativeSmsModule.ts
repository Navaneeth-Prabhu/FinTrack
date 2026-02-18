// services/nativeSmsModule.ts
// Typed TypeScript bridge for the custom SmsModule native module.
// This is the ONLY file that touches NativeModules — all other SMS code imports from here.

import { NativeModules, Platform } from 'react-native';

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
}

const { SmsModule } = NativeModules as { SmsModule: SmsModuleInterface | undefined };

/**
 * Read financial SMS messages from the inbox.
 * Returns an empty array on iOS or if the native module is unavailable.
 */
export async function readSmsMessages(
    maxCount = 300,
    minDate = 0,
): Promise<RawSmsMessage[]> {
    if (Platform.OS !== 'android' || !SmsModule) {
        return [];
    }

    try {
        const raw = await SmsModule.getTransactionSms(maxCount, minDate);
        return JSON.parse(raw) as RawSmsMessage[];
    } catch (error) {
        console.error('[SmsModule] Failed to read SMS:', error);
        return [];
    }
}
