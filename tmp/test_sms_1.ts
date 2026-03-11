import { extractTransactionFromSMS } from '../services/smsParser';

const testSMS = `Sent Rs.32.00
From HDFC Bank A/C *1088
To PADMA MEDICALS
On 09/03/26
Ref 606857221877
Not You?
Call 18002586161/SMS BLOCK UPI to 7308080808`;

const result = extractTransactionFromSMS(testSMS, 'VM-HDFCBK');
console.log(JSON.stringify(result, null, 2));
