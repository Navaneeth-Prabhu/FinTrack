package com.fintrack.FinTrack

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

class SmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsReceiver"

        // â”€â”€ Layer 1: Real transaction signals (must have at least one) â”€â”€â”€â”€â”€â”€â”€â”€â”€
        private val TRANSACTION_SIGNALS = listOf(
            "debited", "credited", "withdrawn", "deducted", "spent", "used", "purchased",
            "transfer", "transferred", "dr", "cr",
            "upi ref", "upi txn", "neft ref", "imps ref", "rtgs ref",
            "utr", "rrn", "txn of", "transaction of",
            "a/c no", "a/c*", "xxxx", "xx", "acct",
            "transaction id", "txn id", "ref no", "ref:",
            "nach debit", "nach credit", "ecs debit",
            "sent rs", "sent inr", "paid rs", "paid inr",
            "received rs", "received inr",
            "available bal", "avl bal", "avl. bal", "available balance",
            "folio", "nav:", "units allotted", "sip of rs",
            "emi deducted", "emi paid",
            "balance is"
        )

        // â”€â”€ Layer 2: Spam/promo exclusion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        private val SPAM_EXCLUSION_SIGNALS = listOf(
            "get your", "approved loan", "pre-approved", "pre approved",
            "offer valid", "use code", "coupon code", "promo code",
            "click here", "click to", "tap here", "download app",
            "expires today", "expires soon", "limited time",
            "recharge now", "recharge with", "pack expired", "pack has expired",
            "data consumed", "data balance", "gb data", "gb at rs",
            "unlimited calls", "data/day",
            "credit limit", "credit card offer",
            "loan limit", "loan offer", "emi offer",
            "processing fee", "save flat", "save rs",
            "apply now", "apply for",
            "get upto", "get up to", "get rs",
            "cashback offer", "win rs", "earn rs",
            "reminder: airtel", "reminder: jio", "reminder: vi ",
            "collect request", "upi collect",
            "mandate registration", "autopay mandate", "e-mandate",
            "i.airtel.in", "fb.fbe", "bit.ly", "t.ly/"
        )

        private fun isFinancialSms(body: String, sender: String?): Boolean {
            val lower = body.lowercase()

            // Spam exclusion first (fast path)
            if (SPAM_EXCLUSION_SIGNALS.any { lower.contains(it) }) return false

            // Direct keyword signal
            if (TRANSACTION_SIGNALS.any { lower.contains(it) }) return true

            val hasAmount = Regex("""(?:rs\.?|inr|\u20B9)\s*[x*]*\s*[\d,]+(?:\.\d{1,2})?""", RegexOption.IGNORE_CASE).containsMatchIn(lower)
            val hasActionVerb = Regex("""\b(?:debited|credited|withdrawn|deducted|spent|paid|sent|received|transfer(?:red)?|purchased|used|dr\.?|cr\.?)\b""", RegexOption.IGNORE_CASE).containsMatchIn(lower)
            val hasFinancialContext = Regex("""\b(?:a\/c|account|acct|card|upi|vpa|utr|rrn|imps|neft|rtgs|ref(?:erence)?(?:\s*no)?|txn(?:\s*id)?)\b""", RegexOption.IGNORE_CASE).containsMatchIn(lower)
            if (hasAmount && hasActionVerb && hasFinancialContext) return true

            // Sender-aware fallback for business/bank senders
            if (sender != null && !sender.matches(Regex("^[+0-9]+$")) && hasAmount && hasFinancialContext) {
                return true
            }

            return false
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        try {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)

            for (sms in messages) {
                val body = sms.displayMessageBody
                val sender = sms.originatingAddress
                val timestamp = sms.timestampMillis

                if (body != null && isFinancialSms(body, sender)) {
                    Log.d(TAG, "Financial SMS detected from: $sender. Starting Headless JS service.")

                    val serviceIntent = Intent(context, SmsListenerService::class.java).apply {
                        putExtra("body", body)
                        putExtra("sender", sender)
                        putExtra("timestamp", timestamp.toDouble())
                    }
                    context.startService(serviceIntent)
                    break
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing SMS", e)
        }
    }
}
