package com.gyansohayota.srimotbhagavadgitabanglaenglish

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import androidx.activity.ComponentActivity
import com.bumptech.glide.Glide
import com.google.android.gms.ads.MobileAds
import android.util.Log

class SplashActivity : ComponentActivity() {

    private val logTag = "SplashActivity"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        try {
            MobileAds.initialize(this)
        } catch (e: Exception) {
            Log.e(logTag, "MobileAds initialization failed (check AdMob app id)", e)
        }

        val backgroundImageView = findViewById<ImageView>(R.id.backgroundImageView)
        val titleGlow = findViewById<View>(R.id.titleGlow)
        val titleText = findViewById<TextView>(R.id.titleText)
        val subtitleText = findViewById<TextView>(R.id.subtitleText)
        val starOne = findViewById<TextView>(R.id.starOne)
        val starTwo = findViewById<TextView>(R.id.starTwo)
        val starThree = findViewById<TextView>(R.id.starThree)

        Glide.with(this)
            .load("file:///android_asset/Image/Baground.jpg")
            .centerCrop()
            .into(backgroundImageView)

        titleGlow.animate()
            .alpha(1f)
            .setStartDelay(120L)
            .setDuration(900L)
            .start()

        titleText.animate()
            .alpha(1f)
            .translationY(0f)
            .setStartDelay(180L)
            .setDuration(720L)
            .start()

        subtitleText.animate()
            .alpha(1f)
            .translationY(0f)
            .setStartDelay(360L)
            .setDuration(760L)
            .start()

        animateStar(starOne, 0f, 26f, -18f, 150L, 1600L)
        animateStar(starTwo, 0f, -24f, 22f, 260L, 1700L)
        animateStar(starThree, 96f, 72f, -26f, 340L, 1500L)

        ObjectAnimator.ofFloat(titleGlow, View.SCALE_X, 1f, 1.18f, 1f).apply {
            duration = 2200L
            repeatCount = ObjectAnimator.INFINITE
            start()
        }

        ObjectAnimator.ofFloat(titleGlow, View.SCALE_Y, 1f, 1.18f, 1f).apply {
            duration = 2200L
            repeatCount = ObjectAnimator.INFINITE
            start()
        }

        ObjectAnimator.ofFloat(titleGlow, View.ALPHA, 0.40f, 0.82f, 0.40f).apply {
            duration = 2200L
            repeatCount = ObjectAnimator.INFINITE
            start()
        }

        Handler(Looper.getMainLooper()).postDelayed({
            startActivity(Intent(this, MainActivity::class.java))
            finish()
        }, 1500L)
    }

    private fun animateStar(view: View, startX: Float, endX: Float, endY: Float, delay: Long, duration: Long) {
        view.translationX = startX

        val alphaAnimator = ObjectAnimator.ofFloat(view, View.ALPHA, 0f, 1f, 0.35f).apply {
            startDelay = delay
            this.duration = duration
            repeatCount = ObjectAnimator.INFINITE
        }

        val moveXAnimator = ObjectAnimator.ofFloat(view, View.TRANSLATION_X, startX, endX, startX).apply {
            startDelay = delay
            this.duration = duration
            repeatCount = ObjectAnimator.INFINITE
        }

        val moveYAnimator = ObjectAnimator.ofFloat(view, View.TRANSLATION_Y, 0f, endY, 0f).apply {
            startDelay = delay
            this.duration = duration
            repeatCount = ObjectAnimator.INFINITE
        }

        val scaleAnimator = ObjectAnimator.ofFloat(view, View.SCALE_X, 0.8f, 1.25f, 0.9f).apply {
            startDelay = delay
            this.duration = duration
            repeatCount = ObjectAnimator.INFINITE
        }

        val scaleYAnimator = ObjectAnimator.ofFloat(view, View.SCALE_Y, 0.8f, 1.25f, 0.9f).apply {
            startDelay = delay
            this.duration = duration
            repeatCount = ObjectAnimator.INFINITE
        }

        AnimatorSet().apply {
            playTogether(alphaAnimator, moveXAnimator, moveYAnimator, scaleAnimator, scaleYAnimator)
            start()
        }
    }
}
