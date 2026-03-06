const rawBody = "Dear Investor, Your SIP PLUS of Rs.999.95 in Folio 13365121 in Value Fund (erstwhile Value Discovery Fund) - Growth for 2.098 units has been processed for NAV of Rs.476.62 on 05-Mar-2026 - IPRUMF";

let fundName = 'Mutual Fund SIP';
const fundPatterns = [
    /(?:scheme|fund)[:\s]+([A-Z][A-Za-z0-9\s&\()\-]{4,60}?)(?:\s*[-–]\s*(?:Direct|Regular|Growth|Dividend)|Plan|Folio|\s*Dt|\.|$)/i,
    /Folio\s*\d+.*?in\s+([A-Z][A-Za-z0-9\s&\()\-]{4,60}?)\s+(?:Fund|Plan|Scheme)\b/i,
    /(?:in|for)\s+([A-Z][A-Za-z0-9\s&\()\-]{4,60}?)\s+(?:Fund|Plan|Scheme|Dir|Direct|Regular|Growth)/i,
    /([A-Z][A-Za-z0-9\s&\()\-]{5,60}?)\s+(?:SIP|Mutual Fund|MF|Index Fund)\b/i,
];
for (const p of fundPatterns) {
    const m = rawBody.match(p);
    if (m?.[1] && !m[1].toLowerCase().includes('folio')) {
        fundName = m[1].trim();
        break;
    }
}
console.log("fundName:", fundName);
