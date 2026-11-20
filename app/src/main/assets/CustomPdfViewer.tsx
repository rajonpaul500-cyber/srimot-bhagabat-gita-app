import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Download,
  AlertTriangle,
  RefreshCw,
  Trash2,
  X,
  LayoutGrid,
  List,
  Pencil,
  NotebookText,
  Music,
  CheckCircle2,
  Plus,
  Bookmark
} from 'lucide-react';
import { getStoredPdf } from './pdfStorage';
import {
  pdfDownloadManager,
  sanitizeCacheKey,
  usePdfDownloads
} from './pdfDownloadManager';

declare const window: Window & {
  pdfjsLib?: any;
  Android?: {
    isPdfCached?: (cacheKey: string) => boolean;
    getPdfPageCount?: (cacheKey: string) => number;
    deleteCachedPdf?: (cacheKey: string) => boolean;
    downloadPdfFile?: (url: string, cacheKey: string) => void;
    getCachedPdfBase64?: (cacheKey: string) => string;
  };
};

interface PdfPageNote {
  id: string;
  page: number;
  text: string;
  createdAt: string;
}

interface CustomPdfViewerProps {
  subjectName?: string;
  title: string;
  pdfUrl: string;
  cacheKey: string;
  onBack: () => void;
  hasAudioBar?: boolean;
  isAudioPlaying?: boolean;
  audioBarNode?: React.ReactNode;
  rotation?: number;
  enhanceScan?: boolean;
  isOffline?: boolean;
  checkIsOnline?: () => boolean;
  onRequireInternetForAudio?: () => void;
}

export const CustomPdfViewer: React.FC<CustomPdfViewerProps> = ({
  subjectName,
  title,
  pdfUrl,
  cacheKey,
  onBack,
  hasAudioBar = false,
  isAudioPlaying = false,
  audioBarNode,
  rotation = 0,
  enhanceScan = false,
  isOffline = false,
  checkIsOnline,
  onRequireInternetForAudio
}) => {
  const [theme, setTheme] = useState<'day' | 'night'>('day');

  const toggleTheme = () => {
    setTheme(prev => (prev === 'day' ? 'night' : 'day'));
  };

  // Modals & UI toggles
  const [showPagePreview, setShowPagePreview] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'grid' | 'list'>('grid');
  const [showAddNoteModal, setShowAddNoteModal] = useState<boolean>(false);
  const [showNotesListModal, setShowNotesListModal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showJumpInput, setShowJumpInput] = useState<boolean>(false);
  const [showAudioBarPanel, setShowAudioBarPanel] = useState<boolean>(hasAudioBar);

  // Per-chapter page notes persisted in localStorage
  const notesStorageKey = `pdf_page_notes_${sanitizeCacheKey(cacheKey)}`;
  const [pageNotes, setPageNotes] = useState<PdfPageNote[]>([]);
  const [noteDraft, setNoteDraft] = useState<string>('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(notesStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setPageNotes(Array.isArray(parsed) ? parsed : []);
    } catch {
      setPageNotes([]);
    }
  }, [notesStorageKey]);

  const persistNotes = useCallback(
    (next: PdfPageNote[]) => {
      setPageNotes(next);
      try {
        localStorage.setItem(notesStorageKey, JSON.stringify(next));
      } catch {}
    },
    [notesStorageKey]
  );

  useEffect(() => {
    const online = checkIsOnline ? checkIsOnline() : !isOffline;
    setShowAudioBarPanel(hasAudioBar && online);
  }, [hasAudioBar, cacheKey]);

  const safeKey = sanitizeCacheKey(cacheKey);
  const { cachedSizes, downloads } = usePdfDownloads();
  const cachedFileSize = cachedSizes[safeKey] || 0;
  const activeDownload = downloads[safeKey];

  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [nativeSafeKey, setNativeSafeKey] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // PDF Document state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState<string>('1');

  // Flipbook state & page cache
  const [pageImages, setPageImages] = useState<Record<number, string>>({});
  const [thumbImages, setThumbImages] = useState<Record<number, string>>({});
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  // Touch gesture state
  const touchStartDistRef = useRef<number>(0);
  const touchStartScaleRef = useRef<number>(1.0);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);
  const hasAutoStartedRef = useRef<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeThumbRef = useRef<HTMLButtonElement | null>(null);

  // Ensure pdfjs worker is ready
  useEffect(() => {
    if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = './pdfjs/pdf.worker.min.js';
    }
  }, []);

  // Reset document state when switching to a different chapter
  useEffect(() => {
    setPdfData(null);
    setPdfDoc(null);
    setNativeSafeKey(null);
    setNumPages(0);
    setCurrentPage(1);
    setPageInput('1');
    setScale(1.0);
    setPageImages({});
    setThumbImages({});
    setLocalError(null);
    setRenderError(null);
    setShowDeleteConfirm(false);
    setShowPagePreview(false);
    setShowAddNoteModal(false);
    setShowNotesListModal(false);
    setShowJumpInput(false);
    hasAutoStartedRef.current = null;
  }, [cacheKey]);

  const openCachedDocument = useCallback(async () => {
    setLocalError(null);
    setRenderError(null);

    if (window.Android?.getPdfPageCount) {
      const count = window.Android.getPdfPageCount(cacheKey);
      if (count > 0) {
        setNativeSafeKey(safeKey);
        setNumPages(count);
        setCurrentPage(1);
        setPageInput('1');
        return true;
      }
      await pdfDownloadManager.deleteDownloadedPdf(cacheKey);
      return false;
    }

    try {
      if (window.Android?.isPdfCached?.(cacheKey)) {
        const resp = await fetch(`https://localpdf.app/${safeKey}.pdf`);
        if (resp.ok) {
          const buffer = await resp.arrayBuffer();
          if (buffer.byteLength > 500) {
            setPdfData(buffer);
            return true;
          }
        }
      }
      const stored = await getStoredPdf(cacheKey);
      if (stored && stored.byteLength > 500) {
        setPdfData(stored);
        return true;
      }
    } catch (err: any) {
      setLocalError(err?.message || 'পিডিএফ খুলতে সমস্যা হয়েছে।');
    }
    return false;
  }, [cacheKey, safeKey]);

  useEffect(() => {
    let cancelled = false;
    const isReady = cachedFileSize > 500 || pdfDownloadManager.isCached(cacheKey);

    if (isReady) {
      if (nativeSafeKey !== safeKey && !pdfData) {
        void openCachedDocument().then(ok => {
          if (!ok && !cancelled && hasAutoStartedRef.current !== cacheKey) {
            hasAutoStartedRef.current = cacheKey;
            pdfDownloadManager.startDownload(pdfUrl, cacheKey);
          }
        });
      }
      return () => {
        cancelled = true;
      };
    }

    const currentState = pdfDownloadManager.getDownloadState(cacheKey);
    if (!currentState && hasAutoStartedRef.current !== cacheKey) {
      hasAutoStartedRef.current = cacheKey;
      pdfDownloadManager.startDownload(pdfUrl, cacheKey);
    }

    return () => {
      cancelled = true;
    };
  }, [cacheKey, safeKey, pdfUrl, cachedFileSize, nativeSafeKey, pdfData, openCachedDocument]);

  const handleRetryDownload = useCallback(() => {
    setLocalError(null);
    setRenderError(null);
    pdfDownloadManager.startDownload(pdfUrl, cacheKey);
  }, [pdfUrl, cacheKey]);

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    await pdfDownloadManager.deleteDownloadedPdf(cacheKey);
    onBack();
  };

  const isCachedReady = cachedFileSize > 500 || !!nativeSafeKey || !!pdfData;
  const isDownloading = !isCachedReady && activeDownload?.status === 'downloading';
  const downloadError =
    localError ||
    (!isCachedReady && activeDownload?.status === 'error'
      ? activeDownload.error || 'ডাউনলোড ব্যর্থ হয়েছে'
      : null);
  const downloadProgress = activeDownload?.percent || 0;
  const downloadLoadedBytes = activeDownload?.loaded || 0;
  const downloadTotalBytes = activeDownload?.total || 0;

  // Load PDF with pdf.js (web fallback)
  useEffect(() => {
    if (!pdfData || !window.pdfjsLib) return;

    let isCancelled = false;
    const loadingTask = window.pdfjsLib.getDocument({ data: pdfData });
    loadingTask.promise
      .then((doc: any) => {
        if (isCancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setPageInput('1');
        setPageImages({});
        setThumbImages({});
        setRenderError(null);
      })
      .catch((err: any) => {
        if (isCancelled) return;
        console.error('PDF parsing error:', err);
        setRenderError('পিডিএফ লোড করতে সমস্যা হয়েছে।');
      });

    return () => {
      isCancelled = true;
      try {
        loadingTask.destroy();
      } catch {}
    };
  }, [pdfData]);

  // Render a specific page to an image data URL (web fallback)
  const renderPageToDataUrl = useCallback(
    async (pageNum: number): Promise<string | null> => {
      if (!pdfDoc || pageNum < 1 || pageNum > pdfDoc.numPages) return null;
      if (pageImages[pageNum]) return pageImages[pageNum];

      try {
        const page = await pdfDoc.getPage(pageNum);
        const containerWidth = containerRef.current
          ? containerRef.current.clientWidth - 20
          : window.innerWidth - 20;

        const unscaledViewport = page.getViewport({ scale: 1 });
        const autoScale = Math.min(2.5, Math.max(1.0, containerWidth / unscaledViewport.width));
        const finalScale = autoScale * 1.5;

        const viewport = page.getViewport({ scale: finalScale });
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = viewport.width;
        offscreenCanvas.height = viewport.height;

        const ctx = offscreenCanvas.getContext('2d');
        if (!ctx) return null;

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (enhanceScan) {
          try {
            const imgData = ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
              const luma = (77 * d[i] + 150 * d[i + 1] + 29 * d[i + 2]) >> 8;
              let out = 255;
              if (luma <= 58) out = 0;
              else if (luma < 208) {
                const t = (luma - 58) / 150;
                out = Math.max(0, Math.min(255, Math.round(Math.pow(t, 1.75) * 255)));
              }
              d[i] = out;
              d[i + 1] = out;
              d[i + 2] = out;
            }
            ctx.putImageData(imgData, 0, 0);
          } catch {}
        }
        const dataUrl = offscreenCanvas.toDataURL('image/jpeg', enhanceScan ? 0.9 : 0.85);

        setPageImages(prev => {
          const next: Record<number, string> = {};
          for (const key of Object.keys(prev)) {
            const p = Number(key);
            if (Math.abs(p - pageNum) <= 3) next[p] = prev[p];
          }
          next[pageNum] = dataUrl;
          return next;
        });
        return dataUrl;
      } catch (e) {
        console.warn(`Error rendering page ${pageNum}:`, e);
        return null;
      }
    },
    [pdfDoc, pageImages, enhanceScan]
  );

  // Render thumbnails lazily in web fallback mode when preview modal opens
  useEffect(() => {
    if (!showPagePreview || nativeSafeKey || !pdfDoc || numPages <= 0) return;
    let cancelled = false;
    const renderThumbs = async () => {
      for (let p = 1; p <= numPages; p++) {
        if (cancelled) return;
        if (thumbImages[p]) continue;
        try {
          const page = await pdfDoc.getPage(p);
          const unscaled = page.getViewport({ scale: 1 });
          const thumbScale = Math.min(0.6, 220 / Math.max(1, unscaled.width));
          const viewport = page.getViewport({ scale: thumbScale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          const url = canvas.toDataURL('image/jpeg', 0.65);
          setThumbImages(prev => ({ ...prev, [p]: url }));
        } catch {
          // ignore individual thumbnail failure
        }
      }
    };
    void renderThumbs();
    return () => {
      cancelled = true;
    };
  }, [showPagePreview, nativeSafeKey, pdfDoc, numPages]);

  const getNativePageUrl = useCallback(
    (key: string, pageNum: number, isThumb = false) => {
      const width = isThumb ? (enhanceScan ? 280 : 260) : enhanceScan ? 1380 : 1150;
      const enhanceQuery = enhanceScan ? '&enhance=1' : '';
      return `https://localpdf.app/page/${key}/${pageNum}?w=${width}${enhanceQuery}`;
    },
    [enhanceScan]
  );

  // Preload adjacent pages for instant flipbook responsiveness
  useEffect(() => {
    if (nativeSafeKey && numPages > 0) {
      if (currentPage + 1 <= numPages) {
        const imgNext = new Image();
        imgNext.src = getNativePageUrl(nativeSafeKey, currentPage + 1, false);
      }
      if (currentPage - 1 >= 1) {
        const imgPrev = new Image();
        imgPrev.src = getNativePageUrl(nativeSafeKey, currentPage - 1, false);
      }
      return;
    }
    if (!pdfDoc) return;
    renderPageToDataUrl(currentPage);
    if (currentPage + 1 <= numPages) renderPageToDataUrl(currentPage + 1);
    if (currentPage - 1 >= 1) renderPageToDataUrl(currentPage - 1);
  }, [nativeSafeKey, pdfDoc, currentPage, numPages, renderPageToDataUrl, getNativePageUrl]);

  // Auto-scroll active page into view when opening Page Preview modal
  useEffect(() => {
    if (showPagePreview && activeThumbRef.current) {
      setTimeout(() => {
        activeThumbRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
    }
  }, [showPagePreview, previewMode]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Instant jump (from Page Preview grid, Notes list, or Jump Input)
  const jumpToPageDirect = useCallback(
    (targetPage: number) => {
      if (numPages <= 0) return;
      const clamped = Math.max(1, Math.min(numPages, targetPage));
      setCurrentPage(clamped);
      setPageInput(String(clamped));
      setIsFlipping(false);
      setFlipDirection(null);
      setSwipeOffset(0);
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    },
    [numPages]
  );

  // Smooth flipbook navigation with 3D page-turn animation
  const flipToPage = (newPage: number) => {
    if (newPage < 1 || newPage > numPages || newPage === currentPage || isFlipping) return;

    const dir = newPage > currentPage ? 'next' : 'prev';
    setFlipDirection(dir);
    setIsFlipping(true);

    setTimeout(() => {
      setCurrentPage(newPage);
      setIsFlipping(false);
      setFlipDirection(null);
      setSwipeOffset(0);
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }, 260);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(pageInput, 10);
    if (!isNaN(val) && val >= 1 && val <= numPages) {
      jumpToPageDirect(val);
    } else {
      setPageInput(String(currentPage));
    }
    setShowJumpInput(false);
  };

  // Notes actions
  const notesByPage = useMemo(() => {
    const map: Record<number, PdfPageNote[]> = {};
    pageNotes.forEach(n => {
      if (!map[n.page]) map[n.page] = [];
      map[n.page].push(n);
    });
    return map;
  }, [pageNotes]);

  const currentPageNotes = notesByPage[currentPage] || [];

  const handleSaveNewNote = () => {
    const trimmed = noteDraft.trim();
    if (!trimmed) return;
    const newItem: PdfPageNote = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      page: currentPage,
      text: trimmed,
      createdAt: new Date().toLocaleString('bn-BD')
    };
    persistNotes([newItem, ...pageNotes]);
    setNoteDraft('');
  };

  const handleDeleteNote = (id: string) => {
    persistNotes(pageNotes.filter(n => n.id !== id));
  };

  // Zoom controls
  const zoomIn = () => setScale(s => Math.min(2.5, parseFloat((s + 0.2).toFixed(1))));
  const zoomOut = () => setScale(s => Math.max(0.8, parseFloat((s - 0.2).toFixed(1))));
  const resetZoom = () => setScale(1.0);

  // Touch gesture handling (Pinch-to-zoom + fluid flipbook swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isSwipingRef.current = false;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
      isSwipingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchStartDistRef.current;
      const newScale = Math.min(2.5, Math.max(0.8, touchStartScaleRef.current * ratio));
      setScale(parseFloat(newScale.toFixed(1)));
    } else if (e.touches.length === 1 && isSwipingRef.current && scale <= 1.05) {
      const diffX = e.touches[0].clientX - touchStartXRef.current;
      const diffY = e.touches[0].clientY - touchStartYRef.current;
      if (Math.abs(diffX) > Math.abs(diffY)) {
        setSwipeOffset(diffX * 0.4);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isSwipingRef.current && scale <= 1.05 && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

      if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        if (deltaX < 0 && currentPage < numPages) {
          flipToPage(currentPage + 1);
        } else if (deltaX > 0 && currentPage > 1) {
          flipToPage(currentPage - 1);
        } else {
          setSwipeOffset(0);
        }
      } else {
        setSwipeOffset(0);
      }
    }
    touchStartDistRef.current = 0;
    isSwipingRef.current = false;
  };

  const isNight = theme === 'night';
  const currentImg = nativeSafeKey
    ? getNativePageUrl(nativeSafeKey, currentPage, false)
    : pageImages[currentPage];

  const pageNumbers = useMemo(
    () => Array.from({ length: numPages }, (_, i) => i + 1),
    [numPages]
  );

  return (
    <div
      className={`fixed inset-0 z-[10000] flex flex-col transition-colors duration-300 select-none ${
        isNight ? 'bg-[#0e1015] text-slate-100' : 'bg-[#e8edf3] text-slate-900'
      }`}
    >
      {/* Unified Single Top Bar (Back + Subject/Chapter + Dark/Light + Notes + Add Note + Page Grid) */}
      <header
        className={`shrink-0 px-2.5 pb-2 flex items-center justify-between gap-2 border-b shadow-sm z-30 ${
          isNight
            ? 'bg-[#14161b] border-white/10 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        style={{ paddingTop: 'calc(var(--safe-top, 0px) + 8px)' }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={onBack}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all ${
              isNight
                ? 'text-slate-100 hover:bg-white/10'
                : 'text-slate-800 hover:bg-slate-100'
            }`}
            aria-label="Back"
          >
            <ArrowLeft size={21} strokeWidth={2.4} />
          </button>

          <div className="min-w-0 flex-1">
            {subjectName && (
              <p
                className={`text-[11px] font-bold truncate leading-tight ${
                  isNight ? 'text-amber-400' : 'text-sky-700'
                }`}
              >
                {subjectName}
              </p>
            )}
            <h2
              className={`font-bold text-[14px] tracking-tight truncate leading-snug ${
                isNight ? 'text-white' : 'text-slate-900'
              }`}
            >
              {title}
            </h2>
          </div>
        </div>

        {/* Right Top Action Icons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Gita-only Music Bar Hide/Show Toggle */}
          {hasAudioBar && (
            <button
              onClick={() => {
                if (!showAudioBarPanel) {
                  const online = checkIsOnline ? checkIsOnline() : !isOffline;
                  if (!online) {
                    onRequireInternetForAudio?.();
                    return;
                  }
                }
                setShowAudioBarPanel(v => !v);
              }}
              className={`relative w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all ${
                showAudioBarPanel
                  ? isNight
                    ? 'bg-sky-500/25 text-sky-300 ring-1 ring-sky-400/40'
                    : 'bg-sky-100 text-sky-700 ring-1 ring-sky-300'
                  : isNight
                  ? 'text-slate-300 hover:bg-white/10'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title={showAudioBarPanel ? 'মিউজিক বার লুকান' : 'মিউজিক বার দেখান'}
              aria-label={showAudioBarPanel ? 'Hide Music Bar' : 'Show Music Bar'}
            >
              <Music size={18} className={isAudioPlaying ? 'animate-pulse' : ''} />
              {isAudioPlaying && !showAudioBarPanel && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-400" />
              )}
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            className={`w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all ${
              isNight
                ? 'text-amber-400 hover:bg-white/10'
                : 'text-indigo-700 hover:bg-slate-100'
            }`}
            title={isNight ? 'লাইট মোড' : 'ডার্ক মোড'}
            aria-label={isNight ? 'Light Mode' : 'Dark Mode'}
          >
            {isNight ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {/* Saved Notes List */}
          <button
            onClick={() => setShowNotesListModal(true)}
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all ${
              isNight
                ? 'text-slate-200 hover:bg-white/10'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="সংরক্ষিত নোটসমূহ"
            aria-label="Saved Notes"
          >
            <NotebookText size={18} />
            {pageNotes.length > 0 && (
              <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center leading-none">
                {pageNotes.length}
              </span>
            )}
          </button>

          {/* Add Note on Current Page */}
          <button
            onClick={() => setShowAddNoteModal(true)}
            disabled={numPages <= 0}
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 ${
              isNight
                ? 'text-slate-200 hover:bg-white/10'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            title={`পৃষ্ঠা ${currentPage}-এ নোট লিখুন`}
            aria-label="Add Note"
          >
            <Pencil size={17} />
            {currentPageNotes.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          {/* Page Grid Preview Button */}
          <button
            onClick={() => {
              if (numPages > 0) setShowPagePreview(true);
            }}
            disabled={numPages <= 0}
            className={`w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 ${
              isNight
                ? 'text-fuchsia-400 hover:bg-white/10'
                : 'text-purple-700 hover:bg-slate-100'
            }`}
            title="পৃষ্ঠা প্রিভিউ"
            aria-label="Page Preview"
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </header>

      {/* Optional Gita Shloka Audio Bar (ONLY for Gita chapters, toggled cleanly) */}
      {hasAudioBar && showAudioBarPanel && audioBarNode && (
        <div
          className={`shrink-0 px-2.5 py-2 border-b z-20 ${
            isNight
              ? 'bg-[#121620] border-white/10'
              : 'bg-sky-50/90 border-sky-200/80'
          }`}
        >
          {audioBarNode}
        </div>
      )}

      {/* Main Reading Canvas / Flipbook Area */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex-1 overflow-auto flex flex-col items-center justify-center p-2.5 relative perspective-[1200px] ${
          isNight ? 'bg-[#0e1015]' : 'bg-[#dfe6ef]'
        }`}
      >
        {/* Floating Zoom Pill (Top-Right, matching reference design) */}
        {!isDownloading && !downloadError && !renderError && numPages > 0 && (
          <div
            className={`fixed right-3 z-20 flex items-center gap-0.5 px-1.5 py-1 rounded-full shadow-lg border backdrop-blur-md ${
              isNight
                ? 'bg-[#1a1e26]/90 border-white/10 text-slate-200'
                : 'bg-white/95 border-slate-200/90 text-slate-700'
            }`}
            style={{
              top: hasAudioBar && showAudioBarPanel
                ? 'calc(var(--safe-top, 0px) + 142px)'
                : 'calc(var(--safe-top, 0px) + 72px)'
            }}
          >
            <button
              onClick={zoomOut}
              className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all ${
                isNight ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>

            <button
              onClick={resetZoom}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight transition-all active:scale-95 ${
                isNight
                  ? 'bg-[#1e2d44] text-sky-300'
                  : 'bg-sky-100 text-sky-900'
              }`}
              title="Reset Zoom"
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              onClick={zoomIn}
              className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all ${
                isNight ? 'hover:bg-white/10 text-sky-300' : 'hover:bg-slate-100 text-sky-700'
              }`}
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
          </div>
        )}

        {/* Downloading Overlay */}
        {isDownloading && (
          <div className="m-auto w-full max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
              <Download size={28} className="animate-pulse" />
            </div>

            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1">
              পিডিএফ ডাউনলোড হচ্ছে...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              মোবাইলের অফলাইন স্টোরেজে সেভ হচ্ছে। একবার সম্পূর্ণ হলে পরবর্তীতে ইন্টারনেট ছাড়াই সরাসরি পড়া যাবে।
            </p>

            {/* Monotonic Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden mb-2 shadow-inner">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-200 ease-out"
                style={{ width: `${Math.max(2, downloadProgress)}%` }}
              />
            </div>

            <div className="flex justify-center items-center text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-4">
              <span>{downloadProgress}% সম্পন্ন</span>
            </div>

            <button
              onClick={() => {
                pdfDownloadManager.cancelDownload(cacheKey);
                onBack();
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold inline-flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <X size={14} /> বাতিল করুন
            </button>
          </div>
        )}

        {/* Download / Render Error */}
        {(downloadError || renderError) && !isDownloading && (
          <div className="m-auto w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-rose-200 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={26} />
            </div>
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1">
              সমস্যা হয়েছে
            </h4>
            <p className="text-xs text-rose-600 dark:text-rose-400 mb-4 leading-relaxed">
              {downloadError || renderError}
            </p>
            <button
              onClick={handleRetryDownload}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 inline-flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> পুনরায় চেষ্টা করুন
            </button>
          </div>
        )}

        {/* Fluid 3D Flipbook Page Container */}
        {!isDownloading && !downloadError && !renderError && (
          <div
            className="my-auto relative max-w-full flex items-center justify-center transition-transform duration-200"
            style={{
              transform: `scale(${scale}) translateX(${swipeOffset}px)`
            }}
          >
            <div
              className={`relative rounded-xl overflow-hidden transition-all duration-300 ${
                isNight
                  ? 'shadow-[0_18px_50px_rgba(0,0,0,0.85)]'
                  : 'border border-slate-300/80 shadow-[0_14px_38px_rgba(15,23,42,0.18)]'
              }`}
              style={{
                filter: isNight
                  ? 'invert(0.92) hue-rotate(180deg) contrast(1.08) brightness(0.92)'
                  : 'none'
              }}
            >
              {currentImg ? (
                <div
                  className={`relative transform-gpu transition-all duration-300 origin-left ${
                    isFlipping && flipDirection === 'next'
                      ? 'animate-[flipNext_260ms_ease-in-out_forwards]'
                      : isFlipping && flipDirection === 'prev'
                      ? 'animate-[flipPrev_260ms_ease-in-out_forwards]'
                      : ''
                  }`}
                  style={{
                    boxShadow: isFlipping
                      ? 'inset -15px 0 30px rgba(0,0,0,0.25)'
                      : 'none'
                  }}
                >
                  <img
                    src={currentImg}
                    alt={`Page ${currentPage}`}
                    className="max-h-[78vh] w-auto max-w-[96vw] object-contain block mx-auto pointer-events-none"
                    style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
                  />
                </div>
              ) : (
                <div className="h-[64vh] w-[84vw] max-w-md bg-white flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RefreshCw size={24} className="animate-spin text-sky-600" />
                  <span className="text-xs font-bold text-slate-600">পৃষ্ঠা প্রস্তুত হচ্ছে...</span>
                </div>
              )}
            </div>

            {/* Quick side tap areas for fast turning */}
            <div
              onClick={() => flipToPage(currentPage - 1)}
              className="absolute left-0 top-0 bottom-0 w-14 cursor-pointer"
              title="Previous Page"
            />
            <div
              onClick={() => flipToPage(currentPage + 1)}
              className="absolute right-0 top-0 bottom-0 w-14 cursor-pointer"
              title="Next Page"
            />
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar (Matching Reference Screenshot) */}
      <footer
        className={`shrink-0 px-2.5 pt-2 flex items-center justify-between gap-1 border-t shadow-lg z-30 ${
          isNight
            ? 'bg-[#12151a] border-white/10 text-slate-200'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
        style={{ paddingBottom: 'calc(var(--safe-bottom, 0px) + 8px)' }}
      >
        {/* Left & Center Page Navigation Group */}
        <div className="flex items-center gap-1.5 flex-1 justify-center">
          <button
            onClick={() => flipToPage(1)}
            disabled={currentPage <= 1 || isFlipping}
            className={`w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all ${
              isNight ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="প্রথম পৃষ্ঠা"
            aria-label="First Page"
          >
            <ChevronsLeft size={18} />
          </button>

          <button
            onClick={() => flipToPage(currentPage - 1)}
            disabled={currentPage <= 1 || isFlipping}
            className={`w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all ${
              isNight
                ? 'bg-[#1c2331] text-sky-300 hover:bg-[#243045]'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="পূর্ববর্তী পৃষ্ঠা"
            aria-label="Previous Page"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Page Indicator Pill (tap to type page number) */}
          {showJumpInput ? (
            <form onSubmit={handlePageInputSubmit} className="flex items-center">
              <input
                autoFocus
                type="number"
                min={1}
                max={numPages || 1}
                value={pageInput}
                onChange={e => setPageInput(e.target.value)}
                onBlur={handlePageInputSubmit}
                className={`w-20 h-9 px-2 text-center font-bold text-xs rounded-full border focus:outline-none focus:ring-2 ${
                  isNight
                    ? 'bg-[#1c2029] border-sky-400 text-white focus:ring-sky-400/50'
                    : 'bg-slate-50 border-sky-500 text-slate-900 focus:ring-sky-500/40'
                }`}
              />
            </form>
          ) : (
            <button
              onClick={() => {
                if (numPages > 0) setShowJumpInput(true);
              }}
              className={`min-w-[66px] h-9 px-3 rounded-full text-xs font-bold tracking-wide flex items-center justify-center border active:scale-95 transition-all ${
                isNight
                  ? 'bg-[#1a1e27] border-white/10 text-slate-200'
                  : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
              title="পৃষ্ঠা নম্বর লিখুন"
            >
              {currentPage} / {numPages || '...'}
            </button>
          )}

          <button
            onClick={() => flipToPage(currentPage + 1)}
            disabled={currentPage >= numPages || isFlipping}
            className={`w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all ${
              isNight
                ? 'bg-[#0e3f57] text-sky-300 hover:bg-[#135372]'
                : 'bg-sky-600 text-white hover:bg-sky-700'
            }`}
            title="পরবর্তী পৃষ্ঠা"
            aria-label="Next Page"
          >
            <ChevronRight size={20} />
          </button>

          <button
            onClick={() => flipToPage(numPages)}
            disabled={currentPage >= numPages || isFlipping}
            className={`w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all ${
              isNight ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="শেষ পৃষ্ঠা"
            aria-label="Last Page"
          >
            <ChevronsRight size={18} />
          </button>
        </div>

        {/* Subtle Vertical Divider */}
        <div className={`w-px h-6 mx-0.5 ${isNight ? 'bg-white/10' : 'bg-slate-200'}`} />

        {/* Right Utility Icons (Offline Saved Check + Page Preview Grid Box) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isCachedReady && !isDownloading && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all ${
                isNight
                  ? 'text-sky-400 hover:bg-white/10'
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
              title="অফলাইনে সেভ করা আছে (ডিলিট করতে ট্যাপ করুন)"
              aria-label="Offline Status"
            >
              <CheckCircle2 size={20} />
            </button>
          )}

          <button
            onClick={() => {
              if (numPages > 0) setShowPagePreview(true);
            }}
            disabled={numPages <= 0}
            className={`w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all ${
              showPagePreview
                ? 'bg-sky-500 text-white'
                : isNight
                ? 'bg-[#1c232d] text-teal-300 hover:bg-[#263140]'
                : 'bg-slate-100 text-teal-700 hover:bg-slate-200'
            }`}
            title="পৃষ্ঠা প্রিভিউ"
            aria-label="Open Page Preview Grid"
          >
            <LayoutGrid size={19} />
          </button>
        </div>
      </footer>

      {/* Page Preview Grid / List Modal ("পৃষ্ঠা প্রিভিউ (47)") */}
      {showPagePreview && numPages > 0 && (
        <div
          className="fixed inset-0 z-[12000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowPagePreview(false)}
        >
          <div
            className={`w-full max-w-[400px] max-h-[82vh] rounded-[28px] border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${
              isNight
                ? 'bg-[#1a1d24] border-white/10 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className={`shrink-0 px-4 py-3.5 flex items-center justify-between border-b ${
                isNight ? 'border-white/10' : 'border-slate-100'
              }`}
            >
              {/* Grid / List View Switcher */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewMode('grid')}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
                    previewMode === 'grid'
                      ? isNight
                        ? 'bg-[#0e4d64] text-cyan-300 shadow-inner'
                        : 'bg-sky-600 text-white shadow-sm'
                      : isNight
                      ? 'bg-white/5 text-slate-400 hover:bg-white/10'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  aria-label="Grid View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setPreviewMode('list')}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
                    previewMode === 'list'
                      ? isNight
                        ? 'bg-[#0e4d64] text-cyan-300 shadow-inner'
                        : 'bg-sky-600 text-white shadow-sm'
                      : isNight
                      ? 'bg-white/5 text-slate-400 hover:bg-white/10'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  aria-label="List View"
                >
                  <List size={18} />
                </button>
              </div>

              <h3 className="text-[15px] font-bold tracking-tight">
                পৃষ্ঠা প্রিভিউ ({numPages})
              </h3>

              <button
                onClick={() => setShowPagePreview(false)}
                className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all ${
                  isNight ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'
                }`}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {previewMode === 'grid' ? (
                <div className="grid grid-cols-3 gap-3">
                  {pageNumbers.map(p => {
                    const isActive = p === currentPage;
                    const thumbSrc = nativeSafeKey
                      ? getNativePageUrl(nativeSafeKey, p, true)
                      : thumbImages[p];
                    const hasNote = (notesByPage[p]?.length || 0) > 0;

                    return (
                      <button
                        key={p}
                        ref={isActive ? activeThumbRef : undefined}
                        onClick={() => {
                          jumpToPageDirect(p);
                          setShowPagePreview(false);
                        }}
                        className={`relative rounded-2xl p-1.5 flex flex-col items-center transition-all active:scale-95 ${
                          isActive
                            ? isNight
                              ? 'bg-[#1c2f44] ring-2 ring-sky-400 shadow-lg'
                              : 'bg-sky-50 ring-2 ring-sky-500 shadow-md'
                            : isNight
                            ? 'bg-[#212b3a]/80 hover:bg-[#29364a] border border-white/5'
                            : 'bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80'
                        }`}
                      >
                        {hasNote && (
                          <span
                            className="absolute top-2.5 right-2.5 z-10 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow"
                            title="এই পৃষ্ঠায় নোট আছে"
                          >
                            <Bookmark size={11} className="fill-current" />
                          </span>
                        )}

                        <div
                          className="w-full aspect-[3/4] rounded-xl overflow-hidden bg-white flex items-center justify-center"
                          style={{
                            filter: isNight
                              ? 'invert(0.92) hue-rotate(180deg) contrast(1.08) brightness(0.92)'
                              : 'none'
                          }}
                        >
                          {thumbSrc ? (
                            <img
                              src={thumbSrc}
                              loading="lazy"
                              alt={`পৃষ্ঠা ${p}`}
                              className="w-full h-full object-contain"
                              style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
                            />
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400">{p}</span>
                          )}
                        </div>

                        <div className="mt-2 mb-0.5 flex items-center justify-center">
                          <span
                            className={`min-w-[26px] h-[26px] px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                              isActive
                                ? 'bg-sky-300 text-slate-950 shadow-sm'
                                : isNight
                                ? 'bg-white/5 text-slate-300'
                                : 'bg-white text-slate-700'
                            }`}
                          >
                            {p}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {pageNumbers.map(p => {
                    const isActive = p === currentPage;
                    const pNotes = notesByPage[p] || [];
                    return (
                      <button
                        key={p}
                        ref={isActive ? activeThumbRef : undefined}
                        onClick={() => {
                          jumpToPageDirect(p);
                          setShowPagePreview(false);
                        }}
                        className={`w-full px-3.5 py-3 rounded-2xl flex items-center justify-between gap-3 text-left transition-all active:scale-[0.98] ${
                          isActive
                            ? isNight
                              ? 'bg-[#1c2f44] ring-1 ring-sky-400 text-white'
                              : 'bg-sky-50 ring-1 ring-sky-500 text-sky-950'
                            : isNight
                            ? 'bg-white/5 hover:bg-white/10 text-slate-200'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${
                              isActive
                                ? 'bg-sky-400 text-slate-950'
                                : isNight
                                ? 'bg-white/10 text-slate-300'
                                : 'bg-white text-slate-700 border border-slate-200'
                            }`}
                          >
                            {p}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold">পৃষ্ঠা {p}</p>
                            {pNotes.length > 0 && (
                              <p
                                className={`text-[10px] truncate mt-0.5 ${
                                  isNight ? 'text-amber-300' : 'text-amber-700'
                                }`}
                              >
                                নোট: {pNotes[0].text}
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={16} className="opacity-50 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Note for Current Page Modal */}
      {showAddNoteModal && (
        <div
          className="fixed inset-0 z-[12000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5 animate-in fade-in duration-150"
          onClick={() => setShowAddNoteModal(false)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl animate-in zoom-in-95 duration-200 ${
              isNight
                ? 'bg-[#1a1d24] border-white/10 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-black">পৃষ্ঠা {currentPage}-এর নোট</h4>
                <p className={`text-[11px] truncate max-w-[230px] ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                  {title}
                </p>
              </div>
              <button
                onClick={() => setShowAddNoteModal(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isNight ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              placeholder="এই পৃষ্ঠার গুরুত্বপূর্ণ শ্লোক বা নোট লিখে রাখুন..."
              rows={3}
              className={`w-full rounded-2xl p-3 text-xs font-medium resize-none border focus:outline-none focus:ring-2 mb-3 ${
                isNight
                  ? 'bg-[#11141b] border-white/15 text-white placeholder-slate-500 focus:ring-sky-400/50'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-sky-500/40'
              }`}
            />

            <button
              onClick={handleSaveNewNote}
              disabled={!noteDraft.trim()}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Plus size={16} /> নোট সেভ করুন
            </button>

            {currentPageNotes.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10 space-y-2 max-h-40 overflow-y-auto">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                  এই পৃষ্ঠার সংরক্ষিত নোট ({currentPageNotes.length})
                </p>
                {currentPageNotes.map(note => (
                  <div
                    key={note.id}
                    className={`p-2.5 rounded-xl flex items-start justify-between gap-2 ${
                      isNight ? 'bg-white/5' : 'bg-slate-100'
                    }`}
                  >
                    <p className="text-xs leading-relaxed whitespace-pre-wrap flex-1">{note.text}</p>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 text-rose-400 hover:text-rose-500 shrink-0"
                      aria-label="Delete note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Saved Notes for this PDF Modal */}
      {showNotesListModal && (
        <div
          className="fixed inset-0 z-[12000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5 animate-in fade-in duration-150"
          onClick={() => setShowNotesListModal(false)}
        >
          <div
            className={`w-full max-w-sm max-h-[75vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${
              isNight
                ? 'bg-[#1a1d24] border-white/10 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div
              className={`px-5 py-3.5 flex items-center justify-between border-b ${
                isNight ? 'border-white/10' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <NotebookText size={18} className={isNight ? 'text-amber-400' : 'text-sky-600'} />
                <h4 className="text-sm font-black">সংরক্ষিত নোট ({pageNotes.length})</h4>
              </div>
              <button
                onClick={() => setShowNotesListModal(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isNight ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {pageNotes.length === 0 ? (
                <div className="py-10 text-center">
                  <Pencil size={32} className="mx-auto mb-2 opacity-30" />
                  <p className={`text-xs font-bold ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                    এখনো কোনো নোট লেখা হয়নি
                  </p>
                  <button
                    onClick={() => {
                      setShowNotesListModal(false);
                      setShowAddNoteModal(true);
                    }}
                    className="mt-3 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold active:scale-95"
                  >
                    পৃষ্ঠা {currentPage}-এ নোট লিখুন
                  </button>
                </div>
              ) : (
                pageNotes.map(note => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isNight
                        ? 'bg-white/5 border-white/10'
                        : 'bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <button
                        onClick={() => {
                          jumpToPageDirect(note.page);
                          setShowNotesListModal(false);
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          isNight
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        পৃষ্ঠা {note.page}-এ যান
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-rose-400 hover:text-rose-500"
                        aria-label="Delete note"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p
                      onClick={() => {
                        jumpToPageDirect(note.page);
                        setShowNotesListModal(false);
                      }}
                      className="text-xs leading-relaxed whitespace-pre-wrap cursor-pointer"
                    >
                      {note.text}
                    </p>
                    <p className={`text-[9px] mt-1.5 ${isNight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {note.createdAt}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Offline Saved / Delete Copy Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[12000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-5"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="text-base font-black text-slate-900 mb-1.5">
              অফলাইনে সংরক্ষিত আছে
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              “{title}” আপনার মোবাইলের স্টোরেজে সেভ আছে। চাইলে এখান থেকে মুছে ফেলতে পারেন।
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs active:scale-95"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md active:scale-95 inline-flex items-center justify-center gap-1"
              >
                <Trash2 size={14} /> ডিলিট
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
