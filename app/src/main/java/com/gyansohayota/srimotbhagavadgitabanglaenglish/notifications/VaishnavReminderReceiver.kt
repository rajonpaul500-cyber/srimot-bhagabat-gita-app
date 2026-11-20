package com.gyansohayota.srimotbhagavadgitabanglaenglish.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.gyansohayota.srimotbhagavadgitabanglaenglish.MainActivity
import com.gyansohayota.srimotbhagavadgitabanglaenglish.R

class VaishnavReminderReceiver : BroadcastReceiver() {

    companion object {
        const val CHANNEL_ID = "vaishnav_reminders_channel"
        const val CHANNEL_NAME = "বৈষ্ণব ক্যালেন্ডার অনুস্মারক"
        private const val TAG = "VaishnavReminder"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val eventTitle = intent.getStringExtra("event_title") ?: "বৈষ্ণব উৎসব"
        val eventDate = intent.getStringExtra("event_date") ?: ""

        Log.d(TAG, "Triggering reminder notification for event: $eventTitle on $eventDate")

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        // Create Notification Channel for Android O (API 26) and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "আসন্ন একাদশী ও বৈষ্ণব উৎসবের পূর্বের দিনের অনুস্মারক নোটিফিকেশন"
                enableLights(true)
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Tap action: open MainActivity directly to Vaishnav Calendar
        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("open_tool", "vaishnavCalendar")
            putExtra("event_date", eventDate)
        }

        val requestCode = if (eventDate.isNotBlank()) eventDate.hashCode() else System.currentTimeMillis().toInt()
        val pendingIntent = PendingIntent.getActivity(
            context,
            requestCode,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notificationTitle = "হরে কৃষ্ণ 🙏"
        val notificationContent = "আগামীকাল $eventTitle — আপনি পালন করছেন তো?"
        val notificationExpanded = "হরে কৃষ্ণ! আগামীকাল $eventTitle — আপনি পালন করছেন তো?\nবৈষ্ণব ক্যালেন্ডারে তিথি, পারণ ও বিস্তারিত দেখতে ট্যাপ করুন।"

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification_bell)
            .setContentTitle(notificationTitle)
            .setContentText(notificationContent)
            .setStyle(NotificationCompat.BigTextStyle().bigText(notificationExpanded))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationId = requestCode and 0x7FFFFFFF
        notificationManager.notify(notificationId, notification)
    }
}
