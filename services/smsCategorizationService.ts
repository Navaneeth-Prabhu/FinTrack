// services/smsCategorizationService.ts
// 3-Tier categorization pipeline for SMS transactions.
//
// Tier 1: On-device intent map     (always runs, no network required, fuzzy matches user categories)
// Tier 2: Supabase merchant_mappings DB lookup  (when online)
// Tier 3: Gemini AI via Supabase Edge Function  (when online + user has ai enabled)
//
// Results from Tier 3 are persisted back to merchant_mappings (learning).

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category } from '@/types';
import { TxType } from './smsParser';
import { getMostRecentCategoryForPayee } from '@/db/repository/transactionRepository';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export interface CategoryResult {
    categoryId: string | null;
    categoryName: string;
    confidence: number;
    source: 'keyword' | 'db' | 'ai' | 'fallback';
}

// ─── Tier 1: On-device intent map ───────────────────────────────────────────
// Instead of hardcoding target category names, we define "Intents".
// Each intent maps SMS keywords to a set of possible user category names (synonyms).

interface CategoryIntent {
    type: TxType | 'any';
    nameSynonyms: string[];
    keywords: string[];
}

const CATEGORY_INTENTS: Record<string, CategoryIntent> = {
    'INTENT_FOOD': {
        type: 'expense',
        nameSynonyms: ['food', 'dining', 'eats', 'meal', 'restaurant', 'cafe', 'eating out'],
        keywords: [
            'swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'tea', 'bakery',
            'pizza', 'burger', 'food', 'dominos', 'kfc', 'mcdonalds', 'starbucks',
            'subway', 'biryani', 'dhaba', 'canteen', 'dining', 'meals', 'eatery',
            'bbq', 'grill', 'kitchen', 'diner', 'bistro', 'barbeque', 'haldirams',
            'sapphire', 'behrouz', 'chaat', 'dabba', 'thali', 'tiffin',
        ],
    },
    'INTENT_GROCERIES': {
        type: 'expense',
        nameSynonyms: ['grocery', 'groceries', 'supermarket', 'provisions', 'daily needs', 'essentials'],
        keywords: [
            'grocery', 'supermarket', 'bigbasket', 'blinkit', 'zepto', 'instamart',
            'dmart', 'reliance fresh', 'more supermarkets', 'kirana', 'vegetable',
            'fruit', 'fresh', 'daily needs', 'provision', 'nature basket',
            'spencers', 'big bazaar', 'easyday', 'star bazaar',
        ],
    },
    'INTENT_TRAVEL': {
        type: 'expense',
        nameSynonyms: ['travel', 'travelling', 'transport', 'commute', 'transit', 'cab', 'fuel', 'auto'],
        keywords: [
            'uber', 'ola', 'rapido', 'yulu', 'zoomcar', 'fuel', 'petrol', 'diesel',
            'hpcl', 'bpcl', 'ioc', 'shell', 'metro', 'irctc', 'railway', 'flight',
            'ticket', 'airline', 'indigo', 'airindia', 'spicejet', 'vistara',
            'toll', 'fastag', 'parking', 'cab', 'taxi', 'bus', 'redbus', 'makemytrip',
            'goibibo', 'cleartrip', 'yatra', 'oyo', 'hotel', 'treebo',
        ],
    },
    'INTENT_SHOPPING': {
        type: 'expense',
        nameSynonyms: ['shopping', 'retail', 'clothing', 'apparel', 'gadgets', 'electronics', 'fashion'],
        keywords: [
            'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'purplle',
            'decathlon', 'nike', 'adidas', 'reebok', 'puma', 'levis', 'zara', 'h&m',
            'westside', 'pantaloons', 'lifestyle', 'shopping', 'retail', 'mall',
            'clothing', 'fashion', 'apparel', 'footwear', 'tatacliq', 'shopclues',
            'snapdeal', 'croma', 'vijay sales', 'reliance digital',
        ],
    },
    'INTENT_ENTERTAINMENT': {
        type: 'expense',
        nameSynonyms: ['entertainment', 'fun', 'movies', 'music', 'games', 'leisure', 'ott', 'streaming'],
        keywords: [
            'netflix', 'amazon prime', 'hotstar', 'disney+', 'zee5', 'sonyliv',
            'spotify', 'youtube premium', 'apple music', 'jiocinema', 'mxplayer',
            'voot', 'altbalaji', 'movie', 'cinema', 'theatres', 'bookmyshow',
            'pvr', 'inox', 'cinepolis', 'game', 'steam', 'playgames', 'gaming',
        ],
    },
    'INTENT_BILLS': {
        type: 'expense',
        nameSynonyms: ['bill', 'bills', 'utilities', 'utility', 'recharge', 'mobile', 'internet', 'electricity'],
        keywords: [
            'electricity', 'water', 'gas', 'bill', 'broadband', 'internet', 'wifi',
            'mobile', 'recharge', 'airtel', 'jio', 'vi', 'vodafone', 'bsnl', 'mtnl',
            'tata sky', 'dish tv', 'd2h', 'dth', 'cablecar', 'utility', 'bbmp',
            'msedcl', 'bescom', 'tangedco', 'bses', 'adani electricity',
        ],
    },
    'INTENT_TRANSFER': {
        type: 'transfer',
        nameSynonyms: ['transfer', 'send', 'remittance', 'sent to', 'bank transfer', 'neft', 'rtgs', 'imps'],
        keywords: [
            'transfer', 'sent', 'remittance', 'imps', 'neft', 'rtgs', 'to a/c', 'to account'
        ],
    },
    'INTENT_HEALTH': {
        type: 'expense',
        nameSynonyms: ['health', 'medical', 'pharmacy', 'fitness', 'wellness', 'hospital', 'gym', 'medicine'],
        keywords: [
            'pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'medicine',
            'health', 'apollo', 'fortis', 'max', 'aiims', 'medplus', '1mg', 'pharmeasy',
            'netmeds', 'practo', 'healthians', 'lal path labs', 'thyrocare', 'gym',
            'fitness', 'cult.fit', 'crossfit', 'yoga', 'nursing home',
        ],
    },
    'INTENT_EDUCATION': {
        type: 'expense',
        nameSynonyms: ['education', 'learning', 'school', 'college', 'course', 'books', 'tuition'],
        keywords: [
            'school', 'college', 'university', 'tuition', 'coaching', 'udemy',
            'coursera', 'byju', 'vedantu', 'unacademy', 'whitehat', 'skill',
            'learning', 'course', 'exam', 'library', 'books', 'stationery',
        ],
    },
    'INTENT_INVESTMENT': {
        type: 'investment',
        nameSynonyms: ['investment', 'invest', 'savings', 'mutual fund', 'stocks', 'equity', 'trading', 'crypto', 'fd', 'rd'],
        keywords: [
            'zerodha', 'groww', 'upstox', 'angel one', 'angel broking', '5paisa',
            'sharekhan', 'icici direct', 'hdfc securities', 'kotak securities',
            'motilal oswal', 'edelweiss', 'axis direct', 'nippon', 'hdfc fund',
            'sbi mutual fund', 'icici prudential', 'aditya birla', 'kotak fund',
            'mirae asset', 'parag parikh', 'kfintech', 'cams', 'wazirx', 'coindcx',
            'mutual fund', 'sip', 'systematic investment', 'equity', 'trading',
            'demat', 'ppf', 'nps', 'elss', 'gold', 'sovereign gold bond', 'fixed deposit', 'recurring deposit'
        ],
    },
    // Income Intents
    'INTENT_SALARY': {
        type: 'income',
        nameSynonyms: ['salary', 'paycheck', 'income', 'wage', 'payroll', 'pay'],
        keywords: ['salary', 'sal credit', 'payroll', 'wages', 'monthly pay'],
    },
    'INTENT_REFUND': {
        type: 'income',
        nameSynonyms: ['refund', 'reversal', 'cashback', 'returns'],
        keywords: ['refund', 'reversed', 'chargeback', 'reversal', 'returned', 'cashback'],
    },
    'INTENT_INTEREST': {
        type: 'income',
        nameSynonyms: ['interest', 'dividend', 'yield'],
        keywords: ['interest', 'fd interest', 'savings interest', 'dividend'],
    },
};

// ─── Merchant normalization ───────────────────────────────────────────────────
function normalizeMerchantKey(merchant: string): string {
    return merchant
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ');
}

function findCategoryByIntent(
    intent: CategoryIntent,
    categories: Category[],
    transactionType: TxType,
): Category | undefined {
    // 1. Exact match on any synonym (must match transaction type)
    let match = categories.find(c =>
        c.type === transactionType &&
        intent.nameSynonyms.some(syn => c.name.toLowerCase() === syn.toLowerCase())
    );
    if (match) return match;

    // 2. Partial match on any synonym (must match transaction type)
    match = categories.find(c =>
        c.type === transactionType &&
        intent.nameSynonyms.some(syn => c.name.toLowerCase().includes(syn) || syn.includes(c.name.toLowerCase()))
    );

    return match;
}

// ─── Tier 1: Keyword/Intent matching ──────────────────────────────────────────
function keywordMatch(
    merchant: string,
    smsBody: string,
    type: TxType,
    categories: Category[],
): CategoryResult | null {
    const merchantLower = merchant?.toLowerCase() ?? '';
    const bodyLower = smsBody.toLowerCase();
    const searchText = `${merchantLower} ${bodyLower}`;

    for (const [intentKey, intent] of Object.entries(CATEGORY_INTENTS)) {
        // Respect type match if intent is strict about type
        if (intent.type !== 'any' && intent.type !== type) continue;

        const matchedKeyword = intent.keywords.some(kw => searchText.includes(kw));
        if (!matchedKeyword) continue;

        // Found intent! Now search the user's categories for an appropriate match
        const categoryMatch = findCategoryByIntent(intent, categories, type);

        if (categoryMatch) {
            return {
                categoryId: categoryMatch.id,
                categoryName: categoryMatch.name,
                confidence: 0.75,
                source: 'keyword',
            };
        }

        // If no user category matches the intent, fallback to the primary synonym name 
        // string (capitalized) so caller knows the general classification.
        const defaultName = intent.nameSynonyms[0].charAt(0).toUpperCase() + intent.nameSynonyms[0].slice(1);
        return {
            categoryId: null,
            categoryName: defaultName,
            confidence: 0.65,
            source: 'keyword',
        };
    }

    return null;
}

// ─── Tier 2: DB merchant_mappings lookup ──────────────────────────────────────
async function dbLookup(
    merchantNormalized: string,
    userId: string,
    categories: Category[],
    type: TxType,
): Promise<CategoryResult | null> {
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data, error } = await supabase
            .from('merchant_mappings')
            .select('category_id, confidence')
            .eq('merchant_normalized', merchantNormalized)
            .eq('user_id', userId)
            .order('confidence', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) return null;

        const cat = categories.find(c => c.id === data.category_id && c.type === type);
        if (!cat) return null;

        // Update usage count in background (fire and forget)
        supabase.from('merchant_mappings')
            .update({ usage_count: data.confidence, last_used_at: new Date().toISOString() } as any)
            .eq('merchant_normalized', merchantNormalized)
            .eq('user_id', userId)
            .then(() => { });

        return {
            categoryId: cat.id,
            categoryName: cat.name,
            confidence: Number(data.confidence),
            source: 'db',
        };
    } catch {
        return null;
    }
}

// ─── Tier 3: AI via Supabase Edge Function ────────────────────────────────────
async function aiCategorize(
    merchant: string,
    amount: number,
    type: TxType,
    categories: Category[],
    userId: string,
): Promise<CategoryResult | null> {
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) return null;

        const payload = {
            merchant,
            amount,
            type,
            categories: categories.map(c => ({ id: c.id, name: c.name })),
        };

        const res = await fetch(`${SUPABASE_URL}/functions/v1/sms-categorize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) return null;

        const json = await res.json();
        if (!json?.category) return null;

        const matchedCat = categories.find(c =>
            (c.id === json.categoryId || c.name.toLowerCase() === json.category.toLowerCase()) && c.type === type
        );

        const result: CategoryResult = {
            categoryId: matchedCat?.id ?? null,
            categoryName: matchedCat?.name ?? json.category,
            confidence: json.confidence ?? 0.7,
            source: 'ai',
        };

        // Save learned mapping back to DB
        if (matchedCat) {
            const normalized = normalizeMerchantKey(merchant);
            supabase.from('merchant_mappings').upsert({
                user_id: userId,
                merchant_raw: merchant,
                merchant_normalized: normalized,
                category_id: matchedCat.id,
                confidence: result.confidence,
                is_global: false,
                usage_count: 1,
            }, { onConflict: 'user_id, merchant_normalized' }).then(() => { });
        }

        return result;
    } catch (err) {
        console.warn('[SMS::Categor] AI call failed:', err);
        return null;
    }
}

// ─── Fallback: "Other" category ───────────────────────────────────────────────
function getFallbackCategory(type: TxType, categories: Category[]): CategoryResult {
    const isIncome = type === 'income';
    const fallbackNames = isIncome
        ? ['other income', 'uncategorized income', 'miscellaneous income', 'other']
        : ['other', 'uncategorized', 'miscellaneous', 'general'];

    // Strict type match only! Never fallback to a category of the wrong type.
    const other = categories.find(c =>
        c.type === type && fallbackNames.some(n => c.name.toLowerCase() === n)
    );

    const defaultName = isIncome ? 'Other Income' : 'Other';

    return {
        categoryId: other?.id ?? null,
        categoryName: other?.name ?? defaultName,
        confidence: 0.1,
        source: 'fallback',
    };
}

// ─── Public API ───────────────────────────────────────────────────────────────
export interface CategorizationOptions {
    aiEnabled: boolean;
    isOnline: boolean;
    userId: string | null;
}

const AI_ENABLED_CACHE_KEY = 'sms_ai_enabled_user_pref';

export async function getSMSAIPreference(): Promise<boolean> {
    try {
        const val = await AsyncStorage.getItem(AI_ENABLED_CACHE_KEY);
        return val === 'true';
    } catch {
        return false;
    }
}

export async function setSMSAIPreference(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(AI_ENABLED_CACHE_KEY, enabled ? 'true' : 'false');
}

export async function categorizeTransaction(
    merchant: string | null,
    amount: number,
    type: TxType,
    categories: Category[],
    options: CategorizationOptions,
): Promise<CategoryResult> {
    const safeM = merchant ?? '';
    const normalized = normalizeMerchantKey(safeM);

    // ── Tier 1: Local Transaction History ───────────────────────────────────
    if (safeM.length > 1) {
        const localHistoricCategoryResult = await checkLocalHistory(safeM, type, categories);
        if (localHistoricCategoryResult) return localHistoricCategoryResult;
    }

    // ── Tier 1.5: On-device keywords ────────────────────────────────────────
    // Pass empty body here; categories that don't match merchant will be
    // matched against the raw SMS in the calling utility if needed.
    const kwResult = keywordMatch(safeM, safeM, type, categories);
    if (kwResult && kwResult.confidence >= 0.75) {
        console.log(`[SMS::Categor] Tier1.5 Keyword match: "${kwResult.categoryName}" (${kwResult.confidence})`);
        return kwResult;
    }

    if (!options.isOnline || !options.userId) {
        // Offline — return keyword result even if low confidence, else fallback
        return kwResult ?? getFallbackCategory(type, categories);
    }

    // ── Tier 2: DB lookup ───────────────────────────────────────────────────
    if (normalized.length > 1) {
        const dbResult = await dbLookup(normalized, options.userId, categories, type);
        if (dbResult && dbResult.confidence >= 0.6) {
            console.log(`[SMS::Categor] Tier2 DB match: "${dbResult.categoryName}" (${dbResult.confidence})`);
            return dbResult;
        }
    }

    // ── Tier 3: AI (premium / ai-enabled users) ─────────────────────────────
    if (options.aiEnabled && safeM.length > 1) {
        const aiResult = await aiCategorize(safeM, amount, type, categories, options.userId);
        if (aiResult) {
            console.log(`[SMS::Categor] Tier3 AI match: "${aiResult.categoryName}" (${aiResult.confidence})`);
            return aiResult;
        }
    }

    // Final: keyword low-confidence or fallback
    return kwResult ?? getFallbackCategory(type, categories);
}

// ─── Helper: Local History check ──────────────────────────────────────────────
async function checkLocalHistory(merchant: string, type: TxType, categories: Category[]): Promise<CategoryResult | null> {
    try {
        const categoryId = await getMostRecentCategoryForPayee(merchant, type);
        if (categoryId) {
            const cat = categories.find(c => c.id === categoryId);
            if (cat) {
                console.log(`[SMS::Categor] Tier1.5 Local History match: "${cat.name}"`);
                return {
                    categoryId: cat.id,
                    categoryName: cat.name,
                    confidence: 0.9, // High confidence since user previously categorized this exactly
                    source: 'db',
                };
            }
        }
    } catch (err) {
        console.warn('[SMS::Categor] Local history check failed:', err);
    }
    return null;
}

/**
 * Categorize with raw SMS body for extra keyword context.
 * Used by SMSTransactionUtil when the merchant alone doesn't match but the body might.
 */
export async function categorizeWithContext(
    merchant: string | null,
    smsBody: string,
    amount: number,
    type: TxType,
    categories: Category[],
    options: CategorizationOptions,
): Promise<CategoryResult> {
    const safeM = merchant ?? '';

    // First try with merchant
    const result = await categorizeTransaction(safeM, amount, type, categories, options);
    if (result.source !== 'fallback') return result;

    // If fallback, try matching raw SMS body against keywords
    const bodyMatch = keywordMatch(safeM, smsBody, type, categories);
    if (bodyMatch) {
        console.log(`[SMS::Categor] Body keyword match: "${bodyMatch.categoryName}"`);
        return bodyMatch;
    }

    return result;
}
