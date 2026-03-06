"use strict";
// services/investmentSmsHandler.ts
// ─────────────────────────────────────────────────────────────────────────────
// Translates structured SMS parse results (from smsAlertParser.ts) into
// investment_transaction database writes.
//
// Flow per SMS:
//   smsAlertParser → ParsedSIPAllotment / ParsedLoanEMI / ParsedStockTrade
//         ↓
//   investmentSmsHandler (this file) → dedup check → DB write → store refresh
//
// Day 5 implementation:
//   handleSIPAllotmentSMS() — SIP allotment events
//   handleLoanEMISMS()      — Loan EMI payment events
//   handleStockBuySMS()     — Stock buy events (Day 8, stub ready)
// ─────────────────────────────────────────────────────────────────────────────
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStockBuySMS = exports.handleLoanEMISMS = exports.handleSIPAllotmentSMS = void 0;
var investmentTxRepository_1 = require("@/db/repository/investmentTxRepository");
var sipRepository_1 = require("@/db/repository/sipRepository");
var sipStore_1 = require("@/stores/sipStore");
var loanStore_1 = require("@/stores/loanStore");
var holdingsStore_1 = require("@/stores/holdingsStore");
// Simple local ID generator (same as stores)
var generateId = function () {
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
};
// ─── SIP Allotment Handler ───────────────────────────────────────────────────
/**
 * Handles a parsed SIP allotment SMS.
 *
 * Steps:
 *   1. Dedup — skip if sms_id already recorded
 *   2. Match folio → existing SIP; if not found, auto-create skeleton SIP
 *   3. Write investment_transaction row (event_type = 'allotment')
 *   4. Refresh sipStore so UI reflects updated totals
 *
 * @param parsed  Structured output from smsAlertParser.parseSIPAllotment()
 * @param smsId   Raw SMS ID from the device — used as dedup key
 */
var handleSIPAllotmentSMS = function (parsed, smsId) { return __awaiter(void 0, void 0, void 0, function () {
    var existing, sipId, sip, now, err_1, reason;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 8, , 9]);
                return [4 /*yield*/, (0, investmentTxRepository_1.findInvestmentTxBySmsId)(smsId)];
            case 1:
                existing = _a.sent();
                if (existing) {
                    return [2 /*return*/, { status: 'duplicate', skipped: true, existingId: existing.id }];
                }
                sipId = void 0;
                return [4 /*yield*/, (0, sipRepository_1.findSIPByFolio)(parsed.folioNumber)];
            case 2:
                sip = _a.sent();
                if (!!sip) return [3 /*break*/, 4];
                return [4 /*yield*/, (0, sipRepository_1.createSIPFromSMS)({
                        folioNumber: parsed.folioNumber,
                        amount: parsed.amount,
                        fundName: parsed.fundName,
                    })];
            case 3:
                // Auto-create a skeleton SIP — user edits details from detail screen
                sipId = _a.sent();
                console.log("[investmentSmsHandler] Auto-created SIP for folio ".concat(parsed.folioNumber, " \u2192 id: ").concat(sipId));
                return [3 /*break*/, 5];
            case 4:
                sipId = sip.id;
                _a.label = 5;
            case 5:
                now = new Date().toISOString();
                return [4 /*yield*/, (0, investmentTxRepository_1.saveInvestmentTxToDB)({
                        id: generateId(),
                        holding_id: sipId,
                        holding_type: 'sip',
                        event_type: 'allotment',
                        amount: parsed.amount,
                        units: parsed.units,
                        nav: parsed.nav,
                        event_date: parsed.date || now,
                        source: 'sms',
                        sms_id: smsId,
                        is_deleted: 0,
                        updated_at: now,
                        created_at: now,
                    })];
            case 6:
                _a.sent();
                // Step 4: Refresh sipStore — triggers reactive UI update
                return [4 /*yield*/, sipStore_1.useSIPStore.getState().fetchSIPs()];
            case 7:
                // Step 4: Refresh sipStore — triggers reactive UI update
                _a.sent();
                console.log("[investmentSmsHandler] SIP allotment recorded \u2014 folio: ".concat(parsed.folioNumber) +
                    ", units: ".concat(parsed.units, ", nav: ").concat(parsed.nav, ", amount: \u20B9").concat(parsed.amount));
                return [2 /*return*/, { status: 'success', holdingId: sipId }];
            case 8:
                err_1 = _a.sent();
                reason = err_1 instanceof Error ? err_1.message : String(err_1);
                console.error('[investmentSmsHandler] handleSIPAllotmentSMS failed:', reason);
                return [2 /*return*/, { status: 'error', reason: reason }];
            case 9: return [2 /*return*/];
        }
    });
}); };
exports.handleSIPAllotmentSMS = handleSIPAllotmentSMS;
// ─── Loan EMI Handler ────────────────────────────────────────────────────────
/**
 * Handles a parsed Loan EMI SMS.
 *
 * Steps:
 *   1. Dedup — skip if sms_id already recorded
 *   2. Find matching loan by last-4 of loan account number
 *      (best-effort match; if ambiguous or not found, creates a standalone tx)
 *   3. Write investment_transaction row (event_type = 'payment')
 *   4. Refresh loanStore so outstanding balance updates in UI
 *
 * @param parsed  Structured output from smsAlertParser.parseLoanEMI()
 * @param smsId   Raw SMS ID from the device — used as dedup key
 */
var handleLoanEMISMS = function (parsed, smsId) { return __awaiter(void 0, void 0, void 0, function () {
    var existing, loanId, loans, matched, lowerHint_1, matched, now, txId, err_2, reason;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                return [4 /*yield*/, (0, investmentTxRepository_1.findInvestmentTxBySmsId)(smsId)];
            case 1:
                existing = _a.sent();
                if (existing) {
                    return [2 /*return*/, { status: 'duplicate', skipped: true, existingId: existing.id }];
                }
                loanId = null;
                loans = loanStore_1.useLoanStore.getState().loans;
                if (parsed.loanAccountHint) {
                    matched = loans.find(function (l) { var _a; return (_a = l.notes) === null || _a === void 0 ? void 0 : _a.includes(parsed.loanAccountHint); });
                    if (matched)
                        loanId = matched.id;
                }
                // Fallback: match by lender name heuristic
                if (!loanId && parsed.lenderHint) {
                    lowerHint_1 = parsed.lenderHint.toLowerCase();
                    matched = loans.find(function (l) { return l.lender && l.lender.toLowerCase().includes(lowerHint_1); });
                    if (matched)
                        loanId = matched.id;
                }
                now = new Date().toISOString();
                txId = generateId();
                return [4 /*yield*/, (0, investmentTxRepository_1.saveInvestmentTxToDB)({
                        id: txId,
                        // If no loan matched, use a synthetic holding_id so the tx is stored
                        // User can link it manually from the Loans tab
                        holding_id: loanId !== null && loanId !== void 0 ? loanId : "unmatched_loan_".concat(txId),
                        holding_type: 'other',
                        event_type: 'payment',
                        amount: parsed.emiAmount,
                        balance_after: parsed.outstandingAmount,
                        event_date: parsed.date || now,
                        source: 'sms',
                        sms_id: smsId,
                        notes: loanId ? undefined : "Unmatched loan \u2014 ".concat(parsed.lenderHint),
                        is_deleted: 0,
                        updated_at: now,
                        created_at: now,
                    })];
            case 2:
                _a.sent();
                if (!loanId) return [3 /*break*/, 4];
                return [4 /*yield*/, loanStore_1.useLoanStore.getState().recordPayment(loanId, parsed.emiAmount)];
            case 3:
                _a.sent();
                return [3 /*break*/, 5];
            case 4:
                // Still refresh so the unmatched tx shows in the investmentTx list
                console.warn("[investmentSmsHandler] Loan EMI recorded but no matching loan found. " +
                    "Hint: \"".concat(parsed.lenderHint, "\" / account: \"").concat(parsed.loanAccountHint, "\""));
                _a.label = 5;
            case 5:
                console.log("[investmentSmsHandler] Loan EMI recorded \u2014 \u20B9".concat(parsed.emiAmount) +
                    (loanId ? " \u2192 loanId: ".concat(loanId) : ' (unmatched)'));
                return [2 /*return*/, { status: 'success', holdingId: loanId !== null && loanId !== void 0 ? loanId : txId }];
            case 6:
                err_2 = _a.sent();
                reason = err_2 instanceof Error ? err_2.message : String(err_2);
                console.error('[investmentSmsHandler] handleLoanEMISMS failed:', reason);
                return [2 /*return*/, { status: 'error', reason: reason }];
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.handleLoanEMISMS = handleLoanEMISMS;
// ─── Stock Buy/Sell Handler ───────────────────────────────────────────────────
/**
 * Handles a parsed stock buy or sell SMS.
 *
 * Steps:
 *   1. Dedup — skip if sms_id already recorded
 *   2. Find existing Holding by ticker symbol (case-insensitive match)
 *      If not found: auto-create a new Holding with data from the SMS
 *   3. For BUY:  update avg_buy_price (weighted average) and quantity
 *      For SELL: reduce quantity (remaining holdings stay at cost basis)
 *   4. Write investment_transaction row (event_type = 'buy' | 'sell')
 *   5. Refresh holdingsStore so UI reflects the change
 *
 * @param parsed  Structured output from smsAlertParser.parseStockBuy()
 * @param smsId   Raw SMS ID from the device — used as dedup key
 */
var handleStockBuySMS = function (parsed, smsId) { return __awaiter(void 0, void 0, void 0, function () {
    var existing, holdingsStore, now, tickerUpper_1, holding, holdingId, newHolding, prevQty, prevAvg, newQty, newAvg, remainingQty, savePriceSnapshotToDB, snapshotId, e_1, err_3, reason;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 14, , 15]);
                return [4 /*yield*/, (0, investmentTxRepository_1.findInvestmentTxBySmsId)(smsId)];
            case 1:
                existing = _a.sent();
                if (existing) {
                    return [2 /*return*/, { status: 'duplicate', skipped: true, existingId: existing.id }];
                }
                holdingsStore = holdingsStore_1.useHoldingsStore.getState();
                now = new Date().toISOString();
                tickerUpper_1 = parsed.ticker.toUpperCase();
                holding = holdingsStore.holdings.find(function (h) { var _a; return h.type === 'stock' && ((_a = h.ticker) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === tickerUpper_1; });
                holdingId = void 0;
                if (!!holding) return [3 /*break*/, 3];
                // Auto-create a skeleton stock holding from SMS data
                holdingId = generateId();
                newHolding = {
                    id: holdingId,
                    type: 'stock',
                    name: tickerUpper_1, // User can rename from the holding detail screen
                    ticker: tickerUpper_1,
                    quantity: parsed.action === 'buy' ? parsed.quantity : 0,
                    avg_buy_price: parsed.price,
                    current_price: parsed.price, // Best estimate at time of SMS
                    buy_date: parsed.date || now,
                    source: 'sms',
                    price_updated_at: now,
                    updated_at: now,
                    notes: "Auto-created from SMS \u2014 ".concat(parsed.exchange),
                };
                return [4 /*yield*/, holdingsStore.addHolding(newHolding)];
            case 2:
                _a.sent();
                console.log("[investmentSmsHandler] Auto-created Holding for ticker ".concat(tickerUpper_1, " \u2192 id: ").concat(holdingId));
                return [3 /*break*/, 7];
            case 3:
                holdingId = holding.id;
                if (!(parsed.action === 'buy')) return [3 /*break*/, 5];
                prevQty = holding.quantity;
                prevAvg = holding.avg_buy_price;
                newQty = prevQty + parsed.quantity;
                newAvg = newQty > 0
                    ? (prevQty * prevAvg + parsed.quantity * parsed.price) / newQty
                    : parsed.price;
                return [4 /*yield*/, holdingsStore.updateHolding(__assign(__assign({}, holding), { quantity: newQty, avg_buy_price: newAvg, current_price: parsed.price, price_updated_at: now, updated_at: now }))];
            case 4:
                _a.sent();
                return [3 /*break*/, 7];
            case 5:
                remainingQty = Math.max(0, holding.quantity - parsed.quantity);
                return [4 /*yield*/, holdingsStore.updateHolding(__assign(__assign({}, holding), { quantity: remainingQty, current_price: parsed.price, price_updated_at: now, updated_at: now }))];
            case 6:
                _a.sent();
                _a.label = 7;
            case 7: 
            // Step 4: Write investment_transaction row
            return [4 /*yield*/, (0, investmentTxRepository_1.saveInvestmentTxToDB)({
                    id: generateId(),
                    holding_id: holdingId,
                    holding_type: 'stock',
                    event_type: parsed.action === 'buy' ? 'buy' : 'sell',
                    amount: parsed.total,
                    price: parsed.price,
                    quantity: parsed.quantity,
                    event_date: parsed.date || now,
                    source: 'sms',
                    sms_id: smsId,
                    notes: "".concat(parsed.action.toUpperCase(), " ").concat(parsed.quantity, " \u00D7 ").concat(tickerUpper_1, " @ \u20B9").concat(parsed.price, " on ").concat(parsed.exchange),
                    is_deleted: 0,
                    updated_at: now,
                    created_at: now,
                })];
            case 8:
                // Step 4: Write investment_transaction row
                _a.sent();
                savePriceSnapshotToDB = require('@/db/repository/priceSnapshotRepository').savePriceSnapshotToDB;
                snapshotId = "snapshot_".concat(holdingId, "_").concat(now.split('T')[0], "_sms");
                _a.label = 9;
            case 9:
                _a.trys.push([9, 11, , 12]);
                return [4 /*yield*/, savePriceSnapshotToDB({
                        id: snapshotId,
                        holding_id: holdingId,
                        price: parsed.price,
                        recorded_at: now,
                        source: 'sms',
                        created_at: now
                    })];
            case 10:
                _a.sent();
                return [3 /*break*/, 12];
            case 11:
                e_1 = _a.sent();
                return [3 /*break*/, 12];
            case 12: 
            // Step 5: Refresh store so Holdings tab reflects the change
            return [4 /*yield*/, holdingsStore.fetchHoldings()];
            case 13:
                // Step 5: Refresh store so Holdings tab reflects the change
                _a.sent();
                console.log("[investmentSmsHandler] Stock ".concat(parsed.action, " recorded \u2014 ") +
                    "".concat(parsed.quantity, " \u00D7 ").concat(tickerUpper_1, " @ \u20B9").concat(parsed.price, " (holdingId: ").concat(holdingId, ")"));
                return [2 /*return*/, { status: 'success', holdingId: holdingId }];
            case 14:
                err_3 = _a.sent();
                reason = err_3 instanceof Error ? err_3.message : String(err_3);
                console.error('[investmentSmsHandler] handleStockBuySMS failed:', reason);
                return [2 /*return*/, { status: 'error', reason: reason }];
            case 15: return [2 /*return*/];
        }
    });
}); };
exports.handleStockBuySMS = handleStockBuySMS;
