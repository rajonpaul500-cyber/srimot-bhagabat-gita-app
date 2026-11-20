package com.gyansohayota.srimotbhagavadgitabanglaenglish

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Rect
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sin

/**
 * Native document-scan restoration pipeline for scanned Bangla book PDFs:
 * 1. Edge-connected flood-fill & vertical/horizontal bar eraser to strip black scanner margins
 *    and book-spine gutter shadows from left/right/top/bottom edges.
 * 2. Fast projection-profile auto-deskew (-6.5°..+6.5°) to straighten tilted scanned pages.
 * 3. Local background illumination normalization to flatten uneven paper lighting & shadows.
 * 4. Thresholded unsharp mask + adaptive tone curve to sharpen blurry text into crisp dark ink
 *    on pure white paper (which also inverts cleanly in Night Mode).
 * 5. Smart ink bounding-box crop & re-centering with clean uniform book margins.
 */
object PdfScanEnhancer {

    fun enhance(source: Bitmap, isThumbnail: Boolean = false): Bitmap {
        val w = source.width
        val h = source.height
        if (w < 64 || h < 64) {
            return source.copy(Bitmap.Config.ARGB_8888, false)
        }

        val pixels = IntArray(w * h)
        source.getPixels(pixels, 0, w, 0, 0, w, h)

        // Detect full-color artwork/illustration pages so we don't strip color from illustrations
        if (isColorIllustration(pixels, w, h)) {
            return enhanceColorIllustration(source, pixels, w, h)
        }

        // Convert to luminance [0..255]
        var luma = IntArray(w * h)
        for (i in pixels.indices) {
            val c = pixels[i]
            val r = (c shr 16) and 0xFF
            val g = (c shr 8) and 0xFF
            val b = c and 0xFF
            luma[i] = (77 * r + 150 * g + 29 * b) shr 8
        }

        // Stage 1: Clean edge-connected black borders / tilted scanner wedges before deskew
        cleanEdgeConnectedDarkBorders(luma, w, h)
        cleanVerticalMarginBars(luma, w, h)

        // Stage 2: Detect skew angle and straighten tilted scanned pages
        val skewDeg = detectSkewAngle(luma, w, h)
        if (abs(skewDeg) >= 0.35) {
            luma = rotateLuminanceBitmap(luma, w, h, -skewDeg.toFloat())
            // Run a post-deskew sweep now that previously tilted bars are perfectly vertical/horizontal
            cleanEdgeConnectedDarkBorders(luma, w, h)
            cleanVerticalMarginBars(luma, w, h)
            cleanHorizontalMarginBars(luma, w, h)
        } else {
            cleanHorizontalMarginBars(luma, w, h)
        }

        // Stage 3: Local background illumination normalization (flattens gray haze & spine shadows)
        normalizeLocalBackground(luma, w, h)

        // Stage 4: Unsharp mask sharpening (restores clarity to blurry scanned Bengali strokes)
        val sharpStrength = if (isThumbnail) 55 else 95
        val sharpened = applyUnsharpMask(luma, w, h, sharpStrength)

        // Stage 5: Adaptive white-point whitening & ink-darkening tone curve
        applyCrispInkCurve(sharpened)

        // Stage 6: Final clean sweep of any residual thin edge artifact left after contrast boost
        cleanResidualEdgeBars(sharpened, w, h)

        // Build crisp grayscale ARGB bitmap
        for (i in sharpened.indices) {
            val v = sharpened[i]
            pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
        }
        val enhancedFull = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        enhancedFull.setPixels(pixels, 0, w, 0, 0, w, h)

        // Stage 7: Smart auto-crop & re-center with uniform clean white book margins
        val cropped = autoCropAndCenter(enhancedFull, sharpened, w, h)
        if (cropped !== enhancedFull) {
            enhancedFull.recycle()
        }
        return cropped
    }

    private fun isColorIllustration(pixels: IntArray, w: Int, h: Int): Boolean {
        val stepX = max(4, w / 80)
        val stepY = max(4, h / 80)
        var sampled = 0
        var colorful = 0
        var y = stepY
        while (y < h - stepY) {
            val rowOff = y * w
            var x = stepX
            while (x < w - stepX) {
                val c = pixels[rowOff + x]
                val r = (c shr 16) and 0xFF
                val g = (c shr 8) and 0xFF
                val b = c and 0xFF
                val maxCh = max(r, max(g, b))
                val minCh = min(r, min(g, b))
                if (maxCh - minCh > 38) colorful++
                sampled++
                x += stepX
            }
            y += stepY
        }
        return sampled > 0 && (colorful.toFloat() / sampled.toFloat()) > 0.25f
    }

    private fun enhanceColorIllustration(source: Bitmap, pixels: IntArray, w: Int, h: Int): Bitmap {
        // Only whiten pure-black outer edge scanner bars without desaturating colorful illustrations
        val luma = IntArray(w * h)
        for (i in pixels.indices) {
            val c = pixels[i]
            luma[i] = (77 * ((c shr 16) and 0xFF) + 150 * ((c shr 8) and 0xFF) + 29 * (c and 0xFF)) shr 8
        }
        val origLuma = luma.copyOf()
        cleanEdgeConnectedDarkBorders(luma, w, h)
        for (i in pixels.indices) {
            if (luma[i] == 255 && origLuma[i] < 180) {
                pixels[i] = Color.WHITE
            }
        }
        val out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        out.setPixels(pixels, 0, w, 0, 0, w, h)
        return out
    }

    /**
     * Flood-fills dark pixels connected to the 4 outer edges (constrained to outer margin bands)
     * so solid black borders, tilted black wedges, and edge-touching scanner shadows are completely removed
     * without ever reaching interior printed text.
     */
    private fun cleanEdgeConnectedDarkBorders(luma: IntArray, w: Int, h: Int) {
        val maxLeftX = (w * 0.20f).toInt()
        val minRightX = (w * 0.80f).toInt()
        val maxTopY = (h * 0.09f).toInt()
        val minBottomY = (h * 0.91f).toInt()

        val visited = BooleanArray(w * h)
        // Ring/dynamic int queue to avoid boxed allocations
        val queue = IntArray(w * h)
        var head = 0
        var tail = 0

        fun enqueueIfDark(x: Int, y: Int, threshold: Int) {
            if (x < 0 || x >= w || y < 0 || y >= h) return
            val idx = y * w + x
            if (visited[idx]) return
            if (luma[idx] < threshold) {
                visited[idx] = true
                queue[tail++] = idx
            }
        }

        // Seed outer 2px frame around all 4 edges
        val seedEdgeThresh = 185
        for (x in 0 until w) {
            enqueueIfDark(x, 0, seedEdgeThresh)
            enqueueIfDark(x, 1, seedEdgeThresh)
            enqueueIfDark(x, h - 1, seedEdgeThresh)
            enqueueIfDark(x, h - 2, seedEdgeThresh)
        }
        for (y in 0 until h) {
            enqueueIfDark(0, y, seedEdgeThresh)
            enqueueIfDark(1, y, seedEdgeThresh)
            enqueueIfDark(w - 1, y, seedEdgeThresh)
            enqueueIfDark(w - 2, y, seedEdgeThresh)
        }

        val floodThresh = 188
        while (head < tail) {
            val idx = queue[head++]
            luma[idx] = 255
            val x = idx % w
            val y = idx / w

            val inMarginBand = x < maxLeftX || x > minRightX || y < maxTopY || y > minBottomY
            if (!inMarginBand) continue

            if (x > 0) enqueueIfDark(x - 1, y, floodThresh)
            if (x + 1 < w) enqueueIfDark(x + 1, y, floodThresh)
            if (y > 0) enqueueIfDark(x, y - 1, floodThresh)
            if (y + 1 < h) enqueueIfDark(x, y + 1, floodThresh)
        }
    }

    /**
     * Detects tall vertical black lines / scanner bars / book-spine shadows on the left (0..22%)
     * and right (78..100%) margins—even when detached from the outer edge by a thin white gap.
     * Normal Bengali text lines have white inter-line spacing and never form a continuous >=24% height dark wall.
     */
    private fun cleanVerticalMarginBars(luma: IntArray, w: Int, h: Int) {
        val yStart = (h * 0.04f).toInt()
        val yEnd = (h * 0.96f).toInt()
        val spanH = max(1, yEnd - yStart)
        val minContiguousRun = (h * 0.24f).toInt().coerceAtLeast(32)
        val maxGapAllowance = max(2, h / 450)
        val leftLimit = (w * 0.22f).toInt()
        val rightLimit = (w * 0.78f).toInt()
        val haloPad = max(3, w / 260)

        fun isColumnDarkBar(x: Int): Boolean {
            var darkCount = 0
            var veryDarkCount = 0
            var curRun = 0
            var maxRun = 0
            var gap = 0
            for (y in yStart until yEnd) {
                val v = luma[y * w + x]
                if (v < 165) {
                    darkCount++
                    if (v < 105) veryDarkCount++
                    curRun += gap + 1
                    gap = 0
                    if (curRun > maxRun) maxRun = curRun
                } else {
                    if (curRun > 0) {
                        gap++
                        if (gap > maxGapAllowance) {
                            curRun = 0
                            gap = 0
                        }
                    }
                }
            }
            return maxRun >= minContiguousRun ||
                darkCount >= (spanH * 0.56f).toInt() ||
                veryDarkCount >= (spanH * 0.45f).toInt()
        }

        // Left side scan
        var lastLeftBar = -1
        for (x in 0 until leftLimit) {
            if (isColumnDarkBar(x)) {
                lastLeftBar = x
            }
        }
        if (lastLeftBar >= 0) {
            // Extend through immediate soft shadow halo adjacent to the bar
            var cutX = lastLeftBar
            while (cutX + 1 < leftLimit && cutX < lastLeftBar + haloPad * 3) {
                var colAvg = 0L
                for (y in yStart until yEnd) colAvg += luma[y * w + (cutX + 1)]
                if ((colAvg / spanH) < 200L) cutX++ else break
            }
            val finalCut = min(w - 1, cutX + haloPad)
            for (y in 0 until h) {
                val rowOff = y * w
                for (x in 0..finalCut) {
                    luma[rowOff + x] = 255
                }
            }
        }

        // Right side scan
        var firstRightBar = -1
        for (x in (w - 1) downTo rightLimit) {
            if (isColumnDarkBar(x)) {
                firstRightBar = x
            }
        }
        if (firstRightBar >= 0) {
            var cutX = firstRightBar
            while (cutX - 1 > rightLimit && cutX > firstRightBar - haloPad * 3) {
                var colAvg = 0L
                for (y in yStart until yEnd) colAvg += luma[y * w + (cutX - 1)]
                if ((colAvg / spanH) < 200L) cutX-- else break
            }
            val finalCut = max(0, cutX - haloPad)
            for (y in 0 until h) {
                val rowOff = y * w
                for (x in finalCut until w) {
                    luma[rowOff + x] = 255
                }
            }
        }
    }

    /**
     * Detects horizontal black scanner borders on the extreme top (0..8%) and bottom (92..100%) edges.
     */
    private fun cleanHorizontalMarginBars(luma: IntArray, w: Int, h: Int) {
        val xStart = (w * 0.05f).toInt()
        val xEnd = (w * 0.95f).toInt()
        val spanW = max(1, xEnd - xStart)
        val minContiguousRun = (w * 0.42f).toInt().coerceAtLeast(48)
        val topLimit = (h * 0.08f).toInt()
        val bottomLimit = (h * 0.92f).toInt()
        val haloPad = max(2, h / 400)

        fun isRowDarkBar(y: Int): Boolean {
            val rowOff = y * w
            var darkCount = 0
            var curRun = 0
            var maxRun = 0
            for (x in xStart until xEnd) {
                if (luma[rowOff + x] < 160) {
                    darkCount++
                    curRun++
                    if (curRun > maxRun) maxRun = curRun
                } else {
                    curRun = 0
                }
            }
            return maxRun >= minContiguousRun || darkCount >= (spanW * 0.62f).toInt()
        }

        var lastTopBar = -1
        for (y in 0 until topLimit) {
            if (isRowDarkBar(y)) lastTopBar = y
        }
        if (lastTopBar >= 0) {
            val cutY = min(h - 1, lastTopBar + haloPad)
            for (y in 0..cutY) {
                val rowOff = y * w
                for (x in 0 until w) luma[rowOff + x] = 255
            }
        }

        var firstBottomBar = -1
        for (y in (h - 1) downTo bottomLimit) {
            if (isRowDarkBar(y)) firstBottomBar = y
        }
        if (firstBottomBar >= 0) {
            val cutY = max(0, firstBottomBar - haloPad)
            for (y in cutY until h) {
                val rowOff = y * w
                for (x in 0 until w) luma[rowOff + x] = 255
            }
        }
    }

    /**
     * After contrast boost, remove any remaining thin long dark line in the extreme 14% left/right edge
     * (e.g. a scanner shadow ridge that only became dark after sharpening).
     */
    private fun cleanResidualEdgeBars(luma: IntArray, w: Int, h: Int) {
        val yStart = (h * 0.05f).toInt()
        val yEnd = (h * 0.95f).toInt()
        val minRun = (h * 0.28f).toInt().coerceAtLeast(36)
        val leftMax = (w * 0.14f).toInt()
        val rightMin = (w * 0.86f).toInt()

        fun scrubSegmentInColumn(x: Int) {
            var y = yStart
            while (y < yEnd) {
                if (luma[y * w + x] < 150) {
                    val segStart = y
                    var gap = 0
                    var segEnd = y
                    y++
                    while (y < yEnd) {
                        if (luma[y * w + x] < 150) {
                            segEnd = y
                            gap = 0
                        } else {
                            gap++
                            if (gap > 3) break
                        }
                        y++
                    }
                    if (segEnd - segStart >= minRun) {
                        val wipeTop = max(0, segStart - 4)
                        val wipeBot = min(h - 1, segEnd + 4)
                        val wipeLeft = max(0, x - 2)
                        val wipeRight = min(w - 1, x + 2)
                        for (wy in wipeTop..wipeBot) {
                            val ro = wy * w
                            for (wx in wipeLeft..wipeRight) {
                                luma[ro + wx] = 255
                            }
                        }
                    }
                } else {
                    y++
                }
            }
        }

        for (x in 0 until leftMax) scrubSegmentInColumn(x)
        for (x in rightMin until w) scrubSegmentInColumn(x)
    }

    /**
     * Fast horizontal projection-profile deskew detector.
     * Bengali script has strong horizontal matra lines, making squared projection energy + row-diff
     * energy sharply peak at the exact true skew angle.
     * Returns positive angle (degrees) when lines slope downward to the right; rotate by -angle to straighten.
     */
    private fun detectSkewAngle(luma: IntArray, w: Int, h: Int): Double {
        val step = max(1, w / 340)
        val xMin = (w * 0.10f).toInt()
        val xMax = (w * 0.90f).toInt()
        val yMin = (h * 0.08f).toInt()
        val yMax = (h * 0.92f).toInt()

        // Estimate background median in interior to set adaptive ink threshold
        val hist = IntArray(256)
        var sampleTotal = 0
        run {
            var y = yMin
            while (y < yMax) {
                val ro = y * w
                var x = xMin
                while (x < xMax) {
                    hist[luma[ro + x]]++
                    sampleTotal++
                    x += step * 2
                }
                y += step * 2
            }
        }
        if (sampleTotal < 100) return 0.0

        var acc = 0
        var bgP75 = 220
        val target = (sampleTotal * 0.75).toInt()
        for (v in 0..255) {
            acc += hist[v]
            if (acc >= target) {
                bgP75 = v
                break
            }
        }
        val inkThresh = (bgP75 - 38).coerceIn(75, 195)

        // Collect sampled dark text coordinates
        val maxPoints = 16000
        val xs = FloatArray(maxPoints)
        val ys = FloatArray(maxPoints)
        var count = 0

        // First count density to pick stride so we sample evenly across the entire page
        var rawInkCount = 0
        run {
            var y = yMin
            while (y < yMax) {
                val ro = y * w
                var x = xMin
                while (x < xMax) {
                    if (luma[ro + x] < inkThresh) rawInkCount++
                    x += step
                }
                y += step
            }
        }
        if (rawInkCount < 180) return 0.0

        val keepEvery = max(1, (rawInkCount + maxPoints - 1) / maxPoints)
        var seen = 0
        val cx = w * 0.5f
        val cy = h * 0.5f
        val invStep = 1f / step.toFloat()

        var y = yMin
        while (y < yMax) {
            val ro = y * w
            var x = xMin
            while (x < xMax) {
                if (luma[ro + x] < inkThresh) {
                    if (seen % keepEvery == 0 && count < maxPoints) {
                        xs[count] = (x - cx) * invStep
                        ys[count] = (y - cy) * invStep
                        count++
                    }
                    seen++
                }
                x += step
            }
            y += step
        }
        if (count < 160) return 0.0

        val workH = (h / step) + 64
        val yOffset = workH / 2
        val rowHist = IntArray(workH)

        fun scoreAngle(angleDeg: Double): Double {
            val rad = Math.toRadians(angleDeg)
            val sinT = sin(rad).toFloat()
            val cosT = cos(rad).toFloat()
            rowHist.fill(0)
            for (i in 0 until count) {
                val ry = (ys[i] * cosT - xs[i] * sinT).roundToInt() + yOffset
                if (ry in 0 until workH) {
                    rowHist[ry]++
                }
            }
            var sumSq = 0.0
            var diffSq = 0.0
            var prev = 0
            for (r in 0 until workH) {
                val v = rowHist[r]
                sumSq += v.toDouble() * v.toDouble()
                val d = v - prev
                diffSq += d.toDouble() * d.toDouble()
                prev = v
            }
            return sumSq + 0.45 * diffSq
        }

        val zeroScore = scoreAngle(0.0)
        var bestAngle = 0.0
        var bestScore = zeroScore

        // Coarse sweep: -6.5° to +6.5° in 0.5° steps
        var deg = -6.5
        while (deg <= 6.51) {
            val s = scoreAngle(deg)
            if (s > bestScore) {
                bestScore = s
                bestAngle = deg
            }
            deg += 0.5
        }

        // Fine sweep around best coarse angle in 0.15° steps
        val fineStart = max(-7.0, bestAngle - 0.6)
        val fineEnd = min(7.0, bestAngle + 0.6)
        deg = fineStart
        while (deg <= fineEnd + 0.001) {
            val s = scoreAngle(deg)
            if (s > bestScore) {
                bestScore = s
                bestAngle = deg
            }
            deg += 0.15
        }

        // Require clear improvement over 0° so already-straight pages aren't disturbed
        return if (abs(bestAngle) >= 0.35 && bestScore > zeroScore * 1.028) {
            bestAngle
        } else {
            0.0
        }
    }

    private fun rotateLuminanceBitmap(luma: IntArray, w: Int, h: Int, degrees: Float): IntArray {
        val pixels = IntArray(w * h)
        for (i in luma.indices) {
            val v = luma[i]
            pixels[i] = (0xFF shl 24) or (v shl 16) or (v shl 8) or v
        }
        val src = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        src.setPixels(pixels, 0, w, 0, 0, w, h)

        val dst = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(dst)
        canvas.drawColor(Color.WHITE)
        val matrix = Matrix()
        matrix.postRotate(degrees, w * 0.5f, h * 0.5f)
        val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
        canvas.drawBitmap(src, matrix, paint)
        src.recycle()

        dst.getPixels(pixels, 0, w, 0, 0, w, h)
        dst.recycle()

        val out = IntArray(w * h)
        for (i in pixels.indices) {
            out[i] = pixels[i] and 0xFF
        }
        return out
    }

    /**
     * Estimates smooth local paper brightness across a coarse grid (using ~85th percentile per tile)
     * and divides each pixel by its local background brightness.
     * Eliminates yellowed scan paper, uneven lighting, and dark shadows near the book spine.
     */
    private fun normalizeLocalBackground(luma: IntArray, w: Int, h: Int) {
        val blockSize = max(16, w / 24)
        val cols = (w + blockSize - 1) / blockSize
        val rows = (h + blockSize - 1) / blockSize
        val bgGrid = FloatArray(cols * rows)
        val tileHist = IntArray(256)

        for (by in 0 until rows) {
            val y0 = by * blockSize
            val y1 = min(h, y0 + blockSize)
            for (bx in 0 until cols) {
                val x0 = bx * blockSize
                val x1 = min(w, x0 + blockSize)
                tileHist.fill(0)
                var total = 0
                var y = y0
                while (y < y1) {
                    val ro = y * w
                    var x = x0
                    while (x < x1) {
                        tileHist[luma[ro + x]]++
                        total++
                        x += 2
                    }
                    y += 2
                }
                if (total == 0) {
                    bgGrid[by * cols + bx] = 255f
                } else {
                    val p85Target = (total * 0.85f).toInt()
                    var acc = 0
                    var p85 = 255
                    for (v in 0..255) {
                        acc += tileHist[v]
                        if (acc >= p85Target) {
                            p85 = v
                            break
                        }
                    }
                    // Clamp floor so dark regions never over-amplify noise
                    bgGrid[by * cols + bx] = p85.coerceIn(135, 255).toFloat()
                }
            }
        }

        // Smooth the background grid with 2 passes of 3x3 averaging for seamless transitions
        val smoothGrid = FloatArray(cols * rows)
        repeat(2) {
            val srcG = if (it == 0) bgGrid else smoothGrid
            val dstG = if (it == 0) smoothGrid else bgGrid
            for (by in 0 until rows) {
                for (bx in 0 until cols) {
                    var sum = 0f
                    var cnt = 0
                    for (dy in -1..1) {
                        val ny = by + dy
                        if (ny < 0 || ny >= rows) continue
                        for (dx in -1..1) {
                            val nx = bx + dx
                            if (nx < 0 || nx >= cols) continue
                            sum += srcG[ny * cols + nx]
                            cnt++
                        }
                    }
                    dstG[by * cols + bx] = sum / cnt
                }
            }
        }

        // Bilinearly interpolate local background and normalize every pixel
        val halfBlock = blockSize * 0.5f
        val invBlock = 1f / blockSize.toFloat()
        for (y in 0 until h) {
            val fy = ((y - halfBlock) * invBlock).coerceIn(0f, (rows - 1).toFloat())
            val y0 = fy.toInt()
            val y1 = min(rows - 1, y0 + 1)
            val ty = fy - y0
            val ro = y * w
            val row0 = y0 * cols
            val row1 = y1 * cols

            for (x in 0 until w) {
                val fx = ((x - halfBlock) * invBlock).coerceIn(0f, (cols - 1).toFloat())
                val x0 = fx.toInt()
                val x1 = min(cols - 1, x0 + 1)
                val tx = fx - x0

                val top = bgGrid[row0 + x0] * (1f - tx) + bgGrid[row0 + x1] * tx
                val bot = bgGrid[row1 + x0] * (1f - tx) + bgGrid[row1 + x1] * tx
                val localBg = (top * (1f - ty) + bot * ty).coerceAtLeast(135f)

                val norm = ((luma[ro + x] * 255f) / localBg).toInt().coerceIn(0, 255)
                luma[ro + x] = norm
            }
        }
    }

    /**
     * Thresholded 3x3 unsharp mask: crisps blurry text strokes without adding grain to white paper.
     */
    private fun applyUnsharpMask(luma: IntArray, w: Int, h: Int, strengthPercent: Int): IntArray {
        val out = luma.copyOf()
        val threshold = 4
        for (y in 1 until h - 1) {
            val roPrev = (y - 1) * w
            val ro = y * w
            val roNext = (y + 1) * w
            for (x in 1 until w - 1) {
                val center = luma[ro + x]
                val sum =
                    luma[roPrev + x - 1] + luma[roPrev + x] + luma[roPrev + x + 1] +
                    luma[ro + x - 1] + center + luma[ro + x + 1] +
                    luma[roNext + x - 1] + luma[roNext + x] + luma[roNext + x + 1]
                val blur = sum / 9
                val diff = center - blur
                if (abs(diff) >= threshold) {
                    out[ro + x] = (center + (diff * strengthPercent) / 100).coerceIn(0, 255)
                }
            }
        }
        return out
    }

    /**
     * Maps light scan background (>= whitePoint) cleanly to pure white 255,
     * pulls faded/blurry gray ink strongly down to crisp deep black, while retaining smooth
     * anti-aliased edges so Bengali characters remain clean and readable.
     */
    private fun applyCrispInkCurve(luma: IntArray) {
        // Compute adaptive white point from histogram (usually ~210-222 after local normalization)
        val hist = IntArray(256)
        var i = 0
        while (i < luma.size) {
            hist[luma[i]]++
            i += 4
        }
        val total = (luma.size + 3) / 4
        var acc = 0
        var p65 = 240
        val t65 = (total * 0.65).toInt()
        for (v in 0..255) {
            acc += hist[v]
            if (acc >= t65) {
                p65 = v
                break
            }
        }
        val whitePoint = (p65 - 24).coerceIn(196, 220)
        val blackPoint = 58
        val span = max(1, whitePoint - blackPoint).toFloat()

        val lut = IntArray(256)
        for (v in 0..255) {
            lut[v] = when {
                v >= whitePoint -> 255
                v <= blackPoint -> 0
                else -> {
                    val t = (v - blackPoint) / span
                    // Gamma > 1 darkens mid-gray blurred ink firmly toward rich black
                    (t.pow(1.75f) * 255f).toInt().coerceIn(0, 255)
                }
            }
        }

        for (idx in luma.indices) {
            luma[idx] = lut[luma[idx]]
        }
    }

    /**
     * Finds the tight bounding box of actual printed text (ignoring isolated noise specks)
     * and centers it cleanly on a crisp white page with uniform book margins.
     */
    private fun autoCropAndCenter(src: Bitmap, luma: IntArray, w: Int, h: Int): Bitmap {
        val colInk = IntArray(w)
        val rowInk = IntArray(h)

        for (y in 0 until h) {
            val ro = y * w
            var rCount = 0
            for (x in 0 until w) {
                if (luma[ro + x] < 175) {
                    colInk[x]++
                    rCount++
                }
            }
            rowInk[y] = rCount
        }

        val minColInk = max(2, h / 420)
        val minRowInk = max(2, w / 360)

        fun hasColSupport(x: Int): Boolean {
            if (colInk[x] < minColInk) return false
            var nearby = 0
            val lo = max(0, x - 6)
            val hi = min(w - 1, x + 6)
            for (k in lo..hi) {
                if (colInk[k] >= minColInk) nearby++
            }
            return nearby >= 2
        }

        fun hasRowSupport(y: Int): Boolean {
            if (rowInk[y] < minRowInk) return false
            var nearby = 0
            val lo = max(0, y - 6)
            val hi = min(h - 1, y + 6)
            for (k in lo..hi) {
                if (rowInk[k] >= minRowInk) nearby++
            }
            return nearby >= 2
        }

        var left = 0
        while (left < w && !hasColSupport(left)) left++
        var right = w - 1
        while (right > left && !hasColSupport(right)) right--

        var top = 0
        while (top < h && !hasRowSupport(top)) top++
        var bottom = h - 1
        while (bottom > top && !hasRowSupport(bottom)) bottom--

        val contentW = right - left + 1
        val contentH = bottom - top + 1

        // Safety guard for sparse/title pages so we don't over-zoom a 1-line cover page
        if (contentW < (w * 0.34f).toInt() || contentH < (h * 0.18f).toInt()) {
            return src
        }

        // Only crop if there is meaningful excess/lopsided margin (> 4% trim)
        val padX = (contentW * 0.055f).toInt().coerceAtLeast(16)
        val padY = (contentH * 0.045f).toInt().coerceAtLeast(20)

        val outW = w
        val desiredRatio = (contentH + 2 * padY).toFloat() / (contentW + 2 * padX).toFloat()
        val outH = (outW * desiredRatio).toInt().coerceIn((w * 1.15f).toInt(), (w * 1.85f).toInt())

        val innerPadX = (outW * 0.052f).toInt()
        val innerPadY = (outH * 0.042f).toInt()
        val availW = max(1, outW - 2 * innerPadX)
        val availH = max(1, outH - 2 * innerPadY)

        val scale = min(availW.toFloat() / contentW.toFloat(), availH.toFloat() / contentH.toFloat())
        val drawW = (contentW * scale).toInt()
        val drawH = (contentH * scale).toInt()
        val dstLeft = (outW - drawW) / 2
        val dstTop = (outH - drawH) / 2

        val out = Bitmap.createBitmap(outW, outH, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(out)
        canvas.drawColor(Color.WHITE)
        val srcRect = Rect(left, top, right + 1, bottom + 1)
        val dstRect = Rect(dstLeft, dstTop, dstLeft + drawW, dstTop + drawH)
        val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
        canvas.drawBitmap(src, srcRect, dstRect, paint)
        return out
    }
}
