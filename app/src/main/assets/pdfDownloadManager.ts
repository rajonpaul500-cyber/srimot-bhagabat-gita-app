import { useEffect, useState } from 'react';
import {
  deleteStoredPdf,
  getAllStoredPdfSizes,
  getStoredPdf,
  saveStoredPdf
} from './pdfStorage';

declare const window: Window & {
  Android?: {
    isPdfCached?: (cacheKey: string) => boolean;
    getPdfFileSize?: (cacheKey: string) => number;
    getAllCachedPdfs?: () => string;
    getActiveDownloadStatus?: (cacheKey: string) => string;
    getPdfPageCount?: (cacheKey: string) => number;
    cancelPdfDownload?: (cacheKey: string) => void;
    deleteCachedPdf?: (cacheKey: string) => boolean;
    downloadPdfFile?: (url: string, cacheKey: string) => void;
    getCachedPdfBase64?: (cacheKey: string) => string;
  };
  onNativePdfDownloadProgress?: (key: string, percent: number, loaded: number, total: number) => void;
  onNativePdfDownloadComplete?: (key: string, urlOrBase64: string, fileSize?: number) => void;
  onNativePdfDownloadError?: (key: string, error: string) => void;
  onNativePdfDownloadCancelled?: (key: string) => void;
};

export interface PdfDownloadProgress {
  status: 'downloading' | 'error';
  percent: number;
  loaded: number;
  total: number;
  error?: string;
}

export interface PdfDownloadSnapshot {
  /** Map of sanitized cacheKey -> file size in bytes */
  cachedSizes: Record<string, number>;
  /** Map of sanitized cacheKey -> active download/error state */
  downloads: Record<string, PdfDownloadProgress>;
}

export function sanitizeCacheKey(cacheKey: string): string {
  return cacheKey.replace(/[^a-zA-Z0-9._-]/g, '');
}

export function getChapterCacheKey(subjectId: string, chapterId: string, pdfUrl: string): string {
  const driveId = pdfUrl.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/)?.[1] || 'v2';
  return `pdf_${subjectId || '1'}_${chapterId}_${driveId}`;
}

export function formatPdfBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

class PdfDownloadManager {
  private cachedSizes: Record<string, number> = {};
  private downloads: Record<string, PdfDownloadProgress> = {};
  private listeners = new Set<() => void>();
  private webAbortControllers = new Map<string, AbortController>();
  private initialized = false;

  constructor() {
    this.installNativeCallbacks();
  }

  private emit() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch {
        // ignore listener error
      }
    });
  }

  private installNativeCallbacks() {
    if (typeof window === 'undefined') return;

    window.onNativePdfDownloadProgress = (key: string, percent: number, loaded: number, total: number) => {
      const safeKey = sanitizeCacheKey(key);
      const prev = this.downloads[safeKey];
      const nextPercent = Math.min(
        100,
        Math.max(prev && prev.status === 'downloading' ? prev.percent : 0, Math.round(percent || 0))
      );
      const nextLoaded = Math.max(prev && prev.status === 'downloading' ? prev.loaded : 0, loaded || 0);
      const nextTotal = Math.max(prev && prev.status === 'downloading' ? prev.total : 0, total || 0);

      this.downloads = {
        ...this.downloads,
        [safeKey]: {
          status: 'downloading',
          percent: nextPercent,
          loaded: nextLoaded,
          total: nextTotal
        }
      };
      this.emit();
    };

    window.onNativePdfDownloadComplete = (key: string, _urlOrBase64: string, fileSize?: number) => {
      const safeKey = sanitizeCacheKey(key);
      const size =
        typeof fileSize === 'number' && fileSize > 0
          ? fileSize
          : window.Android?.getPdfFileSize?.(key) || 1024;

      const nextDownloads = { ...this.downloads };
      delete nextDownloads[safeKey];
      this.downloads = nextDownloads;

      this.cachedSizes = {
        ...this.cachedSizes,
        [safeKey]: size
      };
      this.emit();
    };

    window.onNativePdfDownloadError = (key: string, error: string) => {
      const safeKey = sanitizeCacheKey(key);
      const prev = this.downloads[safeKey];
      this.downloads = {
        ...this.downloads,
        [safeKey]: {
          status: 'error',
          percent: prev?.percent || 0,
          loaded: prev?.loaded || 0,
          total: prev?.total || 0,
          error: error || 'ডাউনলোড ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।'
        }
      };
      this.emit();
    };

    window.onNativePdfDownloadCancelled = (key: string) => {
      const safeKey = sanitizeCacheKey(key);
      if (this.downloads[safeKey]) {
        const nextDownloads = { ...this.downloads };
        delete nextDownloads[safeKey];
        this.downloads = nextDownloads;
        this.emit();
      }
    };
  }

  public async refreshCache(): Promise<void> {
    this.installNativeCallbacks();
    if (window.Android?.getAllCachedPdfs) {
      try {
        const raw = window.Android.getAllCachedPdfs();
        const parsed = JSON.parse(raw || '{}') as Record<string, number>;
        const clean: Record<string, number> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'number' && v > 500) {
            clean[sanitizeCacheKey(k)] = v;
          }
        }
        this.cachedSizes = clean;
        this.initialized = true;
        this.emit();
        return;
      } catch {
        // fall through
      }
    }

    const webMap = await getAllStoredPdfSizes();
    const cleanWeb: Record<string, number> = {};
    for (const [k, v] of Object.entries(webMap)) {
      cleanWeb[sanitizeCacheKey(k)] = v;
    }
    this.cachedSizes = cleanWeb;
    this.initialized = true;
    this.emit();
  }

  public ensureInitialized() {
    if (!this.initialized) {
      this.initialized = true;
      void this.refreshCache();
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): PdfDownloadSnapshot {
    return {
      cachedSizes: this.cachedSizes,
      downloads: this.downloads
    };
  }

  public isCached(cacheKey: string): boolean {
    const safeKey = sanitizeCacheKey(cacheKey);
    if (this.cachedSizes[safeKey] && this.cachedSizes[safeKey] > 500) {
      return true;
    }
    if (window.Android?.isPdfCached) {
      const cached = window.Android.isPdfCached(cacheKey);
      if (cached) {
        const size = window.Android.getPdfFileSize?.(cacheKey) || 1024;
        this.cachedSizes = { ...this.cachedSizes, [safeKey]: size };
        return true;
      }
    }
    return false;
  }

  public getCachedSize(cacheKey: string): number {
    const safeKey = sanitizeCacheKey(cacheKey);
    return this.cachedSizes[safeKey] || 0;
  }

  public getDownloadState(cacheKey: string): PdfDownloadProgress | undefined {
    const safeKey = sanitizeCacheKey(cacheKey);
    const local = this.downloads[safeKey];
    if (local) return local;

    if (window.Android?.getActiveDownloadStatus) {
      try {
        const status = JSON.parse(window.Android.getActiveDownloadStatus(cacheKey) || '{}');
        if (status.active) {
          const synced: PdfDownloadProgress = {
            status: 'downloading',
            percent: Math.round(status.percent || 0),
            loaded: status.loaded || 0,
            total: status.total || 0
          };
          this.downloads = { ...this.downloads, [safeKey]: synced };
          return synced;
        }
      } catch {
        // ignore
      }
    }
    return undefined;
  }

  public startDownload(pdfUrl: string, cacheKey: string): void {
    this.installNativeCallbacks();
    const safeKey = sanitizeCacheKey(cacheKey);

    if (this.isCached(cacheKey)) {
      this.emit();
      return;
    }

    const existing = this.downloads[safeKey];
    if (existing && existing.status === 'downloading') {
      return;
    }

    this.downloads = {
      ...this.downloads,
      [safeKey]: {
        status: 'downloading',
        percent: 0,
        loaded: 0,
        total: 0
      }
    };
    this.emit();

    if (window.Android?.downloadPdfFile) {
      window.Android.downloadPdfFile(pdfUrl, cacheKey);
      return;
    }

    void this.downloadInWebBrowser(pdfUrl, cacheKey);
  }

  private async downloadInWebBrowser(pdfUrl: string, cacheKey: string): Promise<void> {
    const safeKey = sanitizeCacheKey(cacheKey);
    const controller = new AbortController();
    this.webAbortControllers.set(safeKey, controller);

    try {
      const cached = await getStoredPdf(cacheKey);
      if (cached && cached.byteLength > 500) {
        const nextDownloads = { ...this.downloads };
        delete nextDownloads[safeKey];
        this.downloads = nextDownloads;
        this.cachedSizes = { ...this.cachedSizes, [safeKey]: cached.byteLength };
        this.emit();
        return;
      }

      let targetUrl = pdfUrl;
      const gdMatch = targetUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (gdMatch && gdMatch[1]) {
        targetUrl = `https://drive.google.com/uc?export=download&id=${gdMatch[1]}`;
      }

      const response = await fetch(targetUrl, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      if (!response.body) {
        const buffer = await response.arrayBuffer();
        await saveStoredPdf(cacheKey, buffer);
        const nextDownloads = { ...this.downloads };
        delete nextDownloads[safeKey];
        this.downloads = nextDownloads;
        this.cachedSizes = { ...this.cachedSizes, [safeKey]: buffer.byteLength };
        this.emit();
        return;
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      let maxPercent = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedBytes += value.length;
          const rawPercent =
            total > 0
              ? Math.min(99, Math.round((receivedBytes / total) * 100))
              : Math.min(94, Math.round(94 * (1 - Math.exp(-receivedBytes / (10 * 1024 * 1024)))));
          maxPercent = Math.max(maxPercent, rawPercent);

          this.downloads = {
            ...this.downloads,
            [safeKey]: {
              status: 'downloading',
              percent: maxPercent,
              loaded: receivedBytes,
              total
            }
          };
          this.emit();
        }
      }

      const fullBuffer = new Uint8Array(receivedBytes);
      let pos = 0;
      for (const chunk of chunks) {
        fullBuffer.set(chunk, pos);
        pos += chunk.length;
      }

      await saveStoredPdf(cacheKey, fullBuffer.buffer);
      const nextDownloads = { ...this.downloads };
      delete nextDownloads[safeKey];
      this.downloads = nextDownloads;
      this.cachedSizes = { ...this.cachedSizes, [safeKey]: receivedBytes };
      this.emit();
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        const nextDownloads = { ...this.downloads };
        delete nextDownloads[safeKey];
        this.downloads = nextDownloads;
        this.emit();
        return;
      }
      this.downloads = {
        ...this.downloads,
        [safeKey]: {
          status: 'error',
          percent: this.downloads[safeKey]?.percent || 0,
          loaded: this.downloads[safeKey]?.loaded || 0,
          total: this.downloads[safeKey]?.total || 0,
          error: err?.message || 'পিডিএফ ডাউনলোড করা সম্ভব হয়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।'
        }
      };
      this.emit();
    } finally {
      this.webAbortControllers.delete(safeKey);
    }
  }

  public cancelDownload(cacheKey: string): void {
    const safeKey = sanitizeCacheKey(cacheKey);
    if (window.Android?.cancelPdfDownload) {
      window.Android.cancelPdfDownload(cacheKey);
    }
    const ctrl = this.webAbortControllers.get(safeKey);
    if (ctrl) {
      ctrl.abort();
      this.webAbortControllers.delete(safeKey);
    }
    if (this.downloads[safeKey]) {
      const nextDownloads = { ...this.downloads };
      delete nextDownloads[safeKey];
      this.downloads = nextDownloads;
      this.emit();
    }
  }

  public async deleteDownloadedPdf(cacheKey: string): Promise<void> {
    const safeKey = sanitizeCacheKey(cacheKey);
    this.cancelDownload(cacheKey);

    if (window.Android?.deleteCachedPdf) {
      window.Android.deleteCachedPdf(cacheKey);
    }
    await deleteStoredPdf(cacheKey);

    const nextCached = { ...this.cachedSizes };
    delete nextCached[safeKey];
    this.cachedSizes = nextCached;

    const nextDownloads = { ...this.downloads };
    delete nextDownloads[safeKey];
    this.downloads = nextDownloads;

    this.emit();
  }
}

export const pdfDownloadManager = new PdfDownloadManager();

export function usePdfDownloads(): PdfDownloadSnapshot {
  const [snapshot, setSnapshot] = useState<PdfDownloadSnapshot>(() => {
    pdfDownloadManager.ensureInitialized();
    return pdfDownloadManager.getSnapshot();
  });

  useEffect(() => {
    pdfDownloadManager.ensureInitialized();
    setSnapshot(pdfDownloadManager.getSnapshot());
    return pdfDownloadManager.subscribe(() => {
      setSnapshot(pdfDownloadManager.getSnapshot());
    });
  }, []);

  return snapshot;
}
