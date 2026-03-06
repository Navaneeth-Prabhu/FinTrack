import { parseSIPAllotment } from './services/smsAlertParser.ts';

const sms = "Dear Investor, Your SIP PLUS of Rs.999.95 in Folio 13365121 in Value Fund (erstwhile Value Discovery Fund) - Growth for 2.098 units has been processed for NAV of Rs.476.62 on 05-Mar-2026 - IPRUMF";

const result = parseSIPAllotment(sms, "VM-ICICIP");
console.log(JSON.stringify(result, null, 2));
