import { AppRegistry } from 'react-native';
import { extractTransactionFromSMS } from './smsParser';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { convertToAppTransaction } from '@/utils/SMSTransactionUtil';
import { getSMSAIPreference, CategorizationOptions } from './smsCategorizationService';
import { supabase } from '@/services/supabaseClient';
import {
    isSmsProcessedInDb,
    saveProcessedSmsIdsToDb,
    advanceSmsWatermarkInDb,
} from '@/db/services/sqliteService';

const buildHeadlessSmsId = (body: string, sender: string | undefined, timestamp: number): string => {
    // Stable lightweight hash to dedup repeated headless callbacks for the same SMS.
    let hash = 0;
    for (let i = 0; i < body.length; i++) {
        hash = (hash * 31 + body.charCodeAt(i)) >>> 0;
    }
    const senderPart = (sender || 'unknown').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
    return `headless_${timestamp}_${senderPart}_${hash.toString(16)}`;
};

const resolveTransactionDate = (parsedDate: string | null, receiveMs: number): string => {
    const receiveTs = new Date(receiveMs).toISOString();
    if (!parsedDate) return receiveTs;

    const bodyDateMs = new Date(parsedDate).getTime();
    const now = Date.now();
    const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

    if (bodyDateMs > now) return receiveTs;
    if (now - bodyDateMs > SIX_MONTHS_MS) return receiveTs;
    return parsedDate;
};

// Helper to reliably push the headless transaction
const processSmsHeadless = async (taskData: { body: string; sender?: string; timestamp: number }) => {
    console.log(`[SMS::Headless] Received SMS from ${taskData.sender}`);

    try {
        const smsId = buildHeadlessSmsId(taskData.body, taskData.sender, taskData.timestamp);
        if (await isSmsProcessedInDb(smsId)) {
            console.log(`[SMS::Headless] SMS ${smsId} already processed, skipping.`);
            return;
        }

        const parsedSMS = extractTransactionFromSMS(taskData.body, taskData.sender);
        if (!parsedSMS) {
            console.log('[SMS::Headless] Ignored non-financial or unparseable SMS.');
            return;
        }

        const transactionDate = resolveTransactionDate(parsedSMS.date, taskData.timestamp);
        console.log(`[SMS::Headless] Parsed transaction for ${parsedSMS.amount} at ${transactionDate}`);

        // Wait until Zustand stores are hydrated if possible, or force fetch them.
        let categories = useCategoryStore.getState().categories;
        if (categories.length === 0) {
            console.log('[SMS::Headless] Waiting for categories to hydrate...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            categories = useCategoryStore.getState().categories;
        }

        const { data } = await supabase.auth.getSession();
        const userId = data?.session?.user?.id ?? null;
        const aiEnabled = await getSMSAIPreference();

        // Best effort: if network fails categorization already degrades safely.
        const options: CategorizationOptions = { aiEnabled, isOnline: true, userId };

        const appTransaction = await convertToAppTransaction(
            { ...parsedSMS, smsId, date: transactionDate },
            categories,
            options
        );

        await useTransactionStore.getState().saveTransaction(appTransaction);
        await saveProcessedSmsIdsToDb([smsId], taskData.timestamp || Date.now());
        await advanceSmsWatermarkInDb(taskData.timestamp || Date.now());
        console.log(`[SMS::Headless] Successfully saved transaction ${appTransaction.id}`);

    } catch (err) {
        console.error('[SMS::Headless] Error processing SMS', err);
    }
};

AppRegistry.registerHeadlessTask('SmsNewTransaction', () => processSmsHeadless);
