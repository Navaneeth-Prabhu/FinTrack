// utils/SMSTransactionUtil.ts
// Converts parsed SMS transactions → app Transaction format.
// Uses the 3-tier smsCategorizationService for intelligent categorization.

import { getTransactionsFromSMS, ParsedSMS, readFinancialSMS, extractTransactionFromSMS } from '@/services/smsParser';
import { classifySMSIntent, SIPConfirmationIntent, EMIDeductionIntent, AccountBalanceIntent, LoanAlertIntent, parseNACHMFDebit } from '@/services/smsAlertParser';
import { smsAlertExistsBySmSId } from '@/db/repository/alertRepository';
import {
  categorizeWithContext,
  CategorizationOptions,
  getSMSAIPreference,
} from '@/services/smsCategorizationService';
import { Category, Transaction, Account } from '@/types';
import { useAccountStore } from '@/stores/accountStore';
import { useSIPStore } from '@/stores/sipStore';
import { useLoanStore } from '@/stores/loanStore';
import { useAlertStore } from '@/stores/alertStore';
import { useSmsSyncStore } from '@/stores/smsSyncStore';
import { supabase } from '@/services/supabaseClient';
import {
  getProcessedSmsIdsFromDb,
  saveProcessedSmsIdsToDb,
  getSmsWatermarkFromDb,
  setSmsWatermarkInDb,
} from '@/db/services/sqliteService';

// ─── Deduplication / Watermark helpers ─────────────────────────────────────────

/** Gets the timestamp of the newest processed SMS */
export const getSmsWatermark = async (): Promise<number> => {
  return await getSmsWatermarkFromDb();
};

/**
 * Updates the watermark timestamp.
 * Only advances forward. Never goes backwards.
 */
export const updateSmsWatermark = async (newDateTs: number): Promise<void> => {
  if (!newDateTs || isNaN(newDateTs)) return;
  try {
    const current = await getSmsWatermarkFromDb();
    if (newDateTs > current) {
      await setSmsWatermarkInDb(newDateTs);
      console.log(`[SMS::Watermark] Advanced to ${new Date(newDateTs).toISOString()}`);
    }
  } catch (err) {
    console.error('[SMS::Watermark] Error updating watermark:', err);
  }
};

// ─── Payment method detection ──────────────────────────────────────────────────
function resolvePaymentMode(parsed: ParsedSMS & { smsId?: string }): string {
  if (parsed.paymentMethod) return parsed.paymentMethod;
  const body = (parsed.rawSMS ?? '').toLowerCase();
  if (body.includes('upi') || body.includes('vpa')) return 'UPI';
  if (body.includes('credit card')) return 'Credit Card';
  if (body.includes('debit card')) return 'Debit Card';
  if (body.includes('imps')) return 'IMPS';
  if (body.includes('neft')) return 'NEFT';
  if (body.includes('rtgs')) return 'RTGS';
  if (body.includes('net banking') || body.includes('netbanking')) return 'Net Banking';
  if (body.includes('wallet') || body.includes('paytm') || body.includes('phonepe')) return 'Wallet';
  if (body.includes('atm') || body.includes('cash')) return 'Cash';
  return 'Other';
}

function resolveAccount(parsed: ParsedSMS & { smsId?: string }): string | undefined {
  let detectedBank = parsed.bank;

  if (!detectedBank) {
    const body = (parsed.rawSMS ?? '').toLowerCase();
    const sender = (parsed.sender ?? '').toLowerCase();
    const combined = `${sender} ${body}`;

    if (combined.includes('hdfc')) detectedBank = 'HDFC Bank';
    else if (combined.includes('icici')) detectedBank = 'ICICI Bank';
    else if (combined.includes('sbi') || combined.includes('onlsbi')) detectedBank = 'SBI';
    else if (combined.includes('axis')) detectedBank = 'Axis Bank';
    else if (combined.includes('kotak')) detectedBank = 'Kotak Mahindra';
    else if (combined.includes('paytm')) detectedBank = 'Paytm';
    else if (combined.includes('phonepe')) detectedBank = 'PhonePe';
    else if (combined.includes('kerala gramin') || combined.includes('kgbank')) detectedBank = 'Kerala Gramin Bank';
  }

  if (detectedBank) {
    parsed.bank = detectedBank;
    if (parsed.accountLast4) return `${detectedBank} ••••${parsed.accountLast4}`;
    return detectedBank;
  }

  // Fallback: if no bank detected but we have an account number
  if (parsed.accountLast4) return `Account ••••${parsed.accountLast4}`;
  return undefined;
}

// ─── Convert a single parsed SMS to app Transaction ────────────────────────────
export const convertToAppTransaction = async (
  parsed: ParsedSMS & { smsId?: string; date: string },
  categories: Category[],
  options: CategorizationOptions,
): Promise<Transaction> => {
  const now = new Date().toISOString();

  // Categorize — uses raw SMS body for extra context if merchant alone doesn't match
  const categoryResult = await categorizeWithContext(
    parsed.merchant,
    parsed.rawSMS,
    parsed.amount,
    parsed.type,
    categories,
    options,
  );

  let matchedCategory: Category = categories.find(c => c.id === categoryResult.categoryId) ?? {
    id: categoryResult.categoryId ?? (parsed.type === 'income' ? 'other_income' : 'other_expense'),
    name: categoryResult.categoryName,
    icon: '❗',
    color: '#888888',
    type: parsed.type === 'income' ? 'income' : 'expense',
  };

  // Force UPI P2P Income to the "Credit" category by default unless the LLM gave a very strong override
  if (parsed.type === 'income' && parsed.paymentMethod === 'UPI' && parsed.paidBy) {
    const creditCat = categories.find(c => c.name.toLowerCase() === 'credit' && c.type === 'income');
    if (creditCat) matchedCategory = creditCat;
  }

  // ── Auto-Link SIP / EMI (Phase 2) ──
  let autoLinkNote: string | null = null;

  // 1. Regular SIP NACH Debit (extracted from generic bank SMS)
  const nachMFDebit = parseNACHMFDebit(parsed.rawSMS, parsed.sender);
  if (nachMFDebit && parsed.type === 'expense') {
    const sipStore = useSIPStore.getState();
    const existingSIP = sipStore.sips.find(s => s.folioNumber === nachMFDebit.folioNumber) ||
      sipStore.sips.find(s => s.fundName.toLowerCase().includes(nachMFDebit.amcName.toLowerCase()));

    if (existingSIP) {
      await sipStore.autoAllocateSIP(existingSIP.id, nachMFDebit.amount);
      autoLinkNote = `Auto-linked to SIP: ${existingSIP.fundName} (NACH Debit)`;

      // Override category to ensure it shows up nicely in the timeline
      const investmentCat = categories.find(c => c.type === 'expense' && (c.name.toLowerCase().includes('invest') || c.name.toLowerCase().includes('sip')));
      if (investmentCat) matchedCategory = investmentCat;
    }
  }
  // 2. Standard SIP Application (if tagged by parser)
  else if (parsed.subType === 'sip' && parsed.type === 'expense') {
    const sipStore = useSIPStore.getState();
    await sipStore.fetchSIPs(); // Ensure loaded
    // Find active SIP matching the amount (simplistic matcher for MVP)
    const matchedSip = sipStore.sips.find(s => s.status === 'active' && Math.abs(s.amount - parsed.amount) < 10);
    if (matchedSip) {
      // Force categorize as investment
      const invCat = categories.find(c => c.name.toLowerCase().includes('investment'));
      if (invCat) matchedCategory = invCat;

      // Update SIP invested amount
      await sipStore.updateSIP({
        ...matchedSip,
        totalInvested: matchedSip.totalInvested + parsed.amount,
        // Push next due date by 1 month basically
        nextDueDate: new Date(new Date(matchedSip.nextDueDate).setMonth(new Date(matchedSip.nextDueDate).getMonth() + 1)).toISOString()
      });
      autoLinkNote = `Linked to SIP: ${matchedSip.name}`;
      console.log(`[SMS::Link] Auto-linked transaction to SIP: ${matchedSip.name}`);
    }
  } else if (parsed.subType === 'emi' && parsed.type === 'expense') {
    const loanStore = useLoanStore.getState();
    await loanStore.fetchLoans();
    const matchedLoan = loanStore.loans.find(l => l.status === 'active' && Math.abs(l.emiAmount - parsed.amount) < 10);
    if (matchedLoan) {
      const emiCat = categories.find(c => c.name.toLowerCase().includes('loan') || c.name.toLowerCase().includes('emi'));
      if (emiCat) matchedCategory = emiCat;

      // Update Loan outstanding amount
      const newOutstanding = Math.max(0, matchedLoan.outstanding - parsed.amount);
      await loanStore.updateLoan({
        ...matchedLoan,
        outstanding: newOutstanding,
        status: newOutstanding <= 0 ? 'closed' : 'active'
      });
      autoLinkNote = `Linked to Loan EMI: ${matchedLoan.lender}`;
      console.log(`[SMS::Link] Auto-linked transaction to Loan: ${matchedLoan.lender}`);
    }
  }

  // ── Auto-create and Link Account ──
  let linkedAccount: Account | undefined = undefined;
  const accountName = resolveAccount(parsed);

  if (accountName && !['Unknown', 'Other', 'UPI', 'Cash'].includes(accountName)) {
    const accountStore = useAccountStore.getState();

    // 1. Try to find the exact account in the store
    // This supports multiple accounts at the same bank (e.g. HDFC 1088 and HDFC 9087)
    linkedAccount = accountStore.accounts.find(a => {

      // 1a. Strict match: if both have an account number, they MUST match exactly
      if (parsed.accountLast4 && a.accountNumber) {
        if (a.accountNumber === parsed.accountLast4) {
          // If bank is known on both, ensure they don't explicitly conflict
          if (parsed.bank && a.provider && a.provider !== 'Unknown Bank' && !a.provider.toLowerCase().includes(parsed.bank.toLowerCase())) {
            return false;
          }
          return true;
        }
        return false; // Account numbers exist but don't match = different accounts
      }

      // 1b. Adoption match: The SMS has an account number, but the existing account has NO account number
      // (e.g. User manually created "HDFC Bank"). We adopt it.
      if (parsed.accountLast4 && !a.accountNumber) {
        if (parsed.bank && (a.provider?.toLowerCase().includes(parsed.bank.toLowerCase()) || a.name.toLowerCase().includes(parsed.bank.toLowerCase()))) {
          return true;
        }
      }

      // Strong match: Exact account number match (if bank isn't parsed but they share Account Number)
      if (parsed.accountLast4 && a.accountNumber === parsed.accountLast4) {
        return true;
      }

      // Exact name match
      if (a.name.toLowerCase() === accountName.toLowerCase()) {
        return true;
      }

      return false;
    });

    // 2. If it doesn't exist locally, auto-create it
    if (!linkedAccount) {
      const newAccount: Account = {
        id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: accountName,
        type: 'bank',
        balance: parsed.availableBalance ?? 0,
        currency: 'INR',
        isIncludeInNetWorth: true,
        color: '#ABDF75', // Default green-ish bank color
        icon: '🏦', // Default bank icon
        provider: parsed.bank ?? 'Unknown Bank',
        accountNumber: parsed.accountLast4 ?? undefined,
      };

      try {
        linkedAccount = await accountStore.addAccount(newAccount);
        console.log(`[SMS::Account] Auto-created new account locally: ${newAccount.name}`);

        // ── Push to Supabase optionally if online ──
        if (options.isOnline && options.userId) {
          const { error } = await supabase.from('accounts').insert({
            id: newAccount.id, // Or omit if UUID is assigned by Supabase
            user_id: options.userId,
            type: 'bank',
            provider: newAccount.provider,
            account_number: newAccount.accountNumber,
            account_name: newAccount.name,
            balance: newAccount.balance,
            currency: newAccount.currency,
            metadata: {
              color: newAccount.color,
              icon: newAccount.icon,
              isIncludeInNetWorth: newAccount.isIncludeInNetWorth
            }
          });
          if (error) {
            console.error('[SMS::Account] Error syncing auto-created account to Supabase:', error);
          } else {
            console.log(`[SMS::Account] Successfully synced account to Supabase: ${newAccount.name}`);
          }
        }
      } catch (err) {
        console.error('[SMS::Account] Error creating account automatically:', err);
      }
    } else {
      console.log(`[SMS::Account] Found existing account: ${linkedAccount.name}`);

      // Adopt the newly discovered account number or balance and update the existing account
      let updated = false;
      const updates = { ...linkedAccount };

      if (parsed.accountLast4 && !linkedAccount.accountNumber) {
        updates.accountNumber = parsed.accountLast4;
        // Rename the adopted manually-created account so the user knows it was linked
        if (updates.name === parsed.bank) {
          updates.name = `${parsed.bank} ····${parsed.accountLast4}`;
        }
        updated = true;
      }

      if (parsed.bank && (!linkedAccount.provider || linkedAccount.provider === 'Unknown Bank')) {
        updates.provider = parsed.bank;
        updated = true;
      }

      if (parsed.availableBalance !== undefined) {
        updates.balance = parsed.availableBalance;
        updated = true;
      }

      if (updated) {
        try {
          await accountStore.editAccount(updates);
          linkedAccount = updates; // Ensure we use the updated account metadata for the transaction
          console.log(`[SMS::Account] Updated existing account with new metadata/balance.`);
        } catch (err) {
          console.error('[SMS::Account] Failed to update existing account details:', err);
        }
      }
    }
  }

  return {
    id: `sms_${parsed.smsId ?? Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    amount: parsed.amount,
    type: parsed.type,
    date: parsed.date,
    createdAt: now,
    lastModified: now,
    paidTo: parsed.type !== 'income' ? (parsed.merchant ?? 'Unknown') : undefined,
    paidBy: parsed.type === 'income' ? (parsed.merchant ?? parsed.paidBy ?? parsed.sender) : resolveAccount(parsed),
    category: matchedCategory,
    fromAccount: parsed.type !== 'income' ? linkedAccount : undefined,
    toAccount: parsed.type === 'income' ? linkedAccount : undefined,
    source: {
      type: 'sms',
      rawData: parsed.rawSMS,
    },
    mode: resolvePaymentMode(parsed),
    refNumber: parsed.refNumber ?? undefined,
    note: [
      `Auto-import from SMS`,
      parsed.bank ? `Bank: ${parsed.bank}` : null,
      parsed.accountLast4 ? `A/c: ••••${parsed.accountLast4}` : null,
      `Source: ${parsed.sender ?? 'Unknown'}`,
      autoLinkNote
    ].filter(Boolean).join(' | '),
  };
};

// ─── Intent Handlers ──────────────────────────────────────────────────────────

/**
 * SIP Confirmation — auto-create SIP plan if one with same fundName doesn't exist,
 * or update totalInvested + units + nav + nextDueDate on an existing plan.
 */
async function handleSIPConfirmation(
  intent: SIPConfirmationIntent,
  smsId: string | undefined,
  bank: string | null,
): Promise<void> {
  const alertStore = useAlertStore.getState();
  if (smsId && await smsAlertExistsBySmSId(smsId)) return;

  const { sips, addSIP, updateSIP, fetchSIPs } = useSIPStore.getState();
  const now = new Date().toISOString();
  const existing = sips.find((p: typeof sips[0]) =>
    p.fundName.toLowerCase().includes(intent.fundName.toLowerCase()) ||
    intent.fundName.toLowerCase().includes(p.fundName.toLowerCase()),
  );

  if (existing) {
    await updateSIP({
      ...existing,
      totalInvested: existing.totalInvested + (intent.amount || 0),
      nav: intent.nav ?? existing.nav,
      units: (existing.units ?? 0) + (intent.units ?? 0),
      lastModified: now,
    });
    console.log(`[SMS::SIP] Updated plan "${existing.name}" totalInvested += ${intent.amount}`);
  } else if (intent.amount > 0) {
    const today = new Date();
    const nextDue = new Date(today);
    nextDue.setMonth(nextDue.getMonth() + 1);
    await addSIP({
      id: '',
      name: intent.fundName,
      fundName: intent.fundName,
      amount: intent.amount,
      frequency: 'monthly',
      startDate: now.split('T')[0],
      nextDueDate: nextDue.toISOString().split('T')[0],
      sipDay: today.getDate(),
      totalInvested: intent.amount,
      units: intent.units,
      nav: intent.nav,
      status: 'active',
      notes: `Auto-created from SMS${intent.folio ? ` | Folio: ${intent.folio}` : ''}`,
      categoryId: 'investment',
      createdAt: now,
      lastModified: now,
    });
    await fetchSIPs();
    console.log(`[SMS::SIP] Auto-created plan "${intent.fundName}" amount=${intent.amount}`);
  }

  await alertStore.addAlert({
    type: 'sip_confirmation',
    title: `SIP Processed — ${intent.fundName}`,
    body: [
      `Amount: ₹${intent.amount.toLocaleString('en-IN')}`,
      intent.units ? `Units: ${intent.units.toFixed(4)}` : null,
      intent.nav ? `NAV: ₹${intent.nav}` : null,
      intent.folio ? `Folio: ${intent.folio}` : null,
    ].filter(Boolean).join(' | '),
    amount: intent.amount,
    bank: bank ?? intent.bank ?? undefined,
    accountLast4: intent.accountLast4 ?? undefined,
    smsId,
  });
}

/**
 * EMI Deduction — reduce outstanding balance on the matched loan,
 * or auto-create a loan stub if none matches.
 */
async function handleEMIDeduction(
  intent: EMIDeductionIntent,
  smsId: string | undefined,
  bank: string | null,
): Promise<void> {
  const alertStore = useAlertStore.getState();

  if (smsId && await smsAlertExistsBySmSId(smsId)) return;

  const { loans, addLoan, updateLoan, fetchLoans } = useLoanStore.getState();
  const now = new Date().toISOString();

  // Try to find a matching active loan by lender name
  const existing = loans.find(l =>
    l.status === 'active' && (
      l.lender.toLowerCase().includes(intent.lenderHint.toLowerCase()) ||
      intent.lenderHint.toLowerCase().includes(l.lender.toLowerCase()) ||
      (bank && l.lender.toLowerCase().includes(bank.toLowerCase()))
    ),
  );

  if (existing) {
    const newOutstanding = Math.max(0, existing.outstanding - intent.emiAmount);
    await updateLoan({ ...existing, outstanding: newOutstanding, lastModified: now });
    await fetchLoans();
    console.log(`[SMS::EMI] Updated loan "${existing.lender}" outstanding: ${existing.outstanding} → ${newOutstanding}`);
  } else if (intent.emiAmount > 0) {
    // Auto-create a stub loan — user can fill in total later
    await addLoan({
      id: '',
      lender: intent.lenderHint || bank || 'Unknown Lender',
      loanType: 'other',
      principal: intent.emiAmount * 120,  // rough stub (120 months)
      outstanding: intent.emiAmount * 119,
      emiAmount: intent.emiAmount,
      emiDueDay: new Date().getDate(),
      tenureMonths: 120,
      startDate: now.split('T')[0],
      status: 'active',
      source: 'sms',
      notes: `Auto-created from SMS${intent.loanAccountHint ? ` | Loan A/c: ••••${intent.loanAccountHint}` : ''}`,
      createdAt: now,
      lastModified: now,
    });
    await fetchLoans();
    console.log(`[SMS::EMI] Auto-created loan stub for "${intent.lenderHint}" EMI=${intent.emiAmount}`);
  }

  await alertStore.addAlert({
    type: 'emi_deduction',
    title: `EMI Paid — ${intent.lenderHint || bank || 'Loan'}`,
    body: `EMI of ₹${intent.emiAmount.toLocaleString('en-IN')} debited${intent.loanAccountHint ? ` (Loan ••••${intent.loanAccountHint})` : ''}`,
    amount: intent.emiAmount,
    bank: bank ?? undefined,
    accountLast4: intent.accountLast4 ?? undefined,
    smsId,
  });
}

/**
 * Account Balance — update the matching account's balance in accountStore.
 */
async function handleAccountBalance(
  intent: AccountBalanceIntent,
  smsId: string | undefined,
  bank: string | null,
): Promise<void> {
  const alertStore = useAlertStore.getState();

  if (smsId && await smsAlertExistsBySmSId(smsId)) return;

  const { accounts, editAccount } = useAccountStore.getState();

  // Match account by bank name and/or last 4 digits
  const matched = accounts.find(a => {
    const nameMatch = bank && a.name.toLowerCase().includes(bank.toLowerCase());
    const acctMatch = intent.accountLast4 && a.accountNumber?.endsWith(intent.accountLast4);
    return acctMatch || nameMatch;
  });

  if (matched) {
    await editAccount({ ...matched, balance: intent.balance });
    console.log(`[SMS::Balance] Updated account "${matched.name}" balance → ₹${intent.balance}`);
  } else {
    console.log(`[SMS::Balance] No matching account found for last4=${intent.accountLast4} bank=${bank}`);
  }

  await alertStore.addAlert({
    type: 'account_balance',
    title: `Balance Update — ${bank || 'Account'}${intent.accountLast4 ? ` ••••${intent.accountLast4}` : ''}`,
    body: `Available balance: ₹${intent.balance.toLocaleString('en-IN')}`,
    amount: intent.balance,
    bank: bank ?? undefined,
    accountLast4: intent.accountLast4 ?? undefined,
    smsId,
  });
}

/**
 * Loan Alert — save the due reminder to the alert store (no store write).
 */
async function handleLoanAlert(
  intent: LoanAlertIntent,
  smsId: string | undefined,
  bank: string | null,
): Promise<void> {
  const alertStore = useAlertStore.getState();

  if (smsId && await smsAlertExistsBySmSId(smsId)) return;

  const duePart = intent.dueAmount
    ? `₹${intent.dueAmount.toLocaleString('en-IN')}`
    : 'payment';
  const datePart = intent.dueDate
    ? ` due on ${new Date(intent.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
    : '';

  await alertStore.addAlert({
    type: 'loan_alert',
    title: `Loan Due — ${intent.lenderHint || bank || 'Loan'}`,
    body: `${duePart}${datePart}`,
    amount: intent.dueAmount,
    bank: bank ?? undefined,
    smsId,
  });

  console.log(`[SMS::LoanAlert] Saved due alert for "${intent.lenderHint}" amount=${intent.dueAmount}`);
}

// ─── Main: get new transactions from SMS ──────────────────────────────────────
export const getNewTransactionsFromSMS = async (
  categories: Category[],
  userId: string | null,
  isOnline: boolean,
  force = false,
): Promise<(Transaction & { smsId?: string, rawDateMs?: number })[]> => {
  try {
    const aiEnabled = await getSMSAIPreference();
    const options: CategorizationOptions = { aiEnabled, isOnline, userId };

    const watermark = force ? 0 : await getSmsWatermarkFromDb();
    console.log(`[SMS::Util] Fetching from watermark: ${watermark > 0 ? new Date(watermark).toISOString() : 'beginning'}`);

    // If we have a watermark, only grab messages newer than it.
    // We add a tiny 1ms buffer to avoid re-fetching the exact last message.
    const minDate = watermark > 0 && !force ? watermark + 1 : 0;

    // The parser now accepts minDate to pass down to native ContentResolver.
    // STEP 1: Read raw financial SMS
    const rawMessages = await readFinancialSMS(minDate);

    if (rawMessages.length === 0) {
      console.log('[SMS::Util] No new SMS messages.');
      return [];
    }

    // Start global progress UI if processing a bulk batch
    useSmsSyncStore.getState().startSync(rawMessages.length, `Analyzing ${rawMessages.length} messages...`);

    // STEP 2: Get already-processed IDs for dedup
    const processedIds = await getProcessedSmsIdsFromDb();

    // STEP 3: Route non-transaction SMS through intent handlers FIRST
    // These are handled in parallel (account balance, SIP, EMI, loan alerts)
    // and excluded from the transaction pipeline.
    const transactionMessages: typeof rawMessages = [];
    // FIX (Blocker 2): track intent-handled IDs separately so we can flush them
    // to SQLite at the end. Previously they were only pushed to the in-memory
    // processedIds array and never persisted — causing re-processing on restart.
    const intentHandledIds: string[] = [];

    await Promise.allSettled(rawMessages.map(async (msg) => {
      const smsId = msg._id?.toString();
      if (!force && smsId && processedIds.includes(smsId)) return; // already processed

      const intent = classifySMSIntent(msg.body, msg.address);

      // Detect bank display name from body heuristic for enrichment
      const bankFromSender = (() => {
        const lower = (msg.address ?? '').toUpperCase();
        if (lower.includes('HDFC')) return 'HDFC Bank';
        if (lower.includes('ICICI')) return 'ICICI Bank';
        if (lower.includes('SBI')) return 'SBI';
        if (lower.includes('AXIS')) return 'Axis Bank';
        if (lower.includes('KOTAK')) return 'Kotak Mahindra Bank';
        return null;
      })();

      switch (intent.kind) {
        case 'sip_confirmation':
          await handleSIPConfirmation(intent, smsId, bankFromSender);
          // Mark AFTER successful handler — if handler throws, ID stays unprocessed (safe retry)
          if (smsId) { processedIds.push(smsId); intentHandledIds.push(smsId); }
          break;
        case 'emi_deduction':
          await handleEMIDeduction(intent, smsId, bankFromSender);
          if (smsId) { processedIds.push(smsId); intentHandledIds.push(smsId); }
          break;
        case 'account_balance':
          await handleAccountBalance(intent, smsId, bankFromSender);
          if (smsId) { processedIds.push(smsId); intentHandledIds.push(smsId); }
          break;
        case 'loan_alert':
          await handleLoanAlert(intent, smsId, bankFromSender);
          if (smsId) { processedIds.push(smsId); intentHandledIds.push(smsId); }
          break;
        case 'transaction':
          transactionMessages.push(msg); // pass to existing pipeline
          break;
        default:
          break; // unknown — skip
      }
    }));

    // FIX (Blocker 2): Flush intent-handled IDs to SQLite immediately.
    // Previously these were never saved to the DB, so they'd re-process on every restart.
    if (intentHandledIds.length > 0) {
      await saveProcessedSmsIdsToDb(intentHandledIds);
      console.log(`[SMS::Util] Flushed ${intentHandledIds.length} intent-handled IDs to SQLite`);
    }

    console.log(`[SMS::Util] Intent routing: ${rawMessages.length} raw → ${transactionMessages.length} transactions`);

    // STEP 4: Parse transaction-intent messages through the existing parser
    const smsTransactions = transactionMessages
      .map(msg => {
        const parsed = extractTransactionFromSMS(msg.body, msg.address);
        if (!parsed) return null;
        const smsId = msg._id?.toString();

        // ── Industry-standard date resolution (Axio/Walnut pattern) ─────────
        // Priority 1: Date explicitly mentioned in the SMS body (e.g. "On 05/02/26").
        //             This is the ACTUAL transaction date, not the delivery date.
        // Priority 2: Native msg.date (Android ContentResolver delivery timestamp).
        //             Used only when no date is present in the SMS body.
        //
        // Sanity checks (prevents misclassification of marketing/reminder SMS):
        //   • Reject body dates more than 6 months in the past (likely spam/promo)
        //   • Reject future body dates  (those are "due date" reminders, not debits)
        //   → In both cases fall back to the native receive timestamp instead.
        const receiveTs = msg.date ? new Date(msg.date).toISOString() : new Date().toISOString();
        let date = receiveTs; // safe default

        if (parsed.date) {
          const bodyDateMs = new Date(parsed.date).getTime();
          const now = Date.now();
          const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
          if (bodyDateMs > now) {
            // Future date → this is a "due date" alert, not a debit; skip using body date
            console.log(`[SMS::Date] Body date is in the future (${parsed.date}), using receive date`);
            date = receiveTs;
          } else if (now - bodyDateMs > SIX_MONTHS_MS) {
            // Very old body date → probably a marketing promo; fall back
            console.log(`[SMS::Date] Body date is >6 months old (${parsed.date}), using receive date`);
            date = receiveTs;
          } else {
            date = parsed.date; // ✅ Valid body date — use it
          }
        }

        return { ...parsed, smsId, date };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    if (smsTransactions.length === 0) {
      console.log('[SMS::Util] No new SMS transactions.');
      return [];
    }

    // STEP 5: Dedup and filter by confidence
    const newTransactions = force
      ? smsTransactions
      : smsTransactions.filter(t => t.smsId && !processedIds.includes(t.smsId));

    const MIN_CONFIDENCE_THRESHOLD = 0.35;
    const highConfidenceTransactions = newTransactions.filter(t => t.confidence >= MIN_CONFIDENCE_THRESHOLD);
    console.log(`[SMS::Util] Converting ${highConfidenceTransactions.length} new transactions (filtered ${newTransactions.length - highConfidenceTransactions.length} low confidence)`);

    // STEP 6: Convert to app transactions sequentially to prevent DB race conditions
    // (e.g., auto-creating duplicate accounts)
    const appTransactions: (Transaction & { smsId?: string, rawDateMs?: number })[] = [];

    let processedCount = 0;
    for (const t of highConfidenceTransactions) {
      processedCount++;
      useSmsSyncStore.getState().updateProgress(
        processedCount,
        `Converting to transactions (${processedCount}/${highConfidenceTransactions.length})`
      );

      const tx = await convertToAppTransaction(t, categories, options);

      appTransactions.push({
        ...tx,
        smsId: t.smsId,
        rawDateMs: new Date(t.date).getTime()
      });
    }

    return appTransactions;
  } catch (err) {
    console.error('[SMS::Util] Error getting transactions:', err);
    return [];
  }
};

// ─── Import to store ───────────────────────────────────────────────────────────
export const importSMSTransactionsToStore = async (
  categories: Category[],
  saveTransactionFn: (t: Transaction) => Promise<Transaction>,
  userId: string | null = null,
  isOnline = true,
  force = false,
): Promise<number> => {
  try {
    const transactions = await getNewTransactionsFromSMS(categories, userId, isOnline, force);

    if (transactions.length > 0) {
      useSmsSyncStore.getState().startSync(transactions.length, 'Saving to Database...');
    }

    let savedCount = 0;
    const successfullySavedSmsIds: string[] = [];
    let maxDateProcessed = 0;

    for (const tx of transactions) {
      try {
        await saveTransactionFn(tx);
        savedCount++;

        if (tx.smsId) {
          successfullySavedSmsIds.push(tx.smsId);
        }
        if (tx.rawDateMs && tx.rawDateMs > maxDateProcessed) {
          maxDateProcessed = tx.rawDateMs;
        }

        useSmsSyncStore.getState().updateProgress(savedCount, `Saving transaction ${savedCount} of ${transactions.length}...`);
      } catch (err) {
        console.error('[SMS::Util] Save error for tx:', tx.id, err);
      }
    }

    // Permanently save the IDs and watermark to SQLite AFTER successful inserts
    if (successfullySavedSmsIds.length > 0) {
      await saveProcessedSmsIdsToDb(successfullySavedSmsIds);
      console.log(`[SMS::Util] Flushed ${successfullySavedSmsIds.length} successfully saved transaction SMS IDs to SQLite`);
    }

    const currentWatermark = await getSmsWatermarkFromDb();
    if (maxDateProcessed > currentWatermark) {
      await updateSmsWatermark(maxDateProcessed);
    }

    console.log(`[SMS::Util] Saved ${savedCount}/${transactions.length} transactions`);
    return savedCount;
  } catch (err) {
    console.error('[SMS::Util] Import error:', err);
    return 0;
  } finally {
    // Ensure we hide the sync UI when done or on failure
    useSmsSyncStore.getState().endSync();
  }
};