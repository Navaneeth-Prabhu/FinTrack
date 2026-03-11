// standalone text test
const body = `Sent Rs.32.00 From HDFC Bank A/C *1088 To PADMA MEDICALS On 09/03/26 Ref 606857221877 Not You? Call 18002586161/SMS BLOCK UPI to 7308080808`;

console.log("--- amount HDFC debit ---");
const p1 = /(?:spent|paid|sent)[\s\S]*?(?:Rs\.?|INR)\s*([\d,]+\.?\d*)/i;
console.log(body.match(p1));

console.log("--- merchant generic sent/transferred ---");
const p2 = /(?:sent|transferred)\s+[₹Rs.INR\d,.]+(?:[\s\S]*?)\sto\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+for|\s+via|\.|\s*$)/i;
console.log(body.match(p2));

console.log("--- merchant generic paid to ---");
const p3 = /paid\s+(?:to|at)\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+for|\.|$)/i;
console.log(body.match(p3));

console.log("--- date HDFC ---");
const p4 = /on\s+(\d{2}-(?:[A-Za-z]{3}|\d{2})-\d{2,4})/i;
console.log(body.match(p4));

console.log("--- date generic ---");
const p5 = /\b(?:on\s+|for\s+)?(?<d>\d{1,2})[\/\-\.](?<m>\d{1,2})[\/\-\.](?<y>\d{2,4})\b/i;
console.log(body.match(p5));

console.log("--- merchant generic 2 ---");
const p2_new = /(?:sent|transferred).*?(?:to\s+)([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+for|\s+via|\.|\s*$)/i;
console.log(body.match(p2_new));

console.log("--- merchant new idea ---");
// The string has "To PADMA MEDICALS On 09/03/26"
const p_fix = /to\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on\s+)/i;
console.log(body.match(p_fix));
