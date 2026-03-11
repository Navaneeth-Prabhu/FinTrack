const BANK_PATTERNS = {
    hdfc: {
        debit: [
            /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:has been|is)\s*debited/i,
            /debited[\s\S]*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i,
            /(?:spent|paid|sent)[\s\S]*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i,
            /NACH[\s\S]*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i,
        ],
        credit: [
            /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:has been|is)\s*credited/i,
            /credited.*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i,
            /received.*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i,
        ],
        merchant: [
            /to\s+VPA\s+[\w.\-]+@[\w.\-]+\s+([A-Z0-9][A-Za-z0-9\s&.'\-]{1,40}?)\s+on\s+/i,
            /by\s+VPA\s+[\w.\-]+@[\w.\-]+\s+([A-Z][A-Z\s]{2,40}?)\s+on\s+/i,
            /to\s+VPA\s+[\w@.\-]+\s+\(([^)]+)\)/i,
            /at\s+([A-Z][A-Z0-9\s\-\.&,']{2,40}?)(?:\s+on|\s+dated|\.|,|$)/i,
            /NACH.*?(?:to|for)\s+([A-Z][A-Za-z0-9\s\-\.&]{2,40}?)(?:\s+on|\s+dated|\.|$)/i,
            /to\s+([A-Z0-9][A-Za-z0-9\s&.\-']{2,40}?)(?:\s+on|\s+ref|\s+dated|\.|,|$)/i,
            /(?:to|by)\s+VPA\s+([\w.\-]+)@/i,
        ],
    }
};

const GENERIC_DEBIT_PATTERNS = [
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:has been|is|been)?\s*(?:debited|deducted|withdrawn)/i,
    /(?:debited|deducted|withdrawn|spent|paid)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:Dr\.?|DR)\b/i,
    /amount\s+(?:of\s+)?(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:debited|deducted)/i,
];

const GENERIC_AMOUNT_PATTERNS = [
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR)/i,
    /amount[:\s]+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
];

function normaliseSMSBody(body) {
    return body.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function parseAmountStr(raw) {
    const value = parseFloat(raw.replace(/,/g, ''));
    return isNaN(value) || value <= 0 ? 0 : value;
}

function extractAmount(body, bankKey) {
    if (bankKey && BANK_PATTERNS[bankKey]) {
        for (const p of BANK_PATTERNS[bankKey].debit) {
            const m = body.match(p);
            if (m?.[1]) return { amount: parseAmountStr(m[1]), type: 'expense', pattern: p.toString() };
        }
    }
    for (const p of GENERIC_AMOUNT_PATTERNS) {
        const m = body.match(p);
        if (m?.[1]) return { amount: parseAmountStr(m[1]), type: null, pattern: 'generic amount' };
    }
    return { amount: 0, type: null };
}

console.log("HDFC 1:", extractAmount(normaliseSMSBody(`Sent Rs.250.00\r\nFrom HDFC Bank A/C *1088\r\nTo MEN AND SHE SQUARE\r\nOn 09/03/26`), 'hdfc'));
console.log("HDFC 2:", extractAmount(normaliseSMSBody(`Sent Rs.983.00\r\nFrom HDFC Bank A/C *1088\r\nTo IVIN T P`), 'hdfc'));
console.log("FP 1:", extractAmount(normaliseSMSBody(`alert 50% data is consumed. get 2gb at rs33 till midinitght`), null));
console.log("FP 2:", extractAmount(normaliseSMSBody(`get credit limit up to rs 500000`), null));
