function isPromotionalSms(body) {
    const lower = body.toLowerCase();
    const spamKeywords = [
        'loan limit', 'credit limit', 'approved loan', 'limit up to',
        'is consumed', 'pack has expired', 'recharge now',
        'save flat', 'processing fees', 'convenience fee',
        'reminder', 'offer', 'win ', 'discount', 'cashback of',
        'apply now', 'pre-approved', 'pre approved', 'personal loan',
        'get 2gb', 'get 1gb', 'till midnight', 'waiting for',
        'hurry', 'limited time'
    ];
    return spamKeywords.some(kw => lower.includes(kw));
}

const falsePos1 = "Remainder airtel axis bank credit card is waiting for ...";
const falsePos2 = "get credit limit up to rs 500000";
const falsePos3 = "alert 50% data is consumed. get 2gb at rs33 till midinitght";
const falsePos4 = "Dear NAVANEETH, manage month-end expenses like a pro! Get your approved loan limit of Rs.39567 for 9 EMIs. Save flat Rs.500 on processing fees with code: AVAIL500- Fibe fb.fbe1.in/ED6LAoY";
const falsePos5 = "REMINDER: Airtel unlimited pack has expired on 9746XXX640 . Recharge now with Rs299 to get unlimited calls, 1.5GB data/day & 100 SMS/day, for 28 days. Recharge on Airtel Thanks App with ZERO CONVENIENCE FEE  i.airtel.in/AirRech";

console.log("FP1 filter:", isPromotionalSms(falsePos1));
console.log("FP2 filter:", isPromotionalSms(falsePos2));
console.log("FP3 filter:", isPromotionalSms(falsePos3));
console.log("FP4 filter:", isPromotionalSms(falsePos4));
console.log("FP5 filter:", isPromotionalSms(falsePos5));
