import { extractTransactionFromSMS } from './services/smsParser';
import { classifySMSIntent } from './services/smsAlertParser';

const sms = `Sent Rs.250.00
From HDFC Bank A/C *1088
To MEN AND SHE SQUARE
On 09/03/26
Ref 606857142974
Not You?
Call 18002586161/SMS BLOCK UPI to 7308080808`;

const sender = 'VM-HDFCBK';

console.log('Intent Classifier check:');
console.log(classifySMSIntent(sms, sender));

console.log('\nMain Parser check:');
console.log(extractTransactionFromSMS(sms, sender));
