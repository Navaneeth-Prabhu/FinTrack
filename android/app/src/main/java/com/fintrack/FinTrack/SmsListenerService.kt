package com.fintrack.FinTrack

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class SmsListenerService : HeadlessJsTaskService() {

    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        if (intent == null) return null

        val body = intent.getStringExtra("body") ?: return null
        val sender = intent.getStringExtra("sender")
        val timestamp = intent.getDoubleExtra("timestamp", System.currentTimeMillis().toDouble())

        val data = Arguments.createMap().apply {
            putString("body", body)
            putString("sender", sender)
            putDouble("timestamp", timestamp)
        }

        return HeadlessJsTaskConfig(
            "SmsNewTransaction", // Task name to register in JS
            data,
            10000, // timeout for the task in ms (10 seconds)
            true // optional: true to allow running even if app is in foreground
        )
    }
}
