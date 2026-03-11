const text1 = "Sent Rs.250.00 From HDFC Bank A/C *1088 To MEN AND SHE SQUARE On 09/03/26 Ref 606857142974 Not You? Call 18002586161/SMS BLOCK UPI to 7308080808";

const r1 = /(?:spent|paid|sent)[\s\S]*?(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)/i;
console.log("HDFC debit:", text1.match(r1));

const text2 = "alert 50% data is consumed. get 2gb at rs33 till midinitght";
const r2 = /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
console.log("Generic amount:", text2.match(r2));
