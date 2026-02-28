// hooks/useSMSObserver.ts
// Starts the native ContentObserver when the app is alive.
// Listens for 'SmsReceived' events from the native layer and processes them immediately.

import { useEffect } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { extractTransactionFromSMS } from '@/services/smsParser';
import { convertToAppTransaction } from '@/utils/SMSTransactionUtil';
import { getSMSAIPreference, CategorizationOptions } from '@/services/smsCategorizationService';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { supabase } from '@/services/supabaseClient';
import {
    startNativeSmsObserver,
    stopNativeSmsObserver,
    SmsModuleEmitter,
    RawSmsMessage,
} from '@/services/nativeSmsModule';

export function useSMSObserver() {
    const categories = useCategoryStore(state => state.categories);
    const saveTransaction = useTransactionStore(state => state.saveTransaction);

    useEffect(() => {
        if (Platform.OS !== 'android') return;

        const handleNewSms = async (rawJson: string) => {
            try {
                console.log('[SMS::Observer] New SMS event received');
                const raw: RawSmsMessage = JSON.parse(rawJson);
                const parsed = extractTransactionFromSMS(raw.body, raw.address);

                if (!parsed) {
                    console.log('[SMS::Observer] Non-financial SMS, skipping.');
                    return;
                }

                const transactionDate = raw.date
                    ? new Date(raw.date).toISOString()
                    : new Date().toISOString();

                const { data } = await supabase.auth.getSession();
                const userId = data?.session?.user?.id ?? null;
                const aiEnabled = await getSMSAIPreference();
                const options: CategorizationOptions = { aiEnabled, isOnline: true, userId };

                const currentCategories = useCategoryStore.getState().categories;
                const appTransaction = await convertToAppTransaction(
                    { ...parsed, smsId: raw._id, date: transactionDate },
                    currentCategories.length > 0 ? currentCategories : categories,
                    options,
                );

                await saveTransaction(appTransaction);
                console.log(`[SMS::Observer] ✅ Real-time import: ${appTransaction.amount} from ${parsed.bank ?? parsed.sender}`);
            } catch (err) {
                console.error('[SMS::Observer] Error processing realtime SMS:', err);
            }
        };

        // Subscribe to native events
        const subscription = SmsModuleEmitter?.addListener('SmsReceived', handleNewSms);

        // Start the native observer
        startNativeSmsObserver();
        console.log('[SMS::Observer] ContentObserver started');

        // Also handle app coming back to foreground (re-register in case killed)
        const appStateHandler = (nextState: AppStateStatus) => {
            if (nextState === 'active') {
                startNativeSmsObserver();
            } else if (nextState === 'background') {
                // Keep running in background to catch SMS while app stays alive
                // The startup scan handles cold-start recovery
            }
        };
        const appStateSub = AppState.addEventListener('change', appStateHandler);

        return () => {
            subscription?.remove();
            appStateSub.remove();
            stopNativeSmsObserver();
            console.log('[SMS::Observer] ContentObserver stopped');
        };
    }, []);  // Empty deps — we use .getState() getters inside to avoid stale closures
}
