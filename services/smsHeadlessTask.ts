import { AppRegistry } from 'react-native';
import { extractTransactionFromSMS, ParsedSMS } from './smsParser';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { convertToAppTransaction } from '@/utils/SMSTransactionUtil';
import { getSMSAIPreference, CategorizationOptions } from './smsCategorizationService';
import { supabase } from '@/services/supabaseClient';

// Helper to reliably push the headless transaction 
const processSmsHeadless = async (taskData: { body: string; sender?: string; timestamp: number }) => {
    console.log(`[SMS::Headless] Received SMS from ${taskData.sender}`);

    try {
        const parsedSMS = extractTransactionFromSMS(taskData.body, taskData.sender);
        if (!parsedSMS) {
            console.log('[SMS::Headless] Ignored non-financial or unparseable SMS.');
            return;
        }

        const transactionDate = new Date(taskData.timestamp).toISOString();
        console.log(`[SMS::Headless] Parsed transaction for ${parsedSMS.amount} at ${transactionDate}`);

        // Wait until Zustand stores are hydrated if possible, or force fetch them
        // Note: in a headless task, Zustand might not be fully initialized or hydrated if it relies on async storage
        // We fetch categories explicitly
        let categories = useCategoryStore.getState().categories;
        if (categories.length === 0) {
            console.log('[SMS::Headless] Waiting for categories to hydrate...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            categories = useCategoryStore.getState().categories;
        }

        const { data } = await supabase.auth.getSession();
        const userId = data?.session?.user?.id ?? null;
        const aiEnabled = await getSMSAIPreference();

        // We assume online is true as best effort for categorization. 
        // It will gracefully degrade to local if network fails.
        const options: CategorizationOptions = { aiEnabled, isOnline: true, userId };

        const appTransaction = await convertToAppTransaction(
            { ...parsedSMS, smsId: `headless_${taskData.timestamp}`, date: transactionDate },
            categories,
            options
        );

        await useTransactionStore.getState().saveTransaction(appTransaction);
        console.log(`[SMS::Headless] Successfully saved transaction ${appTransaction.id}`);

        // TODO: Consider emitting a DeviceEventEmitter event here so the UI can toast it if the app is alive 

    } catch (err) {
        console.error('[SMS::Headless] Error processing SMS', err);
    }
};

AppRegistry.registerHeadlessTask('SmsNewTransaction', () => processSmsHeadless);
