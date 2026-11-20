package com.gyansohayota.srimotbhagavadgitabanglaenglish

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.LruCache
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.bumptech.glide.Glide
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import com.gyansohayota.srimotbhagavadgitabanglaenglish.notifications.VaishnavReminderManager
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.appopen.AppOpenAd
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import org.json.JSONObject

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private val logTag = "WebView"
    private var interstitialAd: InterstitialAd? = null
    private var appOpenAd: AppOpenAd? = null
    private var appOpenLoadTimeMs: Long = 0L
    private var isLoadingAppOpenAd = false
    private var isShowingFullScreenAd = false
    private var hasShownInitialAppOpenAd = false
    private var isActivityResumed = false
    private var wasInBackground = false
    private var isAdsConfigured = false
    private var isAdsInitialized = false
    private var isBannerRequestedVisible = false
    private var isBannerLoaded = false
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var isOverlayDismissed = false

    // Native PdfRenderer cache (avoids loading 28MB+ PDFs into WebView JS heap / prevents renderer crashes)
    private val pdfRendererLock = Any()
    private var currentPdfKey: String? = null
    private var currentPdfPfd: ParcelFileDescriptor? = null
    private var currentPdfRenderer: PdfRenderer? = null

    private data class ActivePdfDownload(
        val cancelled: AtomicBoolean = AtomicBoolean(false),
        @Volatile var percent: Int = 0,
        @Volatile var loadedBytes: Long = 0L,
        @Volatile var totalBytes: Long = 0L
    )

    private val activePdfDownloads = ConcurrentHashMap<String, ActivePdfDownload>()

    private fun sanitizeCacheKey(cacheKey: String): String {
        return cacheKey.replace(Regex("[^a-zA-Z0-9._-]"), "")
    }

    private fun getPdfCacheDir(): File {
        val dir = File(filesDir, "pdf_cache")
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    private fun hasPdfHeader(file: File): Boolean {
        if (!file.exists() || file.length() < 5L) return false
        return try {
            FileInputStream(file).use { fis ->
                val header = ByteArray(1024)
                val read = fis.read(header)
                if (read < 5) return false
                String(header, 0, read, Charsets.ISO_8859_1).contains("%PDF-")
            }
        } catch (_: Exception) {
            false
        }
    }

    private fun verifyPdfFileReadable(file: File): Boolean {
        if (!hasPdfHeader(file) || file.length() < 500L) return false
        var pfd: ParcelFileDescriptor? = null
        var renderer: PdfRenderer? = null
        return try {
            pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
            renderer = PdfRenderer(pfd)
            renderer.pageCount > 0
        } catch (e: Exception) {
            Log.w(logTag, "PDF integrity verification failed for ${file.name}", e)
            false
        } finally {
            try { renderer?.close() } catch (_: Exception) {}
            try { pfd?.close() } catch (_: Exception) {}
        }
    }

    private fun openConnectionFollowingRedirects(
        startUrl: String,
        rangeStart: Long,
        cookies: MutableMap<String, String>
    ): HttpURLConnection {
        var currentUrl = startUrl
        var redirects = 0
        while (redirects < 10) {
            val conn = (URL(currentUrl).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                instanceFollowRedirects = false
                connectTimeout = 30000
                readTimeout = 45000
                setRequestProperty(
                    "User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                )
                setRequestProperty("Accept", "application/pdf,application/octet-stream,*/*")
                setRequestProperty("Accept-Encoding", "identity")
                if (rangeStart > 0L) {
                    setRequestProperty("Range", "bytes=$rangeStart-")
                }
                if (cookies.isNotEmpty()) {
                    setRequestProperty("Cookie", cookies.entries.joinToString("; ") { "${it.key}=${it.value}" })
                }
            }

            // Collect cookies from response
            val headerFields = conn.headerFields
            val setCookies = headerFields["Set-Cookie"] ?: headerFields["set-cookie"]
            setCookies?.forEach { rawCookie ->
                val pair = rawCookie.substringBefore(";").trim()
                val eqIdx = pair.indexOf('=')
                if (eqIdx > 0) {
                    cookies[pair.substring(0, eqIdx).trim()] = pair.substring(eqIdx + 1).trim()
                }
            }

            val code = conn.responseCode
            if (code in listOf(
                    HttpURLConnection.HTTP_MOVED_PERM,
                    HttpURLConnection.HTTP_MOVED_TEMP,
                    HttpURLConnection.HTTP_SEE_OTHER,
                    307,
                    308
                )
            ) {
                val location = conn.getHeaderField("Location")
                conn.disconnect()
                if (location.isNullOrBlank()) {
                    throw IOException("Redirect without Location header ($code)")
                }
                currentUrl = URL(URL(currentUrl), location).toString()
                redirects++
                continue
            }
            return conn
        }
        throw IOException("Too many redirects while downloading PDF")
    }

    private fun extractDriveConfirmUrl(html: String, fileId: String?): String? {
        // Parse Google Drive virus-scan confirmation form: <form id="download-form" action="...">
        val formAction = Regex("""<form[^>]*action="([^"]+)"""", RegexOption.IGNORE_CASE)
            .find(html)?.groupValues?.getOrNull(1)?.replace("&amp;", "&")
        val inputRegex = Regex("""<input[^>]*type="hidden"[^>]*>""", RegexOption.IGNORE_CASE)
        val nameRegex = Regex("""name="([^"]+)"""", RegexOption.IGNORE_CASE)
        val valueRegex = Regex("""value="([^"]*)"""", RegexOption.IGNORE_CASE)
        val params = mutableListOf<String>()
        inputRegex.findAll(html).forEach { match ->
            val tag = match.value
            val name = nameRegex.find(tag)?.groupValues?.getOrNull(1)
            val value = valueRegex.find(tag)?.groupValues?.getOrNull(1) ?: ""
            if (!name.isNullOrBlank()) {
                params.add("${URLEncoder.encode(name, "UTF-8")}=${URLEncoder.encode(value, "UTF-8")}")
            }
        }
        if (!formAction.isNullOrBlank() && params.isNotEmpty()) {
            val sep = if (formAction.contains("?")) "&" else "?"
            return "$formAction$sep${params.joinToString("&")}"
        }

        // Fallback: extract confirm/uuid tokens from links
        val uuid = Regex("""name="uuid"\s+value="([^"]+)"""").find(html)?.groupValues?.getOrNull(1)
            ?: Regex("""uuid=([a-zA-Z0-9_-]+)""").find(html)?.groupValues?.getOrNull(1)
        val confirm = Regex("""name="confirm"\s+value="([^"]+)"""").find(html)?.groupValues?.getOrNull(1)
            ?: Regex("""confirm=([a-zA-Z0-9_-]+)""").find(html)?.groupValues?.getOrNull(1)
            ?: "t"
        if (!fileId.isNullOrBlank()) {
            val base = "https://drive.usercontent.google.com/download?id=$fileId&export=download&confirm=$confirm"
            return if (!uuid.isNullOrBlank()) "$base&uuid=$uuid" else base
        }
        return null
    }

    private fun parseTotalBytesFromContentRange(contentRange: String?): Long {
        if (contentRange.isNullOrBlank()) return -1L
        val slashIdx = contentRange.lastIndexOf('/')
        if (slashIdx == -1 || slashIdx >= contentRange.length - 1) return -1L
        return contentRange.substring(slashIdx + 1).trim().toLongOrNull() ?: -1L
    }

    private fun closePdfRendererLocked() {
        try { currentPdfRenderer?.close() } catch (_: Exception) {}
        try { currentPdfPfd?.close() } catch (_: Exception) {}
        currentPdfRenderer = null
        currentPdfPfd = null
        currentPdfKey = null
    }

    private fun getOrOpenPdfRendererLocked(safeKey: String): PdfRenderer? {
        if (currentPdfKey == safeKey && currentPdfRenderer != null) {
            return currentPdfRenderer
        }
        closePdfRendererLocked()
        val file = File(File(filesDir, "pdf_cache"), "$safeKey.pdf")
        if (!file.exists() || file.length() < 500L) return null
        return try {
            val pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
            val renderer = PdfRenderer(pfd)
            currentPdfKey = safeKey
            currentPdfPfd = pfd
            currentPdfRenderer = renderer
            renderer
        } catch (e: Exception) {
            Log.e(logTag, "Failed to open PdfRenderer for $safeKey", e)
            closePdfRendererLocked()
            null
        }
    }

    private val pdfThumbCache = object : LruCache<String, ByteArray>(4 * 1024 * 1024) {
        override fun sizeOf(key: String, value: ByteArray): Int = value.size
    }

    private val pdfPageCache = object : LruCache<String, ByteArray>(10 * 1024 * 1024) {
        override fun sizeOf(key: String, value: ByteArray): Int = value.size
    }

    private fun renderPdfPageToJpeg(
        safeKey: String,
        pageOneBased: Int,
        requestedWidth: Int,
        enhanceScan: Boolean = false
    ): ByteArray? {
        val maxAllowedWidth = if (enhanceScan) 1480 else 1440
        val clampedWidth = requestedWidth.coerceIn(220, maxAllowedWidth)
        val isThumb = clampedWidth <= 360
        val cacheId = "${safeKey}_${pageOneBased}_${clampedWidth}_${if (enhanceScan) 1 else 0}"
        if (isThumb) {
            pdfThumbCache.get(cacheId)?.let { return it }
        } else {
            pdfPageCache.get(cacheId)?.let { return it }
        }
        synchronized(pdfRendererLock) {
            // Re-check cache after acquiring lock in case a parallel preload just finished this page
            if (isThumb) {
                pdfThumbCache.get(cacheId)?.let { return it }
            } else {
                pdfPageCache.get(cacheId)?.let { return it }
            }
            val renderer = getOrOpenPdfRendererLocked(safeKey) ?: return null
            if (renderer.pageCount <= 0) return null
            val pageIndex = (pageOneBased - 1).coerceIn(0, renderer.pageCount - 1)
            var page: PdfRenderer.Page? = null
            var rawBitmap: Bitmap? = null
            var outBitmap: Bitmap? = null
            return try {
                page = renderer.openPage(pageIndex)
                val targetHeight = ((clampedWidth.toFloat() / page.width.coerceAtLeast(1)) * page.height.coerceAtLeast(1))
                    .toInt()
                    .coerceIn(120, 2600)
                rawBitmap = Bitmap.createBitmap(clampedWidth, targetHeight, Bitmap.Config.ARGB_8888)
                Canvas(rawBitmap).drawColor(Color.WHITE)
                page.render(rawBitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)

                outBitmap = if (enhanceScan) {
                    try {
                        PdfScanEnhancer.enhance(rawBitmap, isThumbnail = isThumb)
                    } catch (e: Throwable) {
                        Log.w(logTag, "PdfScanEnhancer fallback to raw bitmap for page $pageOneBased", e)
                        rawBitmap
                    }
                } else {
                    rawBitmap
                }

                val baos = ByteArrayOutputStream()
                val quality = when {
                    isThumb -> if (enhanceScan) 74 else 70
                    enhanceScan -> 90
                    else -> 86
                }
                outBitmap.compress(Bitmap.CompressFormat.JPEG, quality, baos)
                val bytes = baos.toByteArray()
                if (bytes.isNotEmpty()) {
                    if (isThumb) {
                        pdfThumbCache.put(cacheId, bytes)
                    } else {
                        pdfPageCache.put(cacheId, bytes)
                    }
                }
                bytes
            } catch (e: Throwable) {
                Log.e(logTag, "Error rendering PDF page $pageOneBased of $safeKey", e)
                null
            } finally {
                try { page?.close() } catch (_: Exception) {}
                if (outBitmap != null && outBitmap !== rawBitmap) {
                    try { outBitmap.recycle() } catch (_: Exception) {}
                }
                try { rawBitmap?.recycle() } catch (_: Exception) {}
            }
        }
    }

    private fun dismissLoadingOverlay() {
        if (isOverlayDismissed) return
        isOverlayDismissed = true

        val overlay = findViewById<View>(R.id.splashOverlay) ?: return
        overlay.animate()
            .alpha(0f)
            .setDuration(400L)
            .withEndAction {
                overlay.visibility = View.GONE
            }
            .start()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        webView.setBackgroundColor(0)

        val splashOverlayBg = findViewById<ImageView>(R.id.splashOverlayBackground)
        if (splashOverlayBg != null) {
            Glide.with(this)
                .load("file:///android_asset/Image/Baground.jpg")
                .centerCrop()
                .into(splashOverlayBg)
        }

        Handler(Looper.getMainLooper()).postDelayed({
            dismissLoadingOverlay()
        }, 1500L)

        val bannerUnitId = try { getString(R.string.admob_banner_ad_unit_id) } catch (_: Exception) { "" }
        val interstitialUnitId = try { getString(R.string.admob_interstitial_ad_unit_id) } catch (_: Exception) { "" }
        val appOpenUnitId = try { getString(R.string.admob_app_open_ad_unit_id) } catch (_: Exception) { "" }

        val adsConfigured = bannerUnitId.isNotBlank() && interstitialUnitId.isNotBlank() &&
            !bannerUnitId.contains("XXXX", ignoreCase = true) && !interstitialUnitId.contains("XXXX", ignoreCase = true)
        isAdsConfigured = adsConfigured

        if (adsConfigured) {
            Thread {
                try {
                    MobileAds.initialize(applicationContext) {
                        runOnUiThread {
                            if (isFinishing || isDestroyed) return@runOnUiThread
                            isAdsInitialized = true
                            applyBannerVisibility()
                            loadInterstitial()
                            if (appOpenUnitId.isNotBlank() && !appOpenUnitId.contains("XXXX", ignoreCase = true)) {
                                loadAppOpenAd(showWhenLoaded = !hasShownInitialAppOpenAd)
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e(logTag, "MobileAds initialization failed", e)
                }
            }.start()
        } else {
            Log.w(logTag, "Ads are not configured. Skipping AdMob load.")
        }

        registerNetworkCallback()

        val isDebuggable = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        WebView.setWebContentsDebuggingEnabled(isDebuggable)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        webView.settings.allowFileAccessFromFileURLs = true
        webView.settings.allowUniversalAccessFromFileURLs = true
        webView.settings.mediaPlaybackRequiresUserGesture = false
        webView.settings.loadsImagesAutomatically = true
        webView.settings.blockNetworkImage = false
        webView.settings.useWideViewPort = true
        webView.settings.loadWithOverviewMode = true
        webView.settings.setSupportZoom(true)
        webView.settings.builtInZoomControls = false
        webView.settings.displayZoomControls = false
        webView.settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        webView.settings.cacheMode = if (isOnline()) {
            WebSettings.LOAD_DEFAULT
        } else {
            WebSettings.LOAD_CACHE_ELSE_NETWORK
        }

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.addJavascriptInterface(WebAppInterface(), "Android")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                val msg = "${consoleMessage.message()} (line ${consoleMessage.lineNumber()} of ${consoleMessage.sourceId()})"
                when (consoleMessage.messageLevel()) {
                    ConsoleMessage.MessageLevel.ERROR -> Log.e(logTag, msg)
                    ConsoleMessage.MessageLevel.WARNING -> Log.w(logTag, msg)
                    else -> Log.d(logTag, msg)
                }
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url ?: return false
                val url = uri.toString()

                // Never intercept internal app/asset schemes; let WebView handle them directly
                if (url.startsWith("file://") || url.startsWith("about:") || url.startsWith("data:") || url.startsWith("blob:")) {
                    return false
                }

                // Open Play Store / market links in external Play Store app (or browser fallback)
                if (url.startsWith("market://") || url.contains("play.google.com/store")) {
                    return try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    } catch (e: Exception) {
                        Log.e(logTag, "Failed to open Play Store url externally=$url", e)
                        false
                    }
                }

                // Common external schemes: whatsapp, tel, mailto, intent
                if (url.startsWith("https://whatsapp.com/") || url.startsWith("https://wa.me/") || url.startsWith("whatsapp://")
                    || url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("intent:")) {
                    return try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    } catch (e: Exception) {
                        Log.e(logTag, "Failed to open external url=$url", e)
                        false
                    }
                }

                // If user clicks an external link in main frame, open in browser
                if (request.isForMainFrame && !url.startsWith("file:///android_asset/")) {
                    return try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    } catch (e: Exception) {
                        Log.e(logTag, "Failed to open external browser for $url", e)
                        false
                    }
                }

                return false
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                if (url.startsWith("file://") || url.startsWith("about:") || url.startsWith("data:") || url.startsWith("blob:")) {
                    return false
                }

                if (url.startsWith("market://") || url.contains("play.google.com/store")) {
                    return try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    } catch (e: Exception) {
                        Log.e(logTag, "Failed to open Play Store url externally=$url", e)
                        false
                    }
                }

                if (url.startsWith("https://whatsapp.com/") || url.startsWith("https://wa.me/") || url.startsWith("whatsapp://")
                    || url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("intent:")) {
                    return try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    } catch (e: Exception) {
                        Log.e(logTag, "Failed to open external url=$url", e)
                        false
                    }
                }

                if (!url.startsWith("file:///android_asset/")) {
                    return try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    } catch (e: Exception) {
                        Log.e(logTag, "Failed to open external browser for $url", e)
                        false
                    }
                }

                return false
            }

            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                val url = request.url.toString()

                // Serve natively rendered PDF pages or raw files via virtual host (avoids WebView renderer OOM on 25MB+ PDFs)
                if (url.startsWith("https://localpdf.app/")) {
                    val corsHeaders = mutableMapOf(
                        "Access-Control-Allow-Origin" to "*",
                        "Access-Control-Allow-Methods" to "GET, OPTIONS",
                        "Access-Control-Allow-Headers" to "*"
                    )
                    if (request.method.equals("OPTIONS", ignoreCase = true)) {
                        return WebResourceResponse(
                            "text/plain",
                            "UTF-8",
                            200,
                            "OK",
                            corsHeaders,
                            ByteArrayInputStream(ByteArray(0))
                        )
                    }
                    try {
                        val pathPart = url.removePrefix("https://localpdf.app/").substringBefore("?")
                        if (pathPart.startsWith("page/")) {
                            // Format: https://localpdf.app/page/<safeKey>/<pageNumber>
                            val segments = pathPart.removePrefix("page/").split("/")
                            if (segments.size >= 2) {
                                val safeKey = segments[0].replace(Regex("[^a-zA-Z0-9._-]"), "")
                                val pageNum = segments[1].toIntOrNull() ?: 1
                                val reqWidth = request.url.getQueryParameter("w")?.toIntOrNull() ?: 1150
                                val enhanceScan = request.url.getQueryParameter("enhance") == "1"
                                val jpegBytes = renderPdfPageToJpeg(safeKey, pageNum, reqWidth, enhanceScan)
                                if (jpegBytes != null && jpegBytes.isNotEmpty()) {
                                    corsHeaders["Content-Length"] = jpegBytes.size.toString()
                                    corsHeaders["Cache-Control"] = "public, max-age=3600"
                                    return WebResourceResponse(
                                        "image/jpeg",
                                        null,
                                        200,
                                        "OK",
                                        corsHeaders,
                                        ByteArrayInputStream(jpegBytes)
                                    )
                                }
                            }
                            return WebResourceResponse(
                                "text/plain",
                                "UTF-8",
                                404,
                                "Not Found",
                                corsHeaders,
                                ByteArrayInputStream("Page not found".toByteArray())
                            )
                        }

                        val safeName = pathPart.replace(Regex("[^a-zA-Z0-9._-]"), "")
                        val targetFile = File(File(filesDir, "pdf_cache"), safeName)
                        if (targetFile.exists() && targetFile.length() > 0) {
                            corsHeaders["Content-Length"] = targetFile.length().toString()
                            corsHeaders["Cache-Control"] = "no-store"
                            return WebResourceResponse(
                                "application/pdf",
                                null,
                                200,
                                "OK",
                                corsHeaders,
                                FileInputStream(targetFile)
                            )
                        } else {
                            return WebResourceResponse(
                                "text/plain",
                                "UTF-8",
                                404,
                                "Not Found",
                                corsHeaders,
                                ByteArrayInputStream("PDF not found".toByteArray())
                            )
                        }
                    } catch (e: Exception) {
                        Log.e(logTag, "Error serving local PDF for $url", e)
                    }
                }

                // Intercept Google Drive downloads from WebView fetch() to eliminate 403 Forbidden error caused by "Origin: file://"
                if (url.contains("drive.google.com") || url.contains("googleusercontent.com")) {
                    try {
                        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                            requestMethod = "GET"
                            instanceFollowRedirects = true
                            connectTimeout = 15000
                            readTimeout = 60000
                            setRequestProperty(
                                "User-Agent",
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                            )
                            setRequestProperty("Accept", "*/*")
                        }
                        val responseCode = connection.responseCode
                        val inputStream = if (responseCode in 200..299) {
                            connection.inputStream
                        } else {
                            connection.errorStream ?: connection.inputStream
                        }
                        val contentType = connection.contentType ?: "application/pdf"
                        val mimeType = contentType.substringBefore(";").trim()
                        val responseHeaders = mutableMapOf<String, String>()
                        responseHeaders["Access-Control-Allow-Origin"] = "*"
                        responseHeaders["Access-Control-Allow-Methods"] = "GET, OPTIONS"
                        responseHeaders["Access-Control-Allow-Headers"] = "*"
                        connection.getHeaderField("Content-Length")?.let {
                            responseHeaders["Content-Length"] = it
                        }

                        return WebResourceResponse(
                            mimeType,
                            "UTF-8",
                            responseCode,
                            connection.responseMessage ?: "OK",
                            responseHeaders,
                            inputStream
                        )
                    } catch (e: Exception) {
                        Log.e(logTag, "Error intercepting Google Drive stream for $url", e)
                    }
                }

                if (url.startsWith("file:///android_asset/")) {
                    val path = url.removePrefix("file:///android_asset/")
                    if (!assetExists(path)) {
                        if (path.startsWith("www/") && assetExists(path.removePrefix("www/"))) {
                            try {
                                val altPath = path.removePrefix("www/")
                                val mime = getMimeType(altPath)
                                return WebResourceResponse(mime, "UTF-8", assets.open(altPath))
                            } catch (e: Exception) {
                                Log.w(logTag, "Failed to load fallback asset for $path", e)
                            }
                        } else if (!path.startsWith("www/") && assetExists("www/$path")) {
                            try {
                                val altPath = "www/$path"
                                val mime = getMimeType(altPath)
                                return WebResourceResponse(mime, "UTF-8", assets.open(altPath))
                            } catch (e: Exception) {
                                Log.w(logTag, "Failed to load fallback asset for $path", e)
                            }
                        }
                    }
                }
                return super.shouldInterceptRequest(view, request)
            }

            override fun onPageCommitVisible(view: WebView, url: String) {
                super.onPageCommitVisible(view, url)
                dismissLoadingOverlay()
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                view.postDelayed({
                    dismissLoadingOverlay()
                }, 100L)
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                Log.e(logTag, "onReceivedError: ${error.errorCode} ${error.description} url=${request.url}")
                super.onReceivedError(view, request, error)
            }

            override fun onReceivedHttpError(
                view: WebView,
                request: WebResourceRequest,
                errorResponse: WebResourceResponse
            ) {
                Log.e(logTag, "onReceivedHttpError: ${errorResponse.statusCode} ${errorResponse.reasonPhrase} url=${request.url}")
                super.onReceivedHttpError(view, request, errorResponse)
            }

            override fun onRenderProcessGone(
                view: WebView,
                detail: RenderProcessGoneDetail
            ): Boolean {
                Log.e(logTag, "WebView render process gone (didCrash=${detail.didCrash()}). Reloading gracefully.")
                view.post {
                    try {
                        view.reload()
                    } catch (e: Exception) {
                        Log.e(logTag, "Failed to reload WebView after renderer crash", e)
                    }
                }
                return true
            }
        }

        val hasBuiltWeb = assetExists("www/index.html")
        val hasDistWeb = assetExists("dist/index.html")
        if (!hasBuiltWeb && !hasDistWeb) {
            val html = """
                <!doctype html>
                <html lang=\"bn\">
                <head>
                  <meta charset=\"utf-8\" />
                  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
                  <title>Web app build missing</title>
                  <style>
                    body{font-family:sans-serif;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f0f9ff;color:#0c4a6e}
                    .card{max-width:720px;margin:24px;padding:18px;border-radius:16px;background:#ffffff;box-shadow:0 10px 30px rgba(0,0,0,.12)}
                    h2{margin:0 0 12px 0}
                    code{background:#eef2ff;padding:2px 6px;border-radius:6px}
                    .btn{display:inline-block;margin-top:12px;padding:10px 14px;border-radius:10px;background:#0369a1;color:#fff;text-decoration:none}
                  </style>
                </head>
                <body>
                  <div class=\"card\">
                    <h2>Web app build missing</h2>
                    <div>React/Vite source (TSX) WebView ?????? ?????? ???? ??, ??? UI ???? ???</div>
                    <div style=\"margin-top:10px\">Fix:</div>
                    <div style=\"margin-top:6px\">
                      1) <code>app/src/main/assets</code> ???????? ???? <code>npm install</code><br/>
                      2) ????? <code>npm run build</code><br/>
                      3) ???? ???? <code>dist</code> ????????? ?? ???? ??? ??? ???: <code>app/src/main/assets/www/</code>
                    </div>
                    <a class=\"btn\" href=\"javascript:location.reload()\">Reload</a>
                  </div>
                </body>
                </html>
            """.trimIndent()
            webView.loadDataWithBaseURL(
                "file:///android_asset/",
                html,
                "text/html",
                "utf-8",
                null
            )
        } else {
            val startUrl = if (hasBuiltWeb) {
                "file:///android_asset/www/index.html"
            } else {
                "file:///android_asset/dist/index.html"
            }
            Log.d(logTag, "Loading startUrl=$startUrl")
            webView.loadUrl(startUrl)
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                    return
                }

                webView.evaluateJavascript(
                    "window.showExitPopupFromNative && window.showExitPopupFromNative()",
                    null
                )
            }
        })

        // Request notification permission and schedule Vaishnav calendar reminders
        checkNotificationPermissionAndSchedule()
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent) {
        val openTool = intent.getStringExtra("open_tool")
        if (openTool == "vaishnavCalendar") {
            val eventDate = intent.getStringExtra("event_date") ?: ""
            webView.postDelayed({
                webView.evaluateJavascript(
                    "window.openVaishnavCalendarFromNative && window.openVaishnavCalendarFromNative('$eventDate')",
                    null
                )
            }, 800L)
        }
    }

    private fun checkNotificationPermissionAndSchedule() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    1001
                )
            } else {
                VaishnavReminderManager.scheduleAllReminders(this)
            }
        } else {
            VaishnavReminderManager.scheduleAllReminders(this)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1001) {
            VaishnavReminderManager.scheduleAllReminders(this)
        }
    }

    inner class WebAppInterface {
        @JavascriptInterface
        fun sendTestVaishnavNotification() {
            runOnUiThread {
                VaishnavReminderManager.sendTestNotification(this@MainActivity)
            }
        }

        @JavascriptInterface
        fun scheduleVaishnavReminders() {
            runOnUiThread {
                VaishnavReminderManager.scheduleAllReminders(this@MainActivity)
            }
        }

        @JavascriptInterface
        fun isPdfCached(cacheKey: String): Boolean {
            return try {
                val safeKey = sanitizeCacheKey(cacheKey)
                val targetFile = File(getPdfCacheDir(), "$safeKey.pdf")
                targetFile.exists() && targetFile.length() > 500L && hasPdfHeader(targetFile)
            } catch (_: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun getPdfFileSize(cacheKey: String): Long {
            return try {
                val safeKey = sanitizeCacheKey(cacheKey)
                val targetFile = File(getPdfCacheDir(), "$safeKey.pdf")
                if (targetFile.exists() && targetFile.length() > 500L && hasPdfHeader(targetFile)) {
                    targetFile.length()
                } else {
                    0L
                }
            } catch (_: Exception) {
                0L
            }
        }

        @JavascriptInterface
        fun getAllCachedPdfs(): String {
            return try {
                val json = JSONObject()
                val dir = getPdfCacheDir()
                dir.listFiles()?.forEach { file ->
                    if (file.isFile && file.name.endsWith(".pdf") && file.length() > 500L && hasPdfHeader(file)) {
                        val key = file.name.removeSuffix(".pdf")
                        json.put(key, file.length())
                    }
                }
                json.toString()
            } catch (e: Exception) {
                Log.e(logTag, "Failed to list cached PDFs", e)
                "{}"
            }
        }

        @JavascriptInterface
        fun getActiveDownloadStatus(cacheKey: String): String {
            return try {
                val safeKey = sanitizeCacheKey(cacheKey)
                val active = activePdfDownloads[safeKey]
                val json = JSONObject()
                if (active != null && !active.cancelled.get()) {
                    json.put("active", true)
                    json.put("percent", active.percent)
                    json.put("loaded", active.loadedBytes)
                    json.put("total", active.totalBytes)
                } else {
                    json.put("active", false)
                }
                json.toString()
            } catch (_: Exception) {
                "{\"active\":false}"
            }
        }

        @JavascriptInterface
        fun getPdfPageCount(cacheKey: String): Int {
            val safeKey = sanitizeCacheKey(cacheKey)
            return synchronized(pdfRendererLock) {
                getOrOpenPdfRendererLocked(safeKey)?.pageCount ?: 0
            }
        }

        @JavascriptInterface
        fun cancelPdfDownload(cacheKey: String) {
            val safeKey = sanitizeCacheKey(cacheKey)
            activePdfDownloads[safeKey]?.cancelled?.set(true)
            try {
                File(getPdfCacheDir(), "$safeKey.pdf.part").delete()
                File(getPdfCacheDir(), "$safeKey.pdf.tmp").delete()
            } catch (_: Exception) {}
            val keyJs = JSONObject.quote(cacheKey)
            runOnUiThread {
                webView.evaluateJavascript(
                    "window.onNativePdfDownloadCancelled && window.onNativePdfDownloadCancelled($keyJs)",
                    null
                )
            }
        }

        @JavascriptInterface
        fun deleteCachedPdf(cacheKey: String): Boolean {
            val safeKey = sanitizeCacheKey(cacheKey)
            activePdfDownloads[safeKey]?.cancelled?.set(true)
            return synchronized(pdfRendererLock) {
                if (currentPdfKey == safeKey) {
                    closePdfRendererLocked()
                }
                pdfThumbCache.evictAll()
                pdfPageCache.evictAll()
                try {
                    val dir = getPdfCacheDir()
                    val deletedMain = File(dir, "$safeKey.pdf").delete()
                    File(dir, "$safeKey.pdf.part").delete()
                    File(dir, "$safeKey.pdf.tmp").delete()
                    deletedMain
                } catch (_: Exception) {
                    false
                }
            }
        }

        @JavascriptInterface
        fun downloadPdfFile(urlStr: String, cacheKey: String) {
            val safeKey = sanitizeCacheKey(cacheKey)
            val pdfDir = getPdfCacheDir()
            val targetFile = File(pdfDir, "$safeKey.pdf")
            val keyJs = JSONObject.quote(cacheKey)

            // If already completely downloaded and valid on device storage, return immediately
            if (targetFile.exists() && targetFile.length() > 500L && hasPdfHeader(targetFile)) {
                val localUrlJs = JSONObject.quote("https://localpdf.app/$safeKey.pdf")
                val size = targetFile.length()
                runOnUiThread {
                    webView.evaluateJavascript(
                        "window.onNativePdfDownloadComplete && window.onNativePdfDownloadComplete($keyJs, $localUrlJs, $size)",
                        null
                    )
                }
                return
            }

            // Prevent duplicate concurrent downloads for the same chapter
            val newState = ActivePdfDownload()
            val existing = activePdfDownloads.putIfAbsent(safeKey, newState)
            if (existing != null) {
                val p = existing.percent
                val l = existing.loadedBytes
                val t = existing.totalBytes
                runOnUiThread {
                    webView.evaluateJavascript(
                        "window.onNativePdfDownloadProgress && window.onNativePdfDownloadProgress($keyJs, $p, $l, $t)",
                        null
                    )
                }
                return
            }

            Thread {
                val partFile = File(pdfDir, "$safeKey.pdf.part")
                val fileId = Regex("(?:id=|/file/d/)([a-zA-Z0-9_-]+)").find(urlStr)?.groupValues?.getOrNull(1)
                var currentDownloadUrl = if (!fileId.isNullOrBlank() && urlStr.contains("drive.google.com")) {
                    "https://drive.usercontent.google.com/download?id=$fileId&export=download&confirm=t"
                } else {
                    urlStr
                }

                val cookies = mutableMapOf<String, String>()
                var maxReportedPercent = 0
                var maxReportedLoaded = 0L
                var knownTotalBytes = 0L
                val maxAttempts = 4
                var lastErrorMsg = "ডাউনলোড ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ পরীক্ষা করুন।"

                fun emitProgress(rawPercent: Int, loaded: Long, total: Long, force: Boolean = false) {
                    if (newState.cancelled.get()) return
                    val safeTotal = if (total > 0L) maxOf(knownTotalBytes, total) else knownTotalBytes
                    knownTotalBytes = safeTotal
                    val clampedPercent = maxOf(maxReportedPercent, rawPercent.coerceIn(0, 100))
                    val clampedLoaded = maxOf(maxReportedLoaded, loaded)
                    val changed = clampedPercent != maxReportedPercent || clampedLoaded != maxReportedLoaded
                    if (!force && !changed) return
                    maxReportedPercent = clampedPercent
                    maxReportedLoaded = clampedLoaded
                    newState.percent = clampedPercent
                    newState.loadedBytes = clampedLoaded
                    newState.totalBytes = safeTotal
                    runOnUiThread {
                        webView.evaluateJavascript(
                            "window.onNativePdfDownloadProgress && window.onNativePdfDownloadProgress($keyJs, $clampedPercent, $clampedLoaded, $safeTotal)",
                            null
                        )
                    }
                }

                try {
                    var completed = false
                    var attempt = 0

                    while (attempt < maxAttempts && !completed && !newState.cancelled.get()) {
                        attempt++
                        var conn: HttpURLConnection? = null
                        try {
                            // Resume from valid partial download if available
                            var existingBytes = if (partFile.exists() && partFile.length() > 1024L && hasPdfHeader(partFile)) {
                                partFile.length()
                            } else {
                                if (partFile.exists()) partFile.delete()
                                0L
                            }

                            conn = openConnectionFollowingRedirects(currentDownloadUrl, existingBytes, cookies)
                            val responseCode = conn.responseCode

                            if (responseCode == 416) {
                                // Range not satisfiable - restart fresh
                                conn.disconnect()
                                if (partFile.exists()) partFile.delete()
                                existingBytes = 0L
                                continue
                            }

                            if (responseCode !in 200..299) {
                                conn.disconnect()
                                lastErrorMsg = "সার্ভার থেকে সাড়া পাওয়া যায়নি (HTTP $responseCode)"
                                if (attempt < maxAttempts && (responseCode >= 500 || responseCode == 429 || responseCode == 408)) {
                                    Thread.sleep(1500L * attempt)
                                    continue
                                }
                                break
                            }

                            val contentType = (conn.contentType ?: "").lowercase()
                            if (contentType.contains("text/html")) {
                                val htmlBody = conn.inputStream.bufferedReader().use { reader ->
                                    val sb = StringBuilder()
                                    val buf = CharArray(4096)
                                    var r: Int
                                    while (reader.read(buf).also { r = it } != -1 && sb.length < 256 * 1024) {
                                        sb.append(buf, 0, r)
                                    }
                                    sb.toString()
                                }
                                conn.disconnect()
                                val confirmUrl = extractDriveConfirmUrl(htmlBody, fileId)
                                if (!confirmUrl.isNullOrBlank() && confirmUrl != currentDownloadUrl) {
                                    currentDownloadUrl = confirmUrl
                                    // Do not burn a retry slot for Google Drive's virus scan confirmation redirect
                                    attempt = maxOf(0, attempt - 1)
                                    continue
                                } else {
                                    lastErrorMsg = "গুগল ড্রাইভ থেকে ফাইলটি পাওয়া যায়নি।"
                                    if (attempt < maxAttempts) {
                                        Thread.sleep(1200L * attempt)
                                        continue
                                    }
                                    break
                                }
                            }

                            val isPartialResume = (responseCode == HttpURLConnection.HTTP_PARTIAL && existingBytes > 0L)
                            val contentLen = conn.contentLengthLong
                            val expectedTotalBytes = if (isPartialResume) {
                                val rangeTotal = parseTotalBytesFromContentRange(conn.getHeaderField("Content-Range"))
                                if (rangeTotal > 0L) rangeTotal else if (contentLen > 0L) existingBytes + contentLen else knownTotalBytes
                            } else {
                                existingBytes = 0L
                                if (contentLen > 0L) contentLen else knownTotalBytes
                            }

                            if (expectedTotalBytes > 0L) {
                                knownTotalBytes = maxOf(knownTotalBytes, expectedTotalBytes)
                            }

                            var totalRead = existingBytes
                            var lastUpdateTime = 0L
                            var detectedHtmlInBody = false

                            conn.inputStream.use { inputStream ->
                                FileOutputStream(partFile, isPartialResume).use { outputStream ->
                                    val buffer = ByteArray(65536)
                                    var bytesRead: Int
                                    var checkedFirstChunk = isPartialResume

                                    while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                                        if (newState.cancelled.get()) break

                                        if (!checkedFirstChunk && bytesRead > 0) {
                                            checkedFirstChunk = true
                                            val headStr = String(buffer, 0, minOf(bytesRead, 512), Charsets.ISO_8859_1).trimStart()
                                            if (headStr.startsWith("<!DOCTYPE", ignoreCase = true) ||
                                                headStr.startsWith("<html", ignoreCase = true)
                                            ) {
                                                // Collect the HTML page to parse Drive confirmation URL
                                                val htmlBuf = ByteArrayOutputStream()
                                                htmlBuf.write(buffer, 0, bytesRead)
                                                var extra = 0
                                                while (htmlBuf.size() < 256 * 1024 && inputStream.read(buffer).also { extra = it } != -1) {
                                                    htmlBuf.write(buffer, 0, extra)
                                                }
                                                val confirmUrl = extractDriveConfirmUrl(htmlBuf.toString("UTF-8"), fileId)
                                                if (!confirmUrl.isNullOrBlank() && confirmUrl != currentDownloadUrl) {
                                                    currentDownloadUrl = confirmUrl
                                                    detectedHtmlInBody = true
                                                }
                                                break
                                            }
                                        }

                                        outputStream.write(buffer, 0, bytesRead)
                                        totalRead += bytesRead

                                        val now = System.currentTimeMillis()
                                        if (now - lastUpdateTime >= 140L || (knownTotalBytes > 0L && totalRead >= knownTotalBytes)) {
                                            lastUpdateTime = now
                                            val rawPercent = if (knownTotalBytes > 0L) {
                                                ((totalRead * 100L) / knownTotalBytes).toInt().coerceIn(1, 99)
                                            } else {
                                                // Smooth asymptotic monotonic progress when total bytes are unknown
                                                (94.0 * (1.0 - Math.exp(-totalRead.toDouble() / (10.0 * 1024.0 * 1024.0))))
                                                    .toInt().coerceIn(1, 94)
                                            }
                                            emitProgress(rawPercent, totalRead, knownTotalBytes)
                                        }
                                    }
                                    outputStream.flush()
                                }
                            }
                            conn.disconnect()
                            conn = null

                            if (newState.cancelled.get()) {
                                if (partFile.exists()) partFile.delete()
                                return@Thread
                            }

                            if (detectedHtmlInBody) {
                                if (partFile.exists()) partFile.delete()
                                attempt = maxOf(0, attempt - 1)
                                continue
                            }

                            // Verify complete transfer when total size is known
                            if (knownTotalBytes > 0L && totalRead < knownTotalBytes) {
                                Log.w(logTag, "PDF download truncated at $totalRead / $knownTotalBytes bytes. Resuming...")
                                lastErrorMsg = "ডাউনলোড সম্পূর্ণ হয়নি। সংযোগ স্থিতিশীল করে আবার চেষ্টা করুন।"
                                if (attempt < maxAttempts) {
                                    Thread.sleep(1000L * attempt)
                                    continue
                                }
                                break
                            }

                            // Verify the downloaded file is a readable PDF before committing to storage
                            if (!verifyPdfFileReadable(partFile)) {
                                Log.w(logTag, "Downloaded file failed PDF integrity check on attempt $attempt")
                                if (partFile.exists()) partFile.delete()
                                lastErrorMsg = "ডাউনলোডকৃত ফাইলটি সঠিক পিডিএফ নয়। পুনরায় চেষ্টা করুন।"
                                if (attempt < maxAttempts) {
                                    Thread.sleep(1200L * attempt)
                                    continue
                                }
                                break
                            }

                            if (targetFile.exists()) targetFile.delete()
                            if (!partFile.renameTo(targetFile)) {
                                partFile.copyTo(targetFile, overwrite = true)
                                partFile.delete()
                            }

                            completed = true
                            val finalSize = targetFile.length()
                            emitProgress(100, finalSize, finalSize, force = true)
                            val localUrlJs = JSONObject.quote("https://localpdf.app/$safeKey.pdf")
                            runOnUiThread {
                                webView.evaluateJavascript(
                                    "window.onNativePdfDownloadComplete && window.onNativePdfDownloadComplete($keyJs, $localUrlJs, $finalSize)",
                                    null
                                )
                            }
                        } catch (e: Exception) {
                            try { conn?.disconnect() } catch (_: Exception) {}
                            Log.w(logTag, "Native PDF download attempt $attempt/$maxAttempts failed for $urlStr: ${e.message}")
                            lastErrorMsg = "নেটওয়ার্ক সমস্যার কারণে ডাউনলোড বাধাগ্রস্ত হয়েছে। পুনরায় চেষ্টা করুন।"
                            if (attempt < maxAttempts && !newState.cancelled.get()) {
                                try { Thread.sleep(1200L * attempt) } catch (_: InterruptedException) {}
                            }
                        }
                    }

                    if (!completed && !newState.cancelled.get()) {
                        val errJs = JSONObject.quote(lastErrorMsg)
                        runOnUiThread {
                            webView.evaluateJavascript(
                                "window.onNativePdfDownloadError && window.onNativePdfDownloadError($keyJs, $errJs)",
                                null
                            )
                        }
                    }
                } finally {
                    activePdfDownloads.remove(safeKey, newState)
                }
            }.start()
        }

        @JavascriptInterface
        fun getCachedPdfBase64(cacheKey: String): String {
            return ""
        }

        @JavascriptInterface
        fun onAppReady() {
            runOnUiThread {
                dismissLoadingOverlay()
            }
        }

        @JavascriptInterface
        fun openExternalUrl(url: String) {
            runOnUiThread {
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                } catch (e: Exception) {
                    Log.e(logTag, "Failed to open external url=$url", e)
                }
            }
        }

        @JavascriptInterface
        fun isNetworkAvailable(): Boolean {
            return isOnline()
        }

        @JavascriptInterface
        fun setBannerVisible(visible: Boolean) {
            runOnUiThread {
                isBannerRequestedVisible = visible
                applyBannerVisibility()
            }
        }

        @JavascriptInterface
        fun triggerInterstitialAdWithAction(actionKey: String) {
            runOnUiThread {
                showInterstitialAndNotify(actionKey)
            }
        }

        @JavascriptInterface
        fun triggerInterstitialAd() {
            runOnUiThread {
                showInterstitialAndNotify(null)
            }
        }

        @JavascriptInterface
        fun exitApp() {
            runOnUiThread { finish() }
        }

        @JavascriptInterface
        fun openPlayStore() {
            runOnUiThread {
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.gyansohayota.srimotbhagavadgitabanglaenglish"))
                    startActivity(intent)
                } catch (e: Exception) {
                    // Fallback to browser if Play Store app is not available
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.gyansohayota.srimotbhagavadgitabanglaenglish"))
                        startActivity(intent)
                    } catch (e2: Exception) {
                        Log.e(logTag, "Failed to open Play Store", e2)
                    }
                }
            }
        }
    }

    private fun notifyInterstitialDismissedToWeb(actionKey: String?) {
        val keyJs = if (actionKey == null) "null" else JSONObject.quote(actionKey)
        webView.post {
            webView.evaluateJavascript(
                "window.onInterstitialDismissedFromNative && window.onInterstitialDismissedFromNative($keyJs)",
                null
            )
        }
    }

    private fun showInterstitialAndNotify(actionKey: String?) {
        if (!isOnline() || isShowingFullScreenAd) {
            notifyInterstitialDismissedToWeb(actionKey)
            if (isOnline() && interstitialAd == null) {
                loadInterstitial()
            }
            return
        }

        val ad = interstitialAd
        if (ad == null) {
            notifyInterstitialDismissedToWeb(actionKey)
            loadInterstitial()
            return
        }

        isShowingFullScreenAd = true
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                isShowingFullScreenAd = false
                interstitialAd = null
                loadInterstitial()
                notifyInterstitialDismissedToWeb(actionKey)
            }

            override fun onAdFailedToShowFullScreenContent(adError: AdError) {
                isShowingFullScreenAd = false
                interstitialAd = null
                loadInterstitial()
                notifyInterstitialDismissedToWeb(actionKey)
            }
        }

        ad.show(this)
    }

    private fun applyBannerVisibility() {
        if (isFinishing || isDestroyed) return
        val adContainer = findViewById<View>(R.id.adContainer) ?: return
        val adView = findViewById<AdView>(R.id.adView)
        val shouldShow = isBannerRequestedVisible && isAdsConfigured && isOnline()

        if (shouldShow) {
            adContainer.visibility = View.VISIBLE
            try {
                adView?.resume()
            } catch (_: Exception) {}
            if (!isBannerLoaded && isAdsInitialized && adView != null) {
                adView.post {
                    if (isFinishing || isDestroyed || isBannerLoaded || adContainer.visibility != View.VISIBLE) return@post
                    try {
                        isBannerLoaded = true
                        adView.loadAd(AdRequest.Builder().build())
                    } catch (e: Exception) {
                        isBannerLoaded = false
                        Log.e(logTag, "Banner ad failed to load", e)
                    }
                }
            }
        } else {
            adContainer.visibility = View.GONE
            try {
                adView?.pause()
            } catch (_: Exception) {}
        }
    }

    private fun isAppOpenAdAvailable(): Boolean {
        val ad = appOpenAd ?: return false
        val ageMs = System.currentTimeMillis() - appOpenLoadTimeMs
        return ageMs < 4L * 60L * 60L * 1000L && ad != null
    }

    private fun loadAppOpenAd(showWhenLoaded: Boolean = false) {
        if (!isOnline() || !isAdsConfigured || isFinishing || isDestroyed) return
        if (isAppOpenAdAvailable()) {
            if (showWhenLoaded) {
                showAppOpenAdIfAvailable()
            }
            return
        }
        if (isLoadingAppOpenAd) return

        val unitId = try { getString(R.string.admob_app_open_ad_unit_id) } catch (_: Exception) { "" }
        if (unitId.isBlank() || unitId.contains("XXXX", ignoreCase = true)) return

        isLoadingAppOpenAd = true
        try {
            AppOpenAd.load(
                this,
                unitId,
                AdRequest.Builder().build(),
                object : AppOpenAd.AppOpenAdLoadCallback() {
                    override fun onAdLoaded(ad: AppOpenAd) {
                        isLoadingAppOpenAd = false
                        appOpenAd = ad
                        appOpenLoadTimeMs = System.currentTimeMillis()
                        if (showWhenLoaded && !hasShownInitialAppOpenAd && isActivityResumed && !isShowingFullScreenAd) {
                            showAppOpenAdIfAvailable()
                        }
                    }

                    override fun onAdFailedToLoad(loadAdError: LoadAdError) {
                        isLoadingAppOpenAd = false
                        appOpenAd = null
                        Log.w(logTag, "AppOpenAd failed to load: ${loadAdError.message}")
                    }
                }
            )
        } catch (e: Exception) {
            isLoadingAppOpenAd = false
            appOpenAd = null
            Log.e(logTag, "AppOpenAd load exception", e)
        }
    }

    private fun showAppOpenAdIfAvailable() {
        if (isFinishing || isDestroyed || !isActivityResumed || isShowingFullScreenAd || !isOnline()) return
        if (!isAppOpenAdAvailable()) {
            loadAppOpenAd(showWhenLoaded = false)
            return
        }

        val ad = appOpenAd ?: return
        isShowingFullScreenAd = true
        hasShownInitialAppOpenAd = true
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                isShowingFullScreenAd = false
                appOpenAd = null
                loadAppOpenAd(showWhenLoaded = false)
            }

            override fun onAdFailedToShowFullScreenContent(adError: AdError) {
                isShowingFullScreenAd = false
                appOpenAd = null
                loadAppOpenAd(showWhenLoaded = false)
            }
        }
        ad.show(this)
    }

    private fun registerNetworkCallback() {
        try {
            val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val callback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    runOnUiThread {
                        notifyNetworkStateToWeb(true)
                        applyBannerVisibility()
                        if (isAdsInitialized) {
                            if (interstitialAd == null) loadInterstitial()
                            if (!isAppOpenAdAvailable()) loadAppOpenAd(showWhenLoaded = false)
                        }
                    }
                }

                override fun onLost(network: Network) {
                    runOnUiThread {
                        val stillOnline = isOnline()
                        notifyNetworkStateToWeb(stillOnline)
                        applyBannerVisibility()
                    }
                }
            }
            connectivityManager.registerDefaultNetworkCallback(callback)
            networkCallback = callback
        } catch (e: Exception) {
            Log.w(logTag, "Failed to register network callback", e)
        }
    }

    private fun notifyNetworkStateToWeb(online: Boolean) {
        if (!::webView.isInitialized || isFinishing || isDestroyed) return
        webView.post {
            try {
                webView.settings.cacheMode = if (online) {
                    WebSettings.LOAD_DEFAULT
                } else {
                    WebSettings.LOAD_CACHE_ELSE_NETWORK
                }
                webView.evaluateJavascript(
                    "window.onNativeNetworkChanged && window.onNativeNetworkChanged($online)",
                    null
                )
            } catch (_: Exception) {}
        }
    }

    private fun isOnline(): Boolean {
        return try {
            val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val network = connectivityManager.activeNetwork ?: return false
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        } catch (_: SecurityException) {
            false
        }
    }

    private fun assetExists(path: String): Boolean {
        return try {
            assets.open(path).close()
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun getMimeType(path: String): String {
        return when {
            path.endsWith(".html") -> "text/html"
            path.endsWith(".js") -> "application/javascript"
            path.endsWith(".css") -> "text/css"
            path.endsWith(".jpg") || path.endsWith(".jpeg") -> "image/jpeg"
            path.endsWith(".png") -> "image/png"
            path.endsWith(".gif") -> "image/gif"
            path.endsWith(".webp") -> "image/webp"
            path.endsWith(".woff") -> "font/woff"
            path.endsWith(".woff2") -> "font/woff2"
            path.endsWith(".ttf") -> "font/ttf"
            path.endsWith(".json") -> "application/json"
            path.endsWith(".mp3") -> "audio/mpeg"
            path.endsWith(".wav") -> "audio/wav"
            else -> "application/octet-stream"
        }
    }

    private fun loadInterstitial() {
        val unitId = try { getString(R.string.admob_interstitial_ad_unit_id) } catch (_: Exception) { "" }
        if (unitId.isBlank() || unitId.contains("XXXX", ignoreCase = true)) {
            interstitialAd = null
            return
        }

        try {
            InterstitialAd.load(
                this,
                unitId,
                AdRequest.Builder().build(),
                object : InterstitialAdLoadCallback() {
                    override fun onAdLoaded(ad: InterstitialAd) {
                        interstitialAd = ad
                    }

                    override fun onAdFailedToLoad(loadAdError: LoadAdError) {
                        interstitialAd = null
                    }
                }
            )
        } catch (e: Exception) {
            interstitialAd = null
            Log.e(logTag, "Interstitial load failed", e)
        }
    }

    override fun onResume() {
        super.onResume()
        isActivityResumed = true
        notifyNetworkStateToWeb(isOnline())
        applyBannerVisibility()
        if ((wasInBackground || !hasShownInitialAppOpenAd) && !isShowingFullScreenAd && isAppOpenAdAvailable()) {
            wasInBackground = false
            showAppOpenAdIfAvailable()
        } else if (wasInBackground) {
            wasInBackground = false
            loadAppOpenAd(showWhenLoaded = false)
        }
        try {
            if (::webView.isInitialized) webView.onResume()
        } catch (_: Exception) {}
    }

    override fun onPause() {
        isActivityResumed = false
        try {
            findViewById<AdView>(R.id.adView)?.pause()
        } catch (_: Exception) {}
        try {
            if (::webView.isInitialized) webView.onPause()
        } catch (_: Exception) {}
        super.onPause()
    }

    override fun onStop() {
        if (!isShowingFullScreenAd) {
            wasInBackground = true
        }
        super.onStop()
    }

    override fun onDestroy() {
        networkCallback?.let { cb ->
            try {
                val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
                cm.unregisterNetworkCallback(cb)
            } catch (_: Exception) {}
        }
        networkCallback = null
        synchronized(pdfRendererLock) {
            closePdfRendererLocked()
        }
        try {
            findViewById<AdView>(R.id.adView)?.destroy()
        } catch (_: Exception) {}
        (webView.parent as? ViewGroup)?.removeView(webView)
        webView.removeAllViews()
        webView.destroy()
        super.onDestroy()
    }
}