// scripts/testFuzzyCategorization.ts
// Standalone test for the dynamic category matching.
// Run with: npx ts-node scripts/testFuzzyCategorization.ts

import { categorizeTransaction } from '../services/smsCategorizationService';
import { Category } from '../types';

// Mock user categories
const userCategories: Category[] = [
    { id: '1', name: 'Dining Out', icon: 'food', color: '#000', type: 'expense' },
    { id: '2', name: 'Supermarket', icon: 'cart', color: '#000', type: 'expense' },
    { id: '3', name: 'Transport & Fuel', icon: 'car', color: '#000', type: 'expense' },
    { id: '4', name: 'Misc Shopping', icon: 'bag', color: '#000', type: 'expense' },
    { id: '9', name: 'Other', icon: 'question', color: '#000', type: 'expense' }
];

const opts = { aiEnabled: false, isOnline: false, userId: 'test' };

async function run() {
    console.log('\n🧪 Testing Dynamic Fuzzy Categorization\n');
    let passed = 0; let failed = 0;

    const testCases = [
        {
            label: 'Swiggy -> Dining Out (Food intent)',
            merchant: 'Swiggy', amount: 500, type: 'expense' as const,
            expectName: 'Dining Out', expectId: '1'
        },
        {
            label: 'DMart -> Supermarket (Groceries intent)',
            merchant: 'DMART', amount: 1500, type: 'expense' as const,
            expectName: 'Supermarket', expectId: '2'
        },
        {
            label: 'Uber -> Transport & Fuel (Transport intent)',
            merchant: 'Uber Rides', amount: 250, type: 'expense' as const,
            expectName: 'Transport & Fuel', expectId: '3'
        },
        {
            label: 'Amazon -> Misc Shopping (Shopping intent)',
            merchant: 'AMAZON PAY', amount: 899, type: 'expense' as const,
            expectName: 'Misc Shopping', expectId: '4'
        },
        {
            label: 'Netflix -> Entertainment (No matching user category, fallback to Intent Name)',
            merchant: 'Netflix', amount: 199, type: 'expense' as const,
            expectName: 'Entertainment', expectId: null
        }
    ];

    for (const t of testCases) {
        process.stdout.write(`Testing [${t.merchant}]... `);
        const res = await categorizeTransaction(t.merchant, t.amount, t.type, userCategories, opts);

        if (res.categoryName === t.expectName && res.categoryId === t.expectId) {
            console.log(`✅ Passed (Matched: ${res.categoryName})`);
            passed++;
        } else {
            console.log(`❌ Failed. Expected ${t.expectName} (${t.expectId}), got ${res.categoryName} (${res.categoryId})`);
            failed++;
        }
    }

    console.log(`\n🏁 Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

run();
