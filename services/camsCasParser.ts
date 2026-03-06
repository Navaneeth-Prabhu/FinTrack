import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { useHoldingsStore } from '@/stores/holdingsStore';
import { useSIPStore } from '@/stores/sipStore';

const generateId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

export interface CamsImportResult {
    status: 'success' | 'error' | 'cancelled';
    message?: string;
    holdingsImported?: number;
    sipPlansImported?: number;
}

export const importCamsData = async (): Promise<CamsImportResult> => {
    try {
        // 1. Pick file
        const result = await DocumentPicker.getDocumentAsync({
            type: ['text/csv', 'application/json', 'text/comma-separated-values'],
            copyToCacheDirectory: true,
        });

        if (result.canceled) {
            return { status: 'cancelled' };
        }

        const file = result.assets[0];
        const fileContent = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });

        if (!fileContent || fileContent.trim() === '') {
            return { status: 'error', message: 'The selected file is empty.' };
        }

        // 2. Parse file
        let rawItems: any[] = [];
        const isJson = file.name.endsWith('.json');

        if (isJson) {
            try {
                const parsedData = JSON.parse(fileContent);
                if (Array.isArray(parsedData)) {
                    rawItems = parsedData;
                } else {
                    // Sometimes it might be wrapped in an object like { data: [...] }
                    rawItems = parsedData.data || parsedData.holdings || [];
                }
            } catch (e) {
                return { status: 'error', message: 'Invalid JSON format.' };
            }
        } else {
            // CSV Parsing
            const parsed = Papa.parse(fileContent, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
            });

            if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
                console.warn('[CAMS Import] Parse errors:', parsed.errors);
                return { status: 'error', message: 'Could not parse CSV file. Ensure it has valid headers.' };
            }
            rawItems = parsed.data;
        }

        if (rawItems.length === 0) {
            return { status: 'error', message: 'No records found in the file' };
        }

        // 3. Process and write to stores
        const holdingsStore = useHoldingsStore.getState();
        const sipStore = useSIPStore.getState();
        const now = new Date().toISOString();

        let holdingsCount = 0;
        let sipCount = 0;

        for (const item of rawItems) {
            // Map standard CAS / generic keys to our data model.
            // We look for common keywords
            const name = item.SchemeName || item.Scheme || item.name || item.scheme_name || item.FundName || item.Item || null;
            if (!name) continue; // Skip if no name can be identified

            const quantity = parseFloat(item.BalanceUnits || item.Units || item.units || item.quantity || 0);
            const nav = parseFloat(item.NAV || item.nav || item.CurrentPrice || item.price || 0);
            const value = parseFloat(item.CurrentValue || item.Value || item.value || item.current_value || 0);
            const invested = parseFloat(item.InvestmentAmount || item.Invested || item.invested_amount || item.CostValue || 0);
            const folio = item.FolioNo || item.Folio || item.folio_number || item.folio || undefined;

            if (quantity <= 0) continue; // Skip zero balance

            // Determine if it looks like an active SIP vs just a holding. 
            // Without deep CAS transaction analysis, we create Holdings for everything.
            // If we see SIP indicators, we optionally create a SIPPlan.
            const isSip = String(item.IsSIP || item.SIP || '').toLowerCase() === 'yes' ||
                String(name).toLowerCase().includes('sip');

            const holdingId = generateId();
            const avgBuy = quantity > 0 && invested > 0 ? (invested / quantity) : nav;

            const newHolding = {
                id: holdingId,
                type: 'other' as const, // We default to 'other' (Mutual Fund) if type is not explicit
                name: String(name).trim(),
                quantity: quantity,
                avg_buy_price: isNaN(avgBuy) ? 0 : avgBuy,
                current_price: isNaN(nav) ? 0 : nav,
                buy_date: now,
                folio_number: folio,
                source: 'cams_import',
                price_updated_at: now,
                updated_at: now,
                notes: 'Imported via CAMS/CAS data file.'
            };

            await holdingsStore.addHolding(newHolding as any);
            holdingsCount++;

            // Optionally link to a SIP if requested/detected
            if (isSip) {
                const sipId = generateId();
                const sipAmount = parseFloat(item.SIPAmount || item.InstallmentAmount || 0) || 1000;
                const newSip = {
                    id: sipId,
                    name: String(name).trim(),
                    amount: sipAmount,
                    dayOfMonth: item.SIPDay || 1, // Default to 1 if unknown
                    nextDate: now,
                    status: 'active' as const,
                    units: quantity,
                    nav: isNaN(nav) ? undefined : nav,
                    currentValue: isNaN(value) ? undefined : value,
                    totalInvested: isNaN(invested) ? undefined : invested,
                    linkedHoldingId: holdingId,
                    createdAt: now,
                    updatedAt: now
                };
                await sipStore.addSIP(newSip as any);
                sipCount++;
            }
        }

        // Refresh views
        await holdingsStore.fetchHoldings();
        await sipStore.fetchSIPs();

        return {
            status: 'success',
            holdingsImported: holdingsCount,
            sipPlansImported: sipCount,
            message: `Imported ${holdingsCount} holdings${sipCount > 0 ? ` and ${sipCount} SIPs` : ''} successfully.`
        };

    } catch (err) {
        console.error('[CAMS Import] Error:', err);
        return {
            status: 'error',
            message: err instanceof Error ? err.message : 'An unknown error occurred during import'
        };
    }
};
