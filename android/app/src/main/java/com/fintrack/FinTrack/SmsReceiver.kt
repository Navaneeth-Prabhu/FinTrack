package com.fintrack.FinTrack

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

class SmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsReceiver"
        
        // Simple heuristic filtering for the native side so we don't wake up JS for personal text messages
        // These keywords should cover most Indian banking SMS
        private val FINANCIAL_KEYWORDS = listOf(
            "bank", "credit", "debit", "transaction", "account", "spent",
            "payment", "transfer", "balance", "card", "upi", "atm", "paid",
            "credited", "debited", "withdrawn", "deposit", "purchase",
            "inr", "rs", "rupee", "₹", "refund", "cashback", "emi"
        )

        private fun isFinancialSms(body: String, sender: String?): Boolean {
            val lowerBody = body.lowercase()
            
            // Allow if it matches financial keywords
            if (FINANCIAL_KEYWORDS.any { lowerBody.contains(it) }) {
                return true
            }
            
            // Allow alphanumeric shortcodes (e.g. VM-HDFCBK) as they are likely business SMS
            if (sender != null && !sender.matches(Regex("^[+0-9]+$"))) {
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
                        putExtra("timestamp", timestamp.toDouble()) // React Native handles doubles better than longs
                    }
                    try {
                        context.startService(serviceIntent)
                    } catch (ex: IllegalStateException) {
                        Log.e(TAG, "Failed to start Headless JS Service from background. Android >8 background limits?", ex)
                        // Ignore the crash. The SMS will be picked up on next app startup
                    }
                    
                    // We only process one message per broadcast, typically an SMS fits in one.
                    // If it's a multipart SMS, getMessagesFromIntent combines them usually, 
                    // or we process the first part that matches.
                    break
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing SMS", e)
        }
    }
}
