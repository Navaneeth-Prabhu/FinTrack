import { extractTransactionFromSMS } from './services/smsParser';

const falseNeg1 = `Sent Rs.250.00
From HDFC Bank A/C *1088
To MEN AND SHE SQUARE
On 09/03/26
Ref 606857142974
Not You?
Call 18002586161/SMS BLOCK UPI to 7308080808`;

const falseNeg2 = `Sent Rs.983.00
From HDFC Bank A/C *1088
To IVIN T P
On 08/03/26
Ref 119713335364
Not You?
Call 18002586161/SMS BLOCK UPI to 7308080808`;

const falsePos1 = "Remainder airtel axis bank credit card is waiting for ...";
const falsePos2 = "get credit limit up to rs 500000";
const falsePos3 = "alert 50% data is consumed. get 2gb at rs33 till midinitght";
const falsePos4 = "Dear NAVANEETH, manage month-end expenses like a pro! Get your approved loan limit of Rs.39567 for 9 EMIs. Save flat Rs.500 on processing fees with code: AVAIL500- Fibe fb.fbe1.in/ED6LAoY";
const falsePos5 = "REMINDER: Airtel unlimited pack has expired on 9746XXX640 . Recharge now with Rs299 to get unlimited calls, 1.5GB data/day & 100 SMS/day, for 28 days. Recharge on Airtel Thanks App with ZERO CONVENIENCE FEE  i.airtel.in/AirRech";

console.log("=== FALSE NEGATIVES ===");
console.log("HDFC 1:", extractTransactionFromSMS(falseNeg1, "VM-HDFCBK"));
console.log("HDFC 2:", extractTransactionFromSMS(falseNeg2, "VM-HDFCBK"));

console.log("\n=== FALSE POSITIVES ===");
console.log("FP 1:", extractTransactionFromSMS(falsePos1, "AD-AXISBK"));
console.log("FP 2:", extractTransactionFromSMS(falsePos2, "AD-ICICIC"));
console.log("FP 3:", extractTransactionFromSMS(falsePos3, "JD-AIRTEL"));
console.log("FP 4:", extractTransactionFromSMS(falsePos4, "VK-FibeIn"));
console.log("FP 5:", extractTransactionFromSMS(falsePos5, "VK-AIRTEL"));
