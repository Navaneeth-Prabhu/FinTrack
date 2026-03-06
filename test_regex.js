function parseAmount(str) {
    return parseFloat(str.replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
}

const rawBody = "Dear Investor, Your SIP PLUS of Rs.999.95 in Folio 13365121 in Value Fund (erstwhile Value Discovery Fund) - Growth for 2.098 units has been processed for NAV of Rs.476.62 on 05-Mar-2026 - IPRUMF";
const body = rawBody;

const hasNAV = /NAV[:\s]*([\d,]+\.?\d+)/i.test(body);
const hasUnits = /units?[:\s]*([\d,]+\.?\d+)/i.test(body) || /units?\s+allotted/i.test(body);
console.log("hasNAV:", hasNAV);
console.log("hasUnits:", hasUnits);

const amountPatterns = [
    /(?:SIP Amount|Amount|SIP of|for\s+(?:Rs\.?|INR|₹))[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
    /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:in|invested|for)/i,
    /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i,
];
let amount = 0;
for (const p of amountPatterns) {
    const m = body.match(p);
    if (m) { amount = parseAmount(m[1]); break; }
}
console.log("amount:", amount);

const unitsPatterns = [
    /units?\s+allotted\s*([\d,]+\.?\d+)/i,
    /(?:Units?|Qty)[:\s]*([\d,]+\.?\d+)/i,
    /for\s+([\d,]+\.?\d+)\s+units?/i,
    /([\d,]+\.?\d+)\s+units?\s+(?:allotted|credited)/i,
];
let units = 0;
for (const p of unitsPatterns) {
    const m = body.match(p);
    if (m) { units = parseAmount(m[1]); break; }
}
console.log("units:", units);

const navMatch =
    body.match(/NAV[:\s]+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d+)/i) ||
    body.match(/(?:NAV|Price)[:\s]*([\d,]+\.?\d+)/i) ||
    body.match(/NAV\s+(?:of\s+)?(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d+)/i);
let nav = navMatch ? parseAmount(navMatch[1]) : 0;
console.log("nav:", nav);

const folioMatch = body.match(/Folio\s*(?:No\.?|Number)?[:\s]*(\d{4,12})/i);
const folioNumber = folioMatch?.[1] ?? '';
console.log("folio:", folioNumber);

let fundName = 'Mutual Fund SIP';
const fundPatterns = [
    /(?:scheme|fund)[:\s]+([A-Z][A-Za-z0-9\s&\-()]{4,60}?)(?:\s*[-–]\s*(?:Direct|Regular|Growth|Dividend)|Plan|Folio|\s*Dt|\.|$)/i,
    /(?:in|for)\s+([A-Z][A-Za-z0-9\s&\-()]{4,60}?)\s+(?:Fund|Plan|Scheme|Dir|Direct|Regular|Growth)/i,
    /([A-Z][A-Za-z0-9\s&\-()]{5,60}?)\s+(?:SIP|Mutual Fund|MF|Index Fund)\b/i,
];
for (const p of fundPatterns) {
    const m = body.match(p);
    if (m?.[1]) { fundName = m[1].trim(); break; }
}
console.log("fundName:", fundName);
