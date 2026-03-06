"use strict";
// services/smsParser.ts
// Industry-level SMS transaction parser.
// Architecture mirrors the web email-parser:
//   1. Detect bank from SMS sender code (e.g. "VM-HDFCBK" → hdfc)
//   2. Apply bank-specific regex for amount / type / merchant / date
//   3. Fall back to generic INR patterns for unknown senders
//   4. Calculate a per-field confidence score (0–1)
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactionsFromSMS = exports.extractTransactionDetails = exports.extractTransactionFromSMS = exports.debugReadSMS = exports.readFinancialSMS = exports.checkSMSPermission = exports.requestSMSPermission = exports.normaliseSMSBody = void 0;
var react_native_1 = require("react-native");
var async_storage_1 = require("@react-native-async-storage/async-storage");
var nativeSmsModule_1 = require("./nativeSmsModule");
var smsAlertParser_1 = require("./smsAlertParser");
var investmentSmsHandler_1 = require("./investmentSmsHandler");
// ─── Storage keys ─────────────────────────────────────────────────────────────
var LAST_SMS_SCAN_KEY = 'last_sms_scan_timestamp';
// ─── SMS body normalisation ───────────────────────────────────────────────────
// Some banks (HDFC, SBI) send multiline SMS that span 2-3 lines.
// Collapsing them to a single line ensures regex patterns work reliably.
var normaliseSMSBody = function (body) {
    return body
        .replace(/\r\n/g, ' ') // Windows CRLF
        .replace(/\n/g, ' ') // Unix LF
        .replace(/\r/g, ' ') // old Mac CR
        .replace(/\s{2,}/g, ' ') // collapse multiple spaces
        .trim();
};
exports.normaliseSMSBody = normaliseSMSBody;
// ─── Permission helpers ───────────────────────────────────────────────────────
var requestSMSPermission = function () { return __awaiter(void 0, void 0, void 0, function () {
    var granted, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, react_native_1.PermissionsAndroid.request(react_native_1.PermissionsAndroid.PERMISSIONS.READ_SMS, {
                        title: 'SMS Permission',
                        message: 'FinTrack needs to read your SMS messages to auto-track expenses.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    })];
            case 1:
                granted = _a.sent();
                return [2 /*return*/, granted === react_native_1.PermissionsAndroid.RESULTS.GRANTED];
            case 2:
                err_1 = _a.sent();
                console.error('[SMS::Parser] Permission error:', err_1);
                return [2 /*return*/, false];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.requestSMSPermission = requestSMSPermission;
var checkSMSPermission = function () { return __awaiter(void 0, void 0, void 0, function () {
    var err_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, react_native_1.PermissionsAndroid.check(react_native_1.PermissionsAndroid.PERMISSIONS.READ_SMS)];
            case 1: return [2 /*return*/, _a.sent()];
            case 2:
                err_2 = _a.sent();
                console.error('[SMS::Parser] Permission check error:', err_2);
                return [2 /*return*/, false];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.checkSMSPermission = checkSMSPermission;
// ─── Bank sender map ──────────────────────────────────────────────────────────
// Indian bank SMS senders follow patterns like "VM-HDFCBK", "VK-ICICIB", "JD-SBINB"
// The prefix (VM/VK/JD/BP etc.) is the telecom operator code — ignore it.
// We match the suffix after the hyphen.
var BANK_SENDER_MAP = {
    hdfc: ['HDFCBK', 'HDFCBN', 'HDFCCC', 'HDFCBANKLTD', 'HDFCBANKL'],
    icici: ['ICICIB', 'ICICIC', 'ICICIBNK', 'ICICIBANK'],
    sbi: ['SBINB', 'SBIUPI', 'SBIPSG', 'SBICRD', 'ONLSBI'],
    axis: ['AXISBK', 'AXISBN', 'AXSBNK', 'AXISBANK'],
    kotak: ['KOTAKB', 'KOTKM', 'KOTAKM', 'KOTAKBANK'],
    yes: ['YESBK', 'YESBNK', 'YESBANK'],
    indusind: ['INDBNK', 'IBLBNK', 'INDUSL'],
    idfc: ['IDFCBK', 'IDFCFB', 'IDFCFIRST'],
    federal: ['FEDBK', 'FEDBNK', 'FEDERAL'],
    rbl: ['RBLBNK', 'RBLBK', 'RBLBANK'],
    paytm: ['PYTMBNK', 'PYTMIN', 'PAYTM'],
    phonepe: ['PHNPAY', 'PHONEP', 'PHPEBN'],
    gpay: ['GOOGPAY', 'GPAY', 'OKAXIS', 'OKICICI', 'OKSBI', 'OKHDFCBANK'],
    kgbank: ['KGBANK', 'KGB'],
    // Mutual Fund AMCs and RTAs (for SIP confirmation SMS)
    amc: [
        'SBIMF', 'SBIMFU',
        'HDFCMF', 'HDFMFU',
        'ICICMF', 'ICICIP',
        'AXISMF', 'AXMFND',
        'KAMC', 'KOTMF',
        'NFMFL', 'NIPPON', 'NIPMF', // Nippon India
        'MIRAE', 'MIRAEF',
        'PPFAS', 'PPFMF',
        'DSPBR', 'DSPMF',
        'UTIMF', 'UTIIND',
        'ABSLMF', 'ABSUND', // Aditya Birla Sun Life
        'SNDRM', 'SUNDMF',
        'KFINTECH', 'CAMSCO', 'CAMSMF', // RTAs
        'GROWWS', 'GROWWI', // Groww platform
        'ZCOINS', // Zerodha Coin
    ],
};
// Pretty display names
var BANK_DISPLAY_NAMES = {
    hdfc: 'HDFC Bank', icici: 'ICICI Bank', sbi: 'SBI', axis: 'Axis Bank',
    kotak: 'Kotak Mahindra Bank', yes: 'Yes Bank', indusind: 'IndusInd Bank',
    idfc: 'IDFC First Bank', federal: 'Federal Bank', rbl: 'RBL Bank',
    paytm: 'Paytm', phonepe: 'PhonePe', gpay: 'Google Pay',
    kgbank: 'Kerala Gramin Bank',
};
function detectBank(sender) {
    if (!sender)
        return null;
    // Extract part after last hyphen: "VM-HDFCBK" → "HDFCBK"
    var parts = sender.toUpperCase().split('-');
    var code = parts[parts.length - 1];
    for (var _i = 0, _a = Object.entries(BANK_SENDER_MAP); _i < _a.length; _i++) {
        var _b = _a[_i], bank = _b[0], codes = _b[1];
        if (codes.some(function (c) { return code.includes(c) || c.includes(code); }))
            return bank;
    }
    return null;
}
var BANK_PATTERNS = {
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
            // UPI with name after VPA: "to VPA xx@yy MERCHANT NAME on"
            /to\s+VPA\s+[\w.\-]+@[\w.\-]+\s+([A-Z0-9][A-Za-z0-9\s&.'\-]{1,40}?)\s+on\s+/i,
            /by\s+VPA\s+[\w.\-]+@[\w.\-]+\s+([A-Z][A-Z\s]{2,40}?)\s+on\s+/i,
            /to\s+VPA\s+[\w@.\-]+\s+\(([^)]+)\)/i,
            /at\s+([A-Z][A-Z0-9\s\-\.&,']{2,40}?)(?:\s+on|\s+dated|\.|,|$)/i,
            /NACH.*?(?:to|for)\s+([A-Z][A-Za-z0-9\s\-\.&]{2,40}?)(?:\s+on|\s+dated|\.|$)/i,
            // VPA handle fallback
            /(?:to|by)\s+VPA\s+([\w.\-]+)@/i,
        ],
        date: [
            /on\s+(\d{2}-(?:[A-Za-z]{3}|\d{2})-\d{2,4})/i,
            /dated?\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
        ],
        account: [
            /(?:a\/c|account|acct)[\s\w]*?(?:ending\s+(?:with\s+)?)?(X+|\*+)(\d{3,4})\b/i,
            /\b[Xx]{3,}(\d{3,4})\b/,
        ],
    },
    icici: {
        debit: [
            /(?:debited|withdrawn).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s*(?:debited|withdrawn)/i,
            /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*is debited/i,
        ],
        credit: [
            /(?:credited|deposited).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s*credited/i,
        ],
        merchant: [
            /to\s+VPA\s+[\w.\-]+@[\w.\-]+\s+([A-Z][A-Z\s]{2,40}?)\s+on\s+/i,
            /(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\s+dated|\.|$)/i,
            /merchant[:\s]+([A-Z][A-Z0-9\s\-\.]{2,40})/i,
            /to\s+VPA\s+([\w.\-]+)@/i,
        ],
        date: [
            /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
            /dated?\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
        ],
        account: [
            /(?:a\/c|account|card)[\s\w]*?[xX*]+(\d{4})/i,
        ],
    },
    sbi: {
        debit: [
            /(?:debited|withdrawn|spent).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s*(?:debited|withdrawn)/i,
            /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:Dr|Debit)/i,
        ],
        credit: [
            /(?:credited|received|deposited).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s*(?:Cr|Credit|credited)/i,
        ],
        merchant: [
            /to\s+VPA\s+[\w.\-]+@[\w.\-]+\s+([A-Z][A-Z\s]{2,40}?)\s+on\s+/i,
            /(?:trf\s+to|paid\s+to|transfer\s+to)\s+([A-Za-z][A-Za-z0-9\s&.\-]{2,40}?)(?:\s+Ref|\s+on|\.|\s*$)/i,
            /(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i,
            /to\s+VPA\s+([\w.\-]+)@/i,
        ],
        date: [
            /on\s+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
            /(\d{2}-[A-Za-z]{3}-\d{4})/i,
        ],
        account: [
            /A\/c\s+[xX*]+(\d{3,4})/i,
            /(?:account|a\/c)[\s\w]*?[xX*]+(\d{3,4})/i,
        ],
    },
    axis: {
        debit: [
            /(?:debited|spent).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
            /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:debited|spent)/i,
        ],
        credit: [
            /(?:credited|received).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
            /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*credited/i,
        ],
        merchant: [
            /to\s+VPA\s+[\w.\-]+@[\w.\-]+\s+([A-Z][A-Z\s]{2,40}?)\s+on\s+/i,
            /(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i,
            /to\s+VPA\s+([\w.\-]+)@/i,
        ],
        date: [/on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i],
        account: [/(?:account|card)[\s\w]*?[xX*]+(\d{4})/i],
    },
    kotak: {
        debit: [
            /(?:debited|withdrawn).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s*debited/i,
        ],
        credit: [
            /(?:credited|deposited).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
        ],
        merchant: [
            /to\s+VPA\s+[\w.\-]+@[\w.\-]+\s+([A-Z][A-Z\s]{2,40}?)\s+on\s+/i,
            /(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i,
            /to\s+VPA\s+([\w.\-]+)@/i,
        ],
        date: [/on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i],
        account: [/(?:account|card)[\s\w]*?[xX*]+(\d{4})/i],
    },
    yes: {
        debit: [/(?:debited|withdrawn).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        credit: [/(?:credited|received).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        merchant: [/(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i],
        date: [/on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i],
        account: [/(?:account|card)[\s\w]*?[xX*]+(\d{4})/i],
    },
    indusind: {
        debit: [/(?:debited|withdrawn|spent).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        credit: [/(?:credited|received).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        merchant: [/(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i],
        date: [/on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i],
        account: [/(?:account|card)[\s\w]*?[xX*]+(\d{4})/i],
    },
    idfc: {
        debit: [/(?:debited|spent).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        credit: [/(?:credited|received).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        merchant: [/(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i],
        date: [/on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i],
        account: [/(?:account|card)[\s\w]*?[xX*]+(\d{4})/i],
    },
    federal: {
        debit: [/(?:debited|withdrawn).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        credit: [/(?:credited|received).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        merchant: [/(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i],
        date: [/on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i],
        account: [/(?:account|card)[\s\w]*?[xX*]+(\d{4})/i],
    },
    rbl: {
        debit: [/(?:debited|spent).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        credit: [/(?:credited|received).*?(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i],
        merchant: [/(?:at|to)\s+([A-Z][A-Z0-9\s\-\.&]{2,40}?)(?:\s+on|\.|\s*$)/i],
        date: [/on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i],
        account: [/(?:account|card)[\s\w]*?[xX*]+(\d{4})/i],
    },
    paytm: {
        debit: [
            /(?:paid|sent|debited).*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:paid|sent|debited)/i,
        ],
        credit: [
            /(?:received|added|credited).*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
        ],
        merchant: [
            /(?:to|from)\s+([A-Z@][A-Za-z0-9\s\-\.@]{2,40}?)(?:\s+on|\s+for|\.|\s*$)/i,
        ],
        date: [
            /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
            /(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/i,
        ],
        account: [/(?:wallet|bank|account)[\s\w]*?[xX*]+(\d{4})/i],
    },
    phonepe: {
        debit: [
            /(?:paid|sent|debited).*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:paid|sent)/i,
        ],
        credit: [
            /(?:received|credited).*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
        ],
        merchant: [
            /(?:to|from)\s+([A-Z@][A-Za-z0-9\s\-\.@]{2,40}?)(?:\s+on|\s+using|\.|\s*$)/i,
            /paid\s+to\s+([A-Za-z0-9\s\-\.]{2,40})/i,
        ],
        date: [
            /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
            /(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})/i,
        ],
        account: [/(?:bank|account)[\s\w]*?[xX*]+(\d{4})/i],
    },
    gpay: {
        debit: [
            /(?:paid|sent).*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
            /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:paid|sent)/i,
        ],
        credit: [
            /(?:received).*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
        ],
        merchant: [
            /(?:to|from)\s+([A-Z@][A-Za-z0-9\s\-\.@]{2,40}?)(?:\s+on|\s+using|\.|\s*$)/i,
            /payment\s+to\s+([A-Za-z0-9\s\-\.]{2,40})/i,
        ],
        date: [
            /on\s+(\d{2}[-\/]\d{2}[-\/]\d{2,4})/i,
            /(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})/i,
        ],
        account: [/(?:bank|account)[\s\w]*?[xX*]+(\d{4})/i],
    },
};
// ─── Generic fallback patterns ────────────────────────────────────────────────
var GENERIC_DEBIT_PATTERNS = [
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:has been|is|been)?\s*(?:debited|deducted|withdrawn)/i,
    /(?:debited|deducted|withdrawn|spent|paid)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:Dr\.?|DR)\b/i,
    /amount\s+(?:of\s+)?(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:debited|deducted)/i,
];
var GENERIC_CREDIT_PATTERNS = [
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:has been|is|been)?\s*credited/i,
    /(?:credited|deposited|received)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:Cr\.?|CR)\b/i,
];
var GENERIC_AMOUNT_PATTERNS = [
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR)/i,
    /amount[:\s]+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
];
var GENERIC_REF_PATTERNS = [
    /(?:UPI Ref No|UPI Ref|Ref No|Ref\.?|UTR|txn id|transaction id)[:\-\s]+([a-zA-Z0-9]{6,20})\b/i,
];
// ─── Financial keyword filter ─────────────────────────────────────────────────
var FINANCIAL_KEYWORDS = [
    'bank', 'credit', 'debit', 'transaction', 'account', 'spent',
    'payment', 'transfer', 'balance', 'card', 'upi', 'atm', 'paid',
    'credited', 'debited', 'withdrawn', 'deposit', 'purchase',
    'inr', 'rs', 'rupee', '₹', 'refund', 'cashback', 'emi',
    'neft', 'rtgs', 'imps', 'nach', 'mandate',
];
function isFinancialSms(body) {
    var lower = body.toLowerCase();
    return FINANCIAL_KEYWORDS.some(function (kw) { return lower.includes(kw); });
}
// ─── Extract amount ───────────────────────────────────────────────────────────
function parseAmountStr(raw) {
    var value = parseFloat(raw.replace(/,/g, ''));
    return isNaN(value) || value <= 0 ? 0 : value;
}
function extractAmount(body, bankKey) {
    var combined = body;
    if (bankKey && BANK_PATTERNS[bankKey]) {
        var bp = BANK_PATTERNS[bankKey];
        for (var _i = 0, _a = bp.debit; _i < _a.length; _i++) {
            var p = _a[_i];
            var m = combined.match(p);
            if (m === null || m === void 0 ? void 0 : m[1]) {
                var val = parseAmountStr(m[1]);
                if (val > 0)
                    return { amount: val, type: 'expense' };
            }
        }
        for (var _b = 0, _c = bp.credit; _b < _c.length; _b++) {
            var p = _c[_b];
            var m = combined.match(p);
            if (m === null || m === void 0 ? void 0 : m[1]) {
                var val = parseAmountStr(m[1]);
                if (val > 0)
                    return { amount: val, type: 'income' };
            }
        }
    }
    // Generic debit
    for (var _d = 0, GENERIC_DEBIT_PATTERNS_1 = GENERIC_DEBIT_PATTERNS; _d < GENERIC_DEBIT_PATTERNS_1.length; _d++) {
        var p = GENERIC_DEBIT_PATTERNS_1[_d];
        var m = combined.match(p);
        if (m === null || m === void 0 ? void 0 : m[1]) {
            var val = parseAmountStr(m[1]);
            if (val > 0)
                return { amount: val, type: 'expense' };
        }
    }
    // Generic credit
    for (var _e = 0, GENERIC_CREDIT_PATTERNS_1 = GENERIC_CREDIT_PATTERNS; _e < GENERIC_CREDIT_PATTERNS_1.length; _e++) {
        var p = GENERIC_CREDIT_PATTERNS_1[_e];
        var m = combined.match(p);
        if (m === null || m === void 0 ? void 0 : m[1]) {
            var val = parseAmountStr(m[1]);
            if (val > 0)
                return { amount: val, type: 'income' };
        }
    }
    // Last resort — just find any INR amount
    for (var _f = 0, GENERIC_AMOUNT_PATTERNS_1 = GENERIC_AMOUNT_PATTERNS; _f < GENERIC_AMOUNT_PATTERNS_1.length; _f++) {
        var p = GENERIC_AMOUNT_PATTERNS_1[_f];
        var m = combined.match(p);
        if (m === null || m === void 0 ? void 0 : m[1]) {
            var val = parseAmountStr(m[1]);
            if (val > 0)
                return { amount: val, type: null };
        }
    }
    return { amount: 0, type: null };
}
// ─── Transaction type refinement ──────────────────────────────────────────────
// Runs AFTER amount extraction to refine type via keyword scoring.
// Uses word-boundary patterns to avoid false positives.
function refineType(body, amountType) {
    var lower = body.toLowerCase();
    var debitScore = [
        /\bdebited\b/, /\bdebit\b/, /\bdr\.?\b/, /\bspent\b/, /\bpaid\b/,
        /\bpayment\b/, /\bpurchase\b/, /\bcard\s+used\b/, /\bwithdrawn\b/,
        /\bcharged\b/, /\bdeducted\b/, /\bsent\b/,
    ].reduce(function (s, p) { return s + (p.test(lower) ? 1 : 0); }, 0);
    var creditScore = [
        /\bcredited\b/, /\bcredit\b/, /\bcr\.?\b/, /\breceived\b/,
        /\bdeposited\b/, /\bsalary\b/, /\brefund\b/, /\bcashback\b/, /\breversed\b/,
    ].reduce(function (s, p) { return s + (p.test(lower) ? 1 : 0); }, 0);
    var transferScore = [
        /\btransferred\b/, /\bneft\b/, /\brtgs\b/, /\bimps\b/, /\bupi\s+ref\b/,
    ].reduce(function (s, p) { return s + (p.test(lower) ? 1 : 0); }, 0);
    // Transfer: only if clear transfer signal with no competing debit/credit
    if (transferScore > 0 && debitScore === 0 && creditScore === 0)
        return 'transfer';
    if (creditScore > debitScore)
        return 'income';
    if (debitScore > 0)
        return 'expense';
    // Fall back to what amount extraction found, else expense
    return amountType !== null && amountType !== void 0 ? amountType : 'expense';
}
// ─── Payment method detection ─────────────────────────────────────────────────
function detectPaymentMethod(body) {
    var lower = body.toLowerCase();
    if (lower.includes('upi') || lower.includes('vpa') || /@ok(axis|icici|sbi|hdfc)/i.test(body))
        return 'UPI';
    if (lower.includes('credit card'))
        return 'Credit Card';
    if (lower.includes('debit card'))
        return 'Debit Card';
    if (lower.includes('net banking') || lower.includes('netbanking'))
        return 'Net Banking';
    if (lower.includes('nach') || lower.includes('mandate'))
        return 'NACH';
    if (lower.includes('imps'))
        return 'IMPS';
    if (lower.includes('neft'))
        return 'NEFT';
    if (lower.includes('rtgs'))
        return 'RTGS';
    if (lower.includes('wallet') || lower.includes('paytm') || lower.includes('phonepe'))
        return 'Wallet';
    if (lower.includes('atm') || lower.includes('cash'))
        return 'ATM/Cash';
    return null;
}
// ─── Account extraction ───────────────────────────────────────────────────────
function extractAccount(body, bankKey) {
    var _a, _b, _c;
    if (bankKey && BANK_PATTERNS[bankKey]) {
        for (var _i = 0, _d = BANK_PATTERNS[bankKey].account; _i < _d.length; _i++) {
            var p = _d[_i];
            var m = body.match(p);
            if (m) {
                var digits = m.slice(1).reverse().find(function (g) { return g && /^\d+$/.test(g); });
                if (digits)
                    return digits;
            }
        }
    }
    var generic = body.match(/(?:[Xx*]{1,}|a\/c\s*(?:no\.?\s*)?[Xx*]+|a\/c\s*\*+)([0-9]{3,5})\b/i) || body.match(/(?:[Xx*]{3,}|[Xx]-?)[0-9]{3,5}\b/i);
    return (_c = (_a = generic === null || generic === void 0 ? void 0 : generic[1]) !== null && _a !== void 0 ? _a : (_b = body.match(/(?:a\/c|account)[\s\w]*?\*?([0-9]{3,5})\b/i)) === null || _b === void 0 ? void 0 : _b[1]) !== null && _c !== void 0 ? _c : null;
}
// ─── Merchant extraction ──────────────────────────────────────────────────────
var NOISE_WORDS = new Set([
    'your', 'account', 'hdfc', 'icici', 'sbi', 'axis', 'kotak', 'bank', 'ltd',
    'nearest', 'branch', 'atm', 'upi', 'ref', 'reference', 'transaction',
    'txn', 'balance', 'avail', 'note', 'customer', 'care',
]);
var MERCHANT_NORMALIZATIONS = {
    swiggy: 'Swiggy', zomato: 'Zomato', amazon: 'Amazon', flipkart: 'Flipkart',
    uber: 'Uber', ola: 'Ola', netflix: 'Netflix', spotify: 'Spotify',
    bigbasket: 'BigBasket', blinkit: 'Blinkit', zepto: 'Zepto',
    phonepe: 'PhonePe', paytm: 'Paytm', gpay: 'Google Pay',
    jio: 'Jio', airtel: 'Airtel', hotstar: 'Disney+ Hotstar',
    irctc: 'IRCTC', rapido: 'Rapido', dunzo: 'Dunzo',
    'ajio': 'AJIO', myntra: 'Myntra', nykaa: 'Nykaa',
};
function normalizeMerchant(raw) {
    var cleaned = raw
        .replace(/\b(on|for|via|ref|dt|dated|using|through|towards|info)[:\s].*/i, '')
        .replace(/[.,;:!?\-]+$/, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/@[\w.\-]+$/i, '') // strip VPA handle "@oksbi"
        .trim();
    var lower = cleaned.toLowerCase();
    for (var _i = 0, _a = Object.entries(MERCHANT_NORMALIZATIONS); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], display = _b[1];
        if (lower.includes(key))
            return display;
    }
    // Title-case if all-caps (common in bank SMS)
    if (cleaned === cleaned.toUpperCase() && cleaned.length > 1) {
        return cleaned.charAt(0) + cleaned.slice(1).toLowerCase()
            .replace(/\b(\w)/g, function (c) { return c.toUpperCase(); });
    }
    return cleaned;
}
function isBadMerchant(text) {
    var lower = text.toLowerCase().trim();
    return (text.length < 2 ||
        /[Xx*]{3,}/.test(text) ||
        /^\d{4,}$/.test(text) ||
        /^\d{1,2}:\d{2}/.test(text) ||
        NOISE_WORDS.has(lower) ||
        /^(available|balance|total|amount|avail)\b/i.test(text));
}
function extractMerchant(body, bankKey, type) {
    var tryPatterns = function (patterns) {
        var _a;
        for (var _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
            var p = patterns_1[_i];
            var m = body.match(p);
            var candidate = (_a = m === null || m === void 0 ? void 0 : m[1]) === null || _a === void 0 ? void 0 : _a.trim();
            if (candidate) {
                var normalized = normalizeMerchant(candidate);
                if (!isBadMerchant(normalized))
                    return normalized;
            }
        }
        return null;
    };
    // Bank-specific patterns first
    if (bankKey && BANK_PATTERNS[bankKey]) {
        var result = tryPatterns(BANK_PATTERNS[bankKey].merchant);
        if (result)
            return result;
    }
    // Generic fallback patterns based on type
    var genericPatterns = [
        /(?:sent|transferred)\s+[₹Rs.INR\d,.]+(?:[\s\S]*?)\sto\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+for|\s+via|\.|\s*$)/i,
        /purchase\s+at\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\.|$)/i,
        /spent\s+at\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\.|$)/i,
        /paid\s+(?:to|at)\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+for|\.|$)/i,
        /payment\s+(?:of\s+[₹Rs.INR\d,.]+\s+)?to\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+for|\.|$)/i,
        /towards\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)\s+(?:bill|emi|loan|due)/i,
        /credited\s+by\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+via|\.|\s*$)/i,
        /received\s+from\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+via|\.|\s*$)/i,
        // "at XYZ" (not followed by a time)
        /\bat\s+(?!\d{1,2}:\d{2})([A-Za-z][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+on|\s+for|\s+via|\s+dt|\.|\s*$)/i,
    ];
    return tryPatterns(genericPatterns);
}
// ─── Extract Payer VPA (For Income / Credit) ──────────────────────────────────
function extractPayerVPA(body) {
    var tryPatterns = function (patterns) {
        for (var _i = 0, patterns_2 = patterns; _i < patterns_2.length; _i++) {
            var p = patterns_2[_i];
            var m = body.match(p);
            if (m === null || m === void 0 ? void 0 : m[1])
                return m[1].trim();
        }
        return null;
    };
    var payerPatterns = [
        /from\s+([\w.\-]+@[\w.\-]+)/i, // "from amitverma@okhdfcbank"
        /(?:credited|received).*?from\s+([\w.\-]+@[\w.\-]+)/i,
        /from\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+via|\s+on|\s+a\/c|\s+bank|\.|\s*$)/i,
        /(?:credited|received).*?by\s+([A-Za-z0-9][A-Za-z0-9\s&.'\-]{1,40}?)(?:\s+via|\s+on|\s+a\/c|\s+bank|\.|\s*$)/i,
    ];
    var paidBy = tryPatterns(payerPatterns);
    if (!paidBy)
        return { paidBy: null, merchant: null };
    // Derive a friendly display name from the VPA if it contains an '@'
    var merchantName = paidBy;
    if (paidBy.includes('@')) {
        var vpaPrefix = paidBy.split('@')[0];
        // If the prefix is just numbers (e.g., 9876543210), keep it as is
        if (/^\d+$/.test(vpaPrefix)) {
            merchantName = vpaPrefix;
        }
        else {
            // "amit.verma" -> "Amit Verma"
            merchantName = vpaPrefix
                .replace(/[.\-_]/g, ' ')
                .replace(/\b(\w)/g, function (c) { return c.toUpperCase(); });
        }
    }
    else {
        merchantName = normalizeMerchant(paidBy);
    }
    return { paidBy: paidBy, merchant: merchantName };
}
// ─── Date extraction ──────────────────────────────────────────────────────────
var MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
function monthIndex(name) {
    return MONTH_NAMES.findIndex(function (m) { return name.toLowerCase().startsWith(m); });
}
function tryParseDate(d, m, y) {
    var now = new Date();
    var year = y < 100 ? (y < 50 ? 2000 + y : 1900 + y) : y;
    if (d < 1 || d > 31 || m < 1 || m > 12 || year < 2000)
        return null;
    var candidate = new Date(year, m - 1, d);
    return candidate <= now ? candidate : null;
}
function extractDate(body, bankKey) {
    var _a, _b, _c, _d, _e, _f;
    var now = new Date();
    // Try bank-specific date patterns first
    if (bankKey && BANK_PATTERNS[bankKey]) {
        for (var _i = 0, _g = BANK_PATTERNS[bankKey].date; _i < _g.length; _i++) {
            var p = _g[_i];
            var m = body.match(p);
            if (m === null || m === void 0 ? void 0 : m[1]) {
                var d = parseRawDateStr(m[1]);
                if (d)
                    return d;
            }
        }
    }
    // Generic date patterns
    var patterns = [
        // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
        /\b(?:on\s+|for\s+)?(?<d>\d{1,2})[\/\-\.](?<m>\d{1,2})[\/\-\.](?<y>\d{2,4})\b/i,
        // DD-MMM-YYYY or DD MMM YYYY
        /\b(?:on\s+)?(?<d>\d{1,2})[\s\-](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-](?<y>\d{2,4})\b/i,
        // MMM DD, YYYY
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(?<d>\d{1,2})[,\s]+(?<y>\d{4})\b/i,
    ];
    for (var _h = 0, patterns_3 = patterns; _h < patterns_3.length; _h++) {
        var p = patterns_3[_h];
        var m = body.match(p);
        if (!m)
            continue;
        if (((_a = m.groups) === null || _a === void 0 ? void 0 : _a.d) && ((_b = m.groups) === null || _b === void 0 ? void 0 : _b.m) && ((_c = m.groups) === null || _c === void 0 ? void 0 : _c.y)) {
            var d = tryParseDate(parseInt(m.groups.d), parseInt(m.groups.m), parseInt(m.groups.y));
            if (d)
                return d;
        }
        if (((_d = m.groups) === null || _d === void 0 ? void 0 : _d.d) && ((_e = m.groups) === null || _e === void 0 ? void 0 : _e.y) && !((_f = m.groups) === null || _f === void 0 ? void 0 : _f.m)) {
            // Alpha month — captured as m[1] or m[2] in named group patterns
            var monthStr = m[1] || m[2];
            if (!monthStr)
                continue;
            var mIdx = monthIndex(monthStr) + 1;
            var d = tryParseDate(parseInt(m.groups.d), mIdx, parseInt(m.groups.y));
            if (d)
                return d;
        }
    }
    return null;
}
function parseRawDateStr(s) {
    // DD-MMM-YYYY
    var m = s.match(/(\d{1,2})[-\s](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s](\d{2,4})/i);
    if (m)
        return tryParseDate(parseInt(m[1]), monthIndex(m[2]) + 1, parseInt(m[3]));
    // DD-MM-YYYY or DD/MM/YYYY
    m = s.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
    if (m)
        return tryParseDate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
    return null;
}
// ─── Extract Ref Number ───────────────────────────────────────────────────────
function extractRefNumber(body) {
    for (var _i = 0, GENERIC_REF_PATTERNS_1 = GENERIC_REF_PATTERNS; _i < GENERIC_REF_PATTERNS_1.length; _i++) {
        var p = GENERIC_REF_PATTERNS_1[_i];
        var m = body.match(p);
        if (m && m[1]) {
            return m[1].toUpperCase();
        }
    }
    return null;
}
// ─── Extract Available Balance ────────────────────────────────────────────────
function extractAvailableBalance(body) {
    // Patterns for available balance, e.g., "Avl bal:INR 7,239.16", "Available Balance: Rs. 1000", "Bal Rs.123.45"
    var patterns = [
        /(?:avl(?:\.|iable)?\s*bal(?:ance)?|available\s*balance)[\s:;\-]*?(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
        /bal(?:ance)?[\s:;\-]*?(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i
    ];
    for (var _i = 0, patterns_4 = patterns; _i < patterns_4.length; _i++) {
        var p = patterns_4[_i];
        var m = body.match(p);
        if (m && m[1]) {
            var val = parseFloat(m[1].replace(/,/g, ''));
            if (!isNaN(val))
                return val;
        }
    }
    return undefined;
}
// ─── Confidence scoring ───────────────────────────────────────────────────────
function calculateConfidence(fields) {
    var score = 0;
    if (fields.amount > 0)
        score += 0.35; // Amount is highest signal
    if (fields.merchant)
        score += 0.25; // Merchant name found
    if (fields.date)
        score += 0.15; // Date extracted
    if (fields.accountLast4)
        score += 0.10; // Account identified
    if (fields.bankKey)
        score += 0.15; // Bank detected from sender
    return Math.min(score, 1.0);
}
// ─── Read financial SMS ───────────────────────────────────────────────────────
// Passes minDate watermark to the native layer; the native module does the
// isFinancialSms() filtering for us, so we can safely scan a large window.
var readFinancialSMS = function () {
    var args_1 = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args_1[_i] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (minDate, limit) {
        var hasPermission, messages;
        if (minDate === void 0) { minDate = 0; }
        if (limit === void 0) { limit = 10000; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, exports.checkSMSPermission)()];
                case 1:
                    hasPermission = _a.sent();
                    if (!hasPermission) {
                        console.log('[SMS::Parser] READ_SMS permission not granted. Skipping SMS sync.');
                        return [2 /*return*/, []];
                    }
                    return [4 /*yield*/, (0, nativeSmsModule_1.readSmsMessages)(limit, minDate)];
                case 2:
                    messages = _a.sent();
                    console.log("[SMS::Parser] Received ".concat(messages.length, " financial SMS from native (minDate=").concat(minDate, ")"));
                    return [4 /*yield*/, async_storage_1.default.setItem(LAST_SMS_SCAN_KEY, Date.now().toString())];
                case 3:
                    _a.sent();
                    return [2 /*return*/, messages];
            }
        });
    });
};
exports.readFinancialSMS = readFinancialSMS;
// ─── Debug helper ─────────────────────────────────────────────────────────────
var debugReadSMS = function () { return __awaiter(void 0, void 0, void 0, function () {
    var hasPermission, messages;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.requestSMSPermission)()];
            case 1:
                hasPermission = _a.sent();
                if (!hasPermission) {
                    console.log('[SMS::Parser] Permission not granted');
                    return [2 /*return*/, []];
                }
                return [4 /*yield*/, (0, nativeSmsModule_1.readSmsMessages)(20, 0)];
            case 2:
                messages = _a.sent();
                messages.slice(0, 5).forEach(function (m, i) {
                    var _a;
                    console.log("[SMS::Debug] #".concat(i + 1, ": from=").concat(m.address, " body=").concat((_a = m.body) === null || _a === void 0 ? void 0 : _a.slice(0, 80)));
                });
                return [2 /*return*/, messages];
        }
    });
}); };
exports.debugReadSMS = debugReadSMS;
// ─── Main extraction function ─────────────────────────────────────────────────
var extractTransactionFromSMS = function (smsBody, sender) {
    var _a, _b;
    if (!(smsBody === null || smsBody === void 0 ? void 0 : smsBody.trim()))
        return null;
    // Normalise multiline SMS to a single line so all regex patterns work reliably.
    // Multiline HDFC/SBI UPI SMS were silently failing before this.
    var body = (0, exports.normaliseSMSBody)(smsBody);
    var bankKey = detectBank(sender);
    var bankName = bankKey ? (_a = BANK_DISPLAY_NAMES[bankKey]) !== null && _a !== void 0 ? _a : null : null;
    var _c = extractAmount(body, bankKey), amount = _c.amount, rawType = _c.type;
    if (!amount)
        return null;
    var type = refineType(body, rawType);
    var merchant = extractMerchant(body, bankKey, type);
    var paidBy = null;
    // For income, attempt to extract the P2P sender
    if (type === 'income') {
        var payerInfo = extractPayerVPA(body);
        if (payerInfo.paidBy) {
            paidBy = payerInfo.paidBy;
            merchant = payerInfo.merchant; // Use derived friendly name
        }
    }
    var date = extractDate(body, bankKey);
    var accountLast4 = extractAccount(body, bankKey);
    var paymentMethod = detectPaymentMethod(body);
    var refNumber = extractRefNumber(body);
    var availableBalance = extractAvailableBalance(body);
    // We optionally add the refNumber to confidence calculation if we want, currently skipped.
    var confidence = calculateConfidence({ amount: amount, merchant: merchant, date: date, accountLast4: accountLast4, bankKey: bankKey });
    var dateStr = date
        ? "".concat(date.getDate(), " ").concat(MONTH_NAMES[date.getMonth()].charAt(0).toUpperCase()).concat(MONTH_NAMES[date.getMonth()].slice(1), " ").concat(date.getFullYear())
        : null;
    // Phase 2: Detect SIP / EMI subtypes
    var subType;
    var lowerBody = body.toLowerCase();
    var units;
    var nav;
    if (lowerBody.includes('sip') || lowerBody.includes('mutual fund') || lowerBody.includes('units allotted') || lowerBody.includes('allotment') || bankKey === 'amc') {
        subType = 'sip';
        // Extract NAV
        var navMatch = body.match(/(?:NAV|Price)[\s:;-]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d+)?)/i);
        if (navMatch && navMatch[1])
            nav = parseFloat(navMatch[1].replace(/,/g, ''));
        // Extract Units
        var unitsMatch = body.match(/(?:Units|Qty)[\s:;-]*([\d,]+(?:\.\d+)?)/i) || body.match(/([\d,]+(?:\.\d+)?)\s*(?:units|qty)/i);
        if (unitsMatch && unitsMatch[1])
            units = parseFloat(unitsMatch[1].replace(/,/g, ''));
    }
    else if (lowerBody.includes('emi') || lowerBody.includes('loan instalment') || lowerBody.includes('equated monthly')) {
        subType = 'emi';
    }
    console.log("[SMS::Parser] bank=".concat(bankKey !== null && bankKey !== void 0 ? bankKey : 'unknown', " type=").concat(type, " subType=").concat(subType !== null && subType !== void 0 ? subType : 'none', " amount=").concat(amount, " merchant=\"").concat(merchant, "\" confidence=").concat(confidence.toFixed(2)));
    return {
        type: type,
        subType: subType,
        amount: amount,
        merchant: merchant,
        date: (_b = date === null || date === void 0 ? void 0 : date.toISOString()) !== null && _b !== void 0 ? _b : null,
        dateStr: dateStr,
        rawSMS: smsBody, // keep original for audit trail
        sender: sender,
        bank: bankName,
        accountLast4: accountLast4,
        paymentMethod: paymentMethod,
        paidBy: paidBy,
        refNumber: refNumber,
        availableBalance: availableBalance,
        units: units,
        nav: nav,
        confidence: confidence,
    };
};
exports.extractTransactionFromSMS = extractTransactionFromSMS;
// Backwards-compatible alias
exports.extractTransactionDetails = exports.extractTransactionFromSMS;
// ─── Combine SMS body date with SMS metadata time ─────────────────────────────
function combineDateWithTime(iso, smsTimestamp) {
    try {
        var content = new Date(iso);
        var msg = new Date(smsTimestamp);
        if (isNaN(content.getTime()) || isNaN(msg.getTime()))
            return content;
        return new Date(content.getFullYear(), content.getMonth(), content.getDate(), msg.getHours(), msg.getMinutes(), msg.getSeconds());
    }
    catch (_a) {
        return new Date(iso);
    }
}
// ─── Full pipeline: read SMS → parse → return structured list ─────────────────
var getTransactionsFromSMS = function () {
    var args_1 = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args_1[_i] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (minDate, limit) {
        var messages, transactions, _a, messages_1, message, smsId, normBody, sipAllotment, loanEMI, stockBuy, parsed, transactionDate, err_3;
        var _b;
        if (minDate === void 0) { minDate = 0; }
        if (limit === void 0) { limit = 300; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, exports.readFinancialSMS)(minDate, limit)];
                case 1:
                    messages = _c.sent();
                    transactions = [];
                    for (_a = 0, messages_1 = messages; _a < messages_1.length; _a++) {
                        message = messages_1[_a];
                        smsId = (_b = message._id) === null || _b === void 0 ? void 0 : _b.toString();
                        normBody = (0, exports.normaliseSMSBody)(message.body);
                        sipAllotment = (0, smsAlertParser_1.parseSIPAllotment)(normBody);
                        if (sipAllotment && smsId) {
                            (0, investmentSmsHandler_1.handleSIPAllotmentSMS)(sipAllotment, smsId).then(function (r) {
                                console.log("[SMS::investmentRouter] SIP allotment \u2192 ".concat(r.status));
                            }).catch(function (e) { return console.warn('[SMS::investmentRouter] SIP error:', e); });
                            // Do NOT push to transactions[] — this is handled by investmentSmsHandler
                            continue;
                        }
                        loanEMI = (0, smsAlertParser_1.parseLoanEMI)(normBody);
                        if (loanEMI && smsId) {
                            (0, investmentSmsHandler_1.handleLoanEMISMS)(loanEMI, smsId).then(function (r) {
                                console.log("[SMS::investmentRouter] Loan EMI \u2192 ".concat(r.status));
                            }).catch(function (e) { return console.warn('[SMS::investmentRouter] Loan error:', e); });
                            continue;
                        }
                        stockBuy = (0, smsAlertParser_1.parseStockBuy)(normBody);
                        if (stockBuy && smsId) {
                            (0, investmentSmsHandler_1.handleStockBuySMS)(stockBuy, smsId).then(function (r) {
                                console.log("[SMS::investmentRouter] Stock trade \u2192 ".concat(r.status));
                            }).catch(function (e) { return console.warn('[SMS::investmentRouter] Stock error:', e); });
                            continue;
                        }
                        parsed = (0, exports.extractTransactionFromSMS)(message.body, message.address);
                        if (!parsed) {
                            // We keep this log silent to avoid spam during bulk scans
                            continue;
                        }
                        transactionDate = void 0;
                        if (parsed.date && message.date) {
                            transactionDate = combineDateWithTime(parsed.date, message.date).toISOString();
                        }
                        else if (parsed.date) {
                            transactionDate = parsed.date;
                        }
                        else if (message.date) {
                            transactionDate = new Date(message.date).toISOString();
                        }
                        else {
                            transactionDate = new Date().toISOString();
                        }
                        transactions.push(__assign(__assign({}, parsed), { smsId: smsId, date: transactionDate }));
                    }
                    console.log("[SMS::Parser] Extracted ".concat(transactions.length, " transactions from SMS"));
                    return [2 /*return*/, transactions];
                case 2:
                    err_3 = _c.sent();
                    console.error('[SMS::Parser] Pipeline error:', err_3);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
};
exports.getTransactionsFromSMS = getTransactionsFromSMS;
