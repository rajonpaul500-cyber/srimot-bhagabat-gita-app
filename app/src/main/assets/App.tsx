
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Menu, X, ArrowLeft, Home, Search, Wrench, ChevronRight, Shield, MessageCircle, Star, LogOut, StickyNote, Timer as TimerIcon, Play, Pause, Square as SquareIcon, RotateCcw, CalendarDays, BookOpen, Save, Trash2, Plus, Mail, AlertCircle, WifiOff, FileText, Lock, Eye, Info, SkipBack, SkipForward, Music, Headphones, Bell, Download, CheckCircle2, RefreshCw, HardDrive } from 'lucide-react';
import { SUBJECTS_DATA } from './constants';
import { GITA_CHAPTER_1_TO_18_AUDIO_URLS } from './gitaChapter1To18Audio';
import { GITA_CHAPTER_11_TO_16_AUDIO_URLS } from './gitaChapter11To16Audio';
import { ViewState, Subject, Chapter, GuideMode, ToolSubView, SavedNote } from './types';
import { CustomPdfViewer } from './CustomPdfViewer';
import { GitaAudioScreen } from './GitaAudioScreen';
import { getChapterCacheKey, pdfDownloadManager, sanitizeCacheKey, usePdfDownloads } from './pdfDownloadManager';

declare global {
  interface Window {
    Android?: {
      triggerInterstitialAd?: () => void;
      triggerInterstitialAdWithAction?: (action: string) => void;
      setBannerVisible?: (visible: boolean) => void;
      isNetworkAvailable?: () => boolean;
      openExternalUrl?: (url: string) => void;
      exitApp?: () => void;
      sendTestVaishnavNotification?: () => void;
      scheduleVaishnavReminders?: () => void;
      openPlayStore?: () => void;
    };
    showExitPopupFromNative?: () => void;
    onInterstitialDismissedFromNative?: (action: string) => void;
    openVaishnavCalendarFromNative?: (dateStr?: string) => void;
    onNativeNetworkChanged?: (online: boolean) => void;
  }
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('subjects');
  const [activeTool, setActiveTool] = useState<ToolSubView>('vaishnavCalendar');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [guideMode, setGuideMode] = useState<GuideMode>('guide');
  const [isOffline, setIsOffline] = useState(() =>
    window.Android?.isNetworkAvailable ? !window.Android.isNetworkAvailable() : !navigator.onLine
  );
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [noInternetReason, setNoInternetReason] = useState<'audio' | 'pdf' | 'general' | null>(null);
  const { cachedSizes, downloads } = usePdfDownloads();
  const [deleteTarget, setDeleteTarget] = useState<{ title: string; cacheKey: string } | null>(null);
  const [pendingOpenAfterDownload, setPendingOpenAfterDownload] = useState<{
    safeKey: string;
    chapter: Chapter;
    subject: Subject;
  } | null>(null);

  const DEFAULT_PDF_AUDIO_URL = "https://res.cloudinary.com/dllggegzk/video/upload/v1774166700/1st_slock_o6jseq.wav";
  const GITA_CHAPTER_3_1_AUDIO_URLS = useMemo(
    () => [
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539739/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_1_obc7lk.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539739/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_2_qlhz7r.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539739/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_3_mawsgt.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539739/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_4_lxpins.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539741/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_5_hfaota.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539742/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_6_ksewrm.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539743/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_7_yaihyy.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539744/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_8_hkb1ae.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539746/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_9_lcu8i4.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539747/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_10_hw2mpt.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539748/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_11_v57qyz.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539749/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_12_yzbgtg.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539750/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_13_x3wwsw.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539755/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_14_by7ape.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539757/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_15_vm79vo.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539759/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_16_hhnluc.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539763/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_17_zplc08.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539764/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_18_nmnfsh.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539770/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_19_r73vg0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539774/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_20_ogooee.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539775/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_21_zljm0u.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539776/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_22_scjdoi.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539783/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_23_n2bxnu.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539788/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_24_imfoeh.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539789/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_25_iltnbp.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539789/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_26_u5ukbe.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539797/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_27_npjz7d.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539798/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_28_qscigz.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539799/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_29_mesgva.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539808/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_30_wm1mxl.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539809/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_31_vzy6iz.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539809/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_32_pk734b.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539818/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_33_n0gokw.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539820/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_34_emvu7q.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539827/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_35_ny9ibj.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539829/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_36_rkapx0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539837/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_37_lzvogy.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539837/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_38_k0e6zq.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539838/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_39_m6tqxa.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539848/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_40_z0wdz1.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539849/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_41_m7vxp9.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539852/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_42_a3bqqt.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539859/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_43_rkaz2f.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539860/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_44_hruzzy.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539876/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_45_oegwso.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774539877/%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A5%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC-_%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%9C%E0%A7%81%E0%A6%A8_%E0%A6%AC%E0%A6%BF%E0%A6%B7%E0%A6%BE0%A6%A6-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_46_tqsq0w.mp3"
    ],
    []
  );
  const GITA_CHAPTER_3_2_AUDIO_URLS = useMemo(
    () => [
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584389/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_1_kw8ttg.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584389/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_2_frl6vc.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584389/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_3_xnotmp.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584390/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_4_y2sgvx.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584390/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_5_f7cco4.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584390/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_6_duw9cg.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584390/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_7_d2lcf8.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584391/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_8_b5i0zq.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584389/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_9_zndrz4.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584389/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_10_eeqcih.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584391/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_11_lliell.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584391/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_12_e1yrs6.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584391/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_13_kmb6xl.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584391/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_14_luf776.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584392/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_15_azypjm.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584392/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_16_robw9d.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584392/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_17_psnd2c.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584392/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_18_pvngyi.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584392/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_19_jlclmz.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584393/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_20_wjrx94.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584392/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_21_fsg4fa.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584393/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_22_ir6vrc.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584399/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_23_syjcfa.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584399/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_24_ndwwvy.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584399/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_25_ahrms5.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584399/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_26_exbmic.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584399/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_27_kvtiqo.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584399/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_28_nwxqsw.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584400/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_29_jvxxho.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584400/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_30_qguii1.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584400/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_31_yjwsws.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584407/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_32_rkz41c.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584407/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_33_hpfc8o.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584407/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_34_cvoeef.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584408/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_35_twqo4u.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584408/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_36_f3v12o.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584408/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_37_y9mr7b.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584408/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_38_kuphrr.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584414/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_39_giet4c.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584414/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_40_xp2tva.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584414/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_41_nvkbtw.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584414/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_42_gwd8tb.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584415/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_43_cgrhz0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584415/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_44_cz0ssr.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584416/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_45_vprarm.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584421/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_46_tmd97u.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584421/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_47_onwsla.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584421/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_48_etvqod.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584421/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_49_fwd2et.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584422/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_50_maponq.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584422/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_51_zwb8yf.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584422/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_52_pl3omx.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584422/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_53_mesaxy.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584428/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_54_zslgwc.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584429/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_55_rgnv2e.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584429/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_56_gsj9yj.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584429/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_57_hugikb.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584429/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_58_ehlaft.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584430/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_59_tf2t4j.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584430/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_60_ksgedr.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584441/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_61_tnnpk0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584441/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_62_f186j5.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584442/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_63_t6sean.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584442/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_64_y43c4a.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584442/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_65_orodnj.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584442/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_66_fnz5m0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584442/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_67_yynx2h.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584454/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_68_teahpx.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584455/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_69_pckncm.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584455/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_70_i11z2r.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584455/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_71_p6tjir.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1774584455/%E0%A6%A6%E0%A7%8D%E0%A6%AC%E0%A6%BF%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%B8%E0%A6%BE0%A6%82%E0%A6%96%E0%A7%8D%E0%A6%AF%E0%A6%AF%E0%A7%8B%E0%A6%97_-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-_72_zlbvkn.mp3"
    ],
    []
  );
  const GITA_CHAPTER_3_3_AUDIO_URLS = useMemo(
    () => [
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147115/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9F_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__1_fu73cx.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147114/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9F_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__2_iau0oe.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147114/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9F_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__3_dzdypm.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147114/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9F_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__4_ghjsje.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147114/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__5_nv9isx.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147114/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__6_rczvlj.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147115/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9F_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__7_mminkk.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147115/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__8_j4m0lu.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147115/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__9_hvqcf9.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147117/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9F_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__10_k8cdgz.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147116/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__11_qoehkc.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147265/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__12_vrldq3.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147266/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__13_nzke8h.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147266/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__14_obsdrf.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147267/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__15_tdlcus.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147268/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__16_lhvpei.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147269/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__17_ldlwfm.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147271/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__18_eyjtxw.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147273/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__19_kali53.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147274/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__20_klglq6.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147274/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__21_kbsqu3.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147275/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__22_lcq0je.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147279/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__23_bwu4n9.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147279/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__24_glddyx.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147280/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__25_qqn6ow.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147280/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__26_zo79fu.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147324/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__27_jjetrw.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147324/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__28_jaznu6.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147325/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__29_mwwymb.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147326/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__30_qsaslp.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147327/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__31_qqtbqa.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147330/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__32_si3kev.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147333/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__33_b6yhvh.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147333/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__34_xnfmcf.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147334/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__35_ptrnix.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147334/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__36_eln3d9.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147338/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__37_cbtn4v.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147339/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__38_fqsklf.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147339/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__39_msh0af.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147341/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__40_t4uhez.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147344/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__41_hjafzo.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147344/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__42_g7qzgi.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775147345/%E0%A6%A4%E0%A7%83%E0%A6%A4%E0%A7%80%E0%A7%9f_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95__43_irilzj.mp3"
    ],
    []
  );
  const GITA_CHAPTER_3_4_AUDIO_URLS = useMemo(
    () => [
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187344/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-1_bliomx.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187343/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-2_q9imj8.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187344/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-3_ndkjmm.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187344/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-4_ijif35.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187344/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-5_dieu9m.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187344/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-6_entmi6.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187343/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-7_szli1p.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187344/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-8_uf71ms.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187344/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-9_xajcw8.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187344/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-10_ltma3p.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187345/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-11_u0oj3v.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187345/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-12_qjubss.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187345/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-13_vfcmjx.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187345/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-14_pk00in.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187345/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-15_oafno6.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187346/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-16_ck64h3.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187346/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-17_nnma2l.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187347/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-18_dsslao.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187351/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-19_boqosw.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187351/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-20_stdq2s.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187351/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-21_olplbv.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187351/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-22_rzhmxv.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187352/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-23_zooew8.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187355/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-24_skp2bk.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187355/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-25_owtwwp.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187357/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-26_kxnx8b.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187356/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-27_ovwdc9.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187356/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-28_v9w7kl.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187356/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-29_adhry7.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187362/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-30_mdxtej.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187363/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-31_fyridg.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187363/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-32_gqimp2.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187365/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-33_ahmmyg.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187369/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-34_bpjb27.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187370/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-35_ascg0v.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187370/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-36_aswjel.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187371/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-37_h7esmu.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187372/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-38_gmydnp.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187375/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-39_m7cqrm.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187376/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-40_cnq4a0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187376/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-41_gacqt5.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775187376/%E0%A6%9A%E0%A6%A4%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A5_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%AF%E0%A6%BC_-_%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-42_g21kgz.mp3"
    ],
    []
  );
  const GITA_CHAPTER_3_5_AUDIO_URLS = useMemo(
    () => [
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189474/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-1_xtf9jt.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189475/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-2_javqqi.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189475/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-3_niyfuh.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189475/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-4_xkl0g4.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189475/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-5_wjfm9b.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189476/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-6_godsan.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189475/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-7_ji0nkq.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189475/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-8_nrytmi.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189476/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-9_fzuodv.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189476/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-10_x7xlfg.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189479/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-11_cq9het.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189479/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-12_o9n6ah.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189479/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-13_xscosw.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189480/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-14_uidu0b.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189482/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-15_brydax.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189482/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-16_rvxhz2.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189483/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-17_vejlue.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189483/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-18_uf7gg8.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189484/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-19_vh1ueu.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189487/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-20_yksmwr.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189487/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-21_eqveay.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189487/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-22_ikyey5.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189488/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-23_g7kon0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189491/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-24_mattoa.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189491/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-25_s5onvp.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189492/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-26_axk7ec.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189492/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-27_hxhmly.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189496/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-28_sgcq7x.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775189497/%E0%A6%AA%E0%A6%9E%E0%A7%8D%E0%A6%9A%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_-_%E0%A6%95%E0%A6%B0%E0%A7%8D%E0%A6%AE0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A7%8D%E0%A6%AF%E0%A6%BE0%A6%B8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-29_rqyieb.mp3"
    ],
    []
  );
  const GITA_CHAPTER_3_6_AUDIO_URLS = useMemo(
    () => [
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191762/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-1_r7v5dm.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191762/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-2_tyfolp.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191762/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-3_bro0kd.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191762/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-4_qbf1xi.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191763/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-5_nsjekn.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191764/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-6_xbea9m.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191763/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-7_nerhvi.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191765/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-8_kk1hcm.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191766/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-9_vmjvhf.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191768/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-10_gbvsz2.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191769/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-11_dgme30.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191770/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-12_tnitg1.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191771/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-13_o6a9ki.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191774/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-14_pkdfhq.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191775/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-15_upbkov.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191778/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-16_ic2xha.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191779/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-17_l9vb7n.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191782/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-18_grawli.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191783/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-19_ylltr2.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191783/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-20_l69zqs.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191788/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-21_xnl0gj.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191788/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-22_coi7c5.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191789/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-23_xvx9xo.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191794/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-24_ogahpf.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191794/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-25_mhwqdi.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191795/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-26_xunlxh.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191800/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-27_vsjo3a.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191801/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-28_bifjv0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191804/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-29_ldazrv.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191805/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-30_gsuhck.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191806/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-31_g8xmeb.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191808/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-32_cfc6do.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191811/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-33_ot0pnw.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191811/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-34_pj1iqp.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191812/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-35_hssnzl.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191816/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-36_ifb48q.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191816/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-37_wedkfl.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191818/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-38_pwsaq5.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191820/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-39_pw4lfn.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191821/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-40_ntnzdk.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191823/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-41_zgvyfc.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191824/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-42_q6xpij.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191827/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-43_gmyp9f.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191828/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-44_qa6gl0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191828/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-45_cplbdj.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191832/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-46_nxgnxx.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775191833/%E0%A6%B7%E0%A6%B7%E0%A7%8D%E0%A6%A0_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-47_aw6wiv.mp3"
    ],
    []
  );
  const GITA_CHAPTER_3_7_AUDIO_URLS = useMemo(
    () => [
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193247/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-1_qgxsrk.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193247/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-2_msuerm.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193247/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-3_agerum.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193247/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-4_jiccjl.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193247/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-5_ehr8dp.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193249/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-6_m1mbkc.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193249/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-7_ofpmlt.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193249/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-8_xm7xgu.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193252/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-9_thyvek.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193253/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-10_jszubl.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193254/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-11_siato0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193256/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-12_xshcgx.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193257/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-13_wdhcqi.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193259/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-14_g2v2vp.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193260/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-15_tqdi1m.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193261/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-16_nav3jc.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193266/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-17_amrhzg.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193267/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-18_y7376k.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193268/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-19_dnenjo.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193269/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-20_yhxwxw.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193272/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-21_eiwzs5.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193273/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-22_baeoxd.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193274/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-23_m4qgoz.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193278/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-24_qo4nb4.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193279/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-25_y94rep.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193279/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-26_ikarge.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193284/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-27_i27bel.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193285/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-28_ksoj6u.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193285/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-29_ch045s.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775193286/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-30_oighrw.mp3"
    ].map((url) =>
      url.replace(
        "%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E0%A6%BE0%A6%A8",
        "%E0%A6%AC%E0%A6%BF%E0%A6%9C%E0%A7%8D%E0%A6%9E%E0%A6%BE%E0%A6%A8"
      )
    ),
    []
  );
  const GITA_CHAPTER_3_8_AUDIO_URLS = useMemo(
    () => [
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775194997/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-1_y3vu5n.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775194997/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-2_imqfbq.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775194997/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-3_qajkrr.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775194998/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-4_hi7lgj.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775194997/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-5_vdtsp5.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775194999/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-6_kpjo8y.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195000/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-7_gzgouw.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195001/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-8_bkvyyr.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195003/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-9_vx9o8c.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195004/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-10_rjyk6e.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195005/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-11_nx99u9.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195006/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-12_ijhyyo.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195008/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-13_tovqg5.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195009/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-14_oyic9k.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195011/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-15_eu8wmu.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195012/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-16_zn6a0o.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195013/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-17_puh6k8.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195015/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-18_orerro.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195017/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-19_nqps54.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195018/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-20_ktieg1.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195020/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-21_nmgfvz.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195021/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-22_todftd.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195023/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-23_odrwo6.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195024/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-24_d86mq0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195026/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-25_wbzcj1.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195027/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-26_zsevvc.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195029/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-27_vkhikm.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775195031/%E0%A6%85%E0%A6%B7%E0%A7%8D%E0%A6%9F%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%85%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B0%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A6%B9%E0%A7%8D%E0%A6%AE_%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-28_rhypjb.mp3"
    ],
    []
  );
  const GITA_CHAPTER_3_9_AUDIO_URLS = useMemo(
    () => [
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196430/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-1_ryuvwz.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196430/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-2_u2czly.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196434/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-3_rlid9i.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196431/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-4_sf4wfl.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196432/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-5_lay8ik.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196434/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-6_bqui82.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196437/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-7_xjhz0z.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196436/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-8_z1dk4i.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196437/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-9_oatnwn.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196439/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-10_rq2nwp.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196440/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-11_souzhf.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196442/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-12_e6s9qt.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196443/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-13_nvo4ct.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196444/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-14_oesh8h.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196446/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-15_qsnxgz.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196448/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-16_utzdpe.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196450/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-17_piew5o.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196451/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-18_kzlqit.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196452/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-19_ub3lnu.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196454/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-20_vjuaot.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196455/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-21_q5jczt.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196457/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-22_rhvbic.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196459/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-23_ewnqxt.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196460/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-24_v5ode6.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196463/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-25_oy2v96.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196464/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-26_fqb0jo.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196466/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-27_kdowm0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196467/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-28_es3tuk.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196470/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-29_fm4xqa.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196471/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-30_owsmiy.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196474/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-31_dilsfl.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196475/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-32_i8pfc3.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196478/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-33_fiqixo.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775196479/%E0%A6%A8%E0%A6%AC%E0%A6%AE-%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%AF%E0%A6%BC-%E0%A6%B0%E0%A6%BE%E0%A6%9C%E0%A6%97%E0%A7%81%E0%A6%B9%E0%A7%8D%E0%A6%AF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-34_hs0ekk.mp3"
    ],
    []
  );
  const GITA_CHAPTER_3_10_AUDIO_URLS = useMemo(
    () => [
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198269/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-1_pt6cp5.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198269/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-2_l2oj8c.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198270/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-3_bwtufi.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198270/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-4_imi7pq.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198272/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-5_dnlr01.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198273/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-6_h08r8p.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198275/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-7_ysbvyz.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198276/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-8_zo3wl2.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198277/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-9_m66xyj.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198279/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-10_puqgln.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198282/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-11_bn1mor.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198284/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-12_o4z1d0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198286/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-13_pwerjv.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198288/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-14_m2gbk0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198289/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-15_kcak6m.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198292/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-16_fsdrzp.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198293/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-17_e3xqqy.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198295/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-18_ryusrm.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198297/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-19_wd9abh.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198299/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-20_gulpay.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198300/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-21_xtza4r.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198303/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-22_psdgca.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198304/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-23_lo2tex.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198307/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-24_fk3fer.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198308/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-25_kuetki.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198311/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-26_mnxyoe.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198312/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-27_naz4va.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198315/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-28_pjaird.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198316/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-29_skrjax.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198319/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-30_sfhnxn.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198320/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-31_mp9y6v.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198323/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-32_y8sj1g.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198324/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-33_rsn2c2.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198327/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-34_jzukof.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198329/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-35_gzuudc.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198332/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-36_umhea6.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198333/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-37_tmk5gc.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198336/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-38_cutc69.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198337/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-39_bgji6p.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198340/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-40_p7jp57.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198341/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-41_wj3mck.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775198345/%E0%A6%A6%E0%A6%B6%E0%A6%AE_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F_%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A7%82%E0%A6%A4%E0%A6%BF-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-42_gwdhqh.mp3"
    ],
    []
  );
  const GITA_CHAPTER_3_11_AUDIO_URLS = useMemo(() => [...GITA_CHAPTER_11_TO_16_AUDIO_URLS['3.11']], []);
  const GITA_CHAPTER_3_12_AUDIO_URLS = useMemo(() => [...GITA_CHAPTER_11_TO_16_AUDIO_URLS['3.12']], []);
  const GITA_CHAPTER_3_13_AUDIO_URLS = useMemo(() => [...GITA_CHAPTER_11_TO_16_AUDIO_URLS['3.13']], []);
  const GITA_CHAPTER_3_14_AUDIO_URLS = useMemo(() => [...GITA_CHAPTER_11_TO_16_AUDIO_URLS['3.14']], []);
  const GITA_CHAPTER_3_15_AUDIO_URLS = useMemo(() => [...GITA_CHAPTER_11_TO_16_AUDIO_URLS['3.15']], []);
  const GITA_CHAPTER_3_16_AUDIO_URLS = useMemo(() => [...GITA_CHAPTER_11_TO_16_AUDIO_URLS['3.16']], []);
  const GITA_CHAPTER_3_17_AUDIO_URLS = useMemo(
    () => [
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576354/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-1_j4ajxj.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576353/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-2_oouxdo.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576353/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-3_qasbat.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576355/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-4_yjfbdk.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576354/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-5_cbvzip.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576355/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-6_e1utd2.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576355/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-7_skmwlb.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576356/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-8_cv4ev4.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576353/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-9_ibfv7j.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576354/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-10_av455a.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576355/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-11_jukpjn.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576355/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-12_bn8iho.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576356/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-13_gzblny.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576356/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-14_ehcnkt.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576357/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-15_igro5s.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576357/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-16_rwcftl.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576357/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-17_octosj.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576357/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-18_hs4dbs.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576357/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-19_btypud.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576357/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-20_q38g6a.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576358/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-21_qnpxad.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576358/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-22_nhohpv.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576368/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-23_ixz2ac.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576369/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-24_l0phxi.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576368/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-25_afzii0.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576369/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-26_vimcpy.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576369/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-27_yoxqz6.mp3",
      "https://res.cloudinary.com/dllggegzk/video/upload/v1775576369/%E0%A6%B8%E0%A6%AA%E0%A7%8D%E0%A6%A4%E0%A6%A6%E0%A6%B6_%E0%A6%85%E0%A6%A7%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A7%9F-%E0%A6%B6%E0%A7%8D%E0%A6%B0%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0%A6%A4%E0%A7%8D%E0%A6%B0%E0%A7%9F-%E0%A6%AC%E0%A6%BF%E0%A6%AD%E0%A6%BE0%A6%97-%E0%A6%AF%E0%A7%8B%E0%A6%97-%E0%A6%B6%E0%A7%8D%E0%A6%B2%E0%A7%8B%E0%A6%95-28_gnn0vk.mp3"
    ],
    []
  );
  const normalizePdfAudioUrl = useCallback((url: string) => {
    if (!url) return url;

    return url
      .replace(/%E0%A6%BE0A6%AF%E0%A6%BC/g, '%E0%A6%BE%E0%A7%9F')
      .replace(/%E0%A6%BE0A6%A6/g, '%E0%A6%BE%E0%A6%A6')
      .replace(/%E0%A6%BE0A6%82/g, '%E0%A6%BE%E0%A6%82')
      .replace(/%E0%A6%AE0A6%AF%E0%A7%8B%E0%A6%97/g, '%E0%A6%AE%E0%A6%AF%E0%A7%8B%E0%A6%97')
      .replace(/%E0%A6%9C%E0%A7%8D%E0%A6%9E0A6%BE0A6%A8/g, '%E0%A6%9C%E0%A7%8D%E0%A6%9E%E0%A6%BE%E0%A6%A8')
      .replace(/%E0%A6%AE0A6%B8/g, '%E0%A6%AE%E0%A6%B8')
      .replace(/%E0%A6%BE0A6%B8/g, '%E0%A6%BE%E0%A6%B8')
      .replace(/%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE0A6%A4/g, '%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A6%BE%E0%A6%A4')
      .replace(/%E0%A6%AD%E0%A6%BE0A6%97/g, '%E0%A6%AD%E0%A6%BE%E0%A6%97')
      .replace(/0A6/g, '%E0%A6');
  }, []);  const [pdfAudioUrls, setPdfAudioUrls] = useState<string[]>([DEFAULT_PDF_AUDIO_URL]);
  const [pdfAudioIndex, setPdfAudioIndex] = useState(0);
  const [isPdfAudioPlaying, setIsPdfAudioPlaying] = useState(false);
  const [pdfAudioError, setPdfAudioError] = useState<string | null>(null);
  const [showPdfAudioList, setShowPdfAudioList] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [gitaAudioChapterId, setGitaAudioChapterId] = useState<string | null>(null);
  const [isStandaloneGitaAudioPlaying, setIsStandaloneGitaAudioPlaying] = useState(false);

  // --- Tool States ---
  const [noteInput, setNoteInput] = useState('');
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>(() => {
    const data = localStorage.getItem('user_notes_v3');
    return data ? JSON.parse(data) : [];
  });
  const [time, setTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  const chapterClickCounter = useRef(0);
  const userActionCounterRef = useRef(0);
  const lastInterstitialActionRef = useRef(-2);
  const lastInterstitialTsRef = useRef(0);
  const pendingActionRef = useRef<null | { key: string; run: () => void }>(null);
  const pendingActionTimerRef = useRef<number | null>(null);

  const ADS_ENABLED = true;

  const toLocalIsoDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const VAISHNAV_EKADASHI_EVENTS: Array<{ date: string; title: string; parana: string }> = [
    { date: '2026-01-14', title: 'ষটতিলা একাদশী', parana: '০৬:৪২ - ১০:১৯' },
    { date: '2026-01-29', title: 'ভৈমী একাদশী', parana: '০৬:৩৯ - ১০:২১' },

    { date: '2026-02-13', title: 'বিজয়া একাদশী', parana: '০৬:৩২ - ১০:১৯' },
    { date: '2026-02-27', title: 'আমলকীব্রত একাদশী', parana: '০৬:২১ - ১০:১৪' },

    { date: '2026-03-15', title: 'পাপমোচনী একাদশী', parana: '০৬:০৬ - ১০:০৭' },
    { date: '2026-03-29', title: 'কামদা একাদশী', parana: '০৫:৫২ - ০৭:৪২' },

    { date: '2026-04-13', title: 'বরূথিনী একাদশী', parana: '০৭:২৭ - ০৯:৫২' },
    { date: '2026-04-27', title: 'মোহিনী একাদশী', parana: '০৫:২৬ - ০৯:৪৬' },

    { date: '2026-05-13', title: 'অপরা একাদশী', parana: '০৫:১৬ - ০৯:৪২' },
    { date: '2026-05-27', title: 'পদ্মিনী একাদশী', parana: '০৫:১১ - ০৮:২৯' },

    { date: '2026-06-11', title: 'পরমা একাদশী', parana: '০৫:১০ - ০৯:৪২' },
    { date: '2026-06-26', title: 'পাণ্ডবা নির্জলা একাদশী', parana: '০৫:১৩ - ০৯:৪৫' },

    { date: '2026-07-11', title: 'যোগিনী একাদশী', parana: '০৫:১৯ - ০৯:৪৮' },
    { date: '2026-07-25', title: 'শয়ন একাদশী', parana: '০৫:২৫ - ০৯:৫১' },

    { date: '2026-08-09', title: 'কামিকা একাদশী', parana: '০৫:৩১ - ০৮:৩২' },
    { date: '2026-08-24', title: 'পবিত্রারোপণ একাদশী', parana: '০৫:৩৭ - ০৬:৫২' },

    { date: '2026-09-07', title: 'অন্নদা একাদশী', parana: '০৫:৪২ - ০৯:৫১' },
    { date: '2026-09-22', title: 'পার্শ্ব একাদশী', parana: '০৫:৪৭ - ০৯:৪৯' },

    { date: '2026-10-06', title: 'ইন্দিরা একাদশী', parana: '০৫:৪৬ - ০৯:৪৮' },
    { date: '2026-10-22', title: 'পাশাঙ্কুশা একাদশী', parana: '০৫:৫৯ - ০৯:৪৮' },

    { date: '2026-11-05', title: 'রমা একাদশী', parana: '০৬:০৮ - ০৯:৫৫' },
    { date: '2026-11-21', title: 'উত্থান একাদশী', parana: '০৬:১৭ - ০৯:৫৫' },

    { date: '2026-12-05', title: 'উৎপন্না একাদশী', parana: '০৬:২৭ - ১০:০১' },
    { date: '2026-12-20', title: 'মোক্ষদা একাদশী', parana: '০৬:৩৬ - ১০:০৯' }
  ];

  const VAISHNAV_OTHER_EVENTS: Array<{ date: string; title: string }> = [
    { date: '2026-01-03', title: 'শ্রীকৃষ্ণের পুষ্যাভিষেক' },
    { date: '2026-01-23', title: 'শ্রী সরস্বতী পূজা' },
    { date: '2026-01-25', title: 'শ্রী অদ্বৈত আচার্যের আবির্ভাব' },
    { date: '2026-01-31', title: 'শ্রী নিত্যানন্দ ত্রয়োদশী' },

    { date: '2026-02-01', title: 'শ্রীল নরোত্তম দাস ঠাকুরের আবির্ভাব' },
    { date: '2026-02-16', title: 'শ্রীশিবরাত্রি' },

    { date: '2026-03-03', title: 'শ্রীশ্রী গৌরপূর্ণিমা' },
    { date: '2026-03-11', title: 'শ্রী শ্রীুবাস ঠাকুরের আবির্ভাব' },
    { date: '2026-03-16', title: 'পনতীর্থ মহাবারুণী স্নান' },
    { date: '2026-03-27', title: 'শ্রীশ্রী রামনবমী' },
    { date: '2026-03-29', title: 'শ্রীল জয়পতাকা স্বামী গুরু মহারাজের ব্যাসপূজা' },

    { date: '2026-04-20', title: 'অক্ষয় তৃতীয়া, চন্দনযাত্রা শুরু' },
    { date: '2026-04-30', title: 'শ্রী নৃসিংহ চতুর্দশী' },

    { date: '2026-05-16', title: 'শ্রীশ্রী পুরুষোত্তম ব্রত আরম্ভ' },

    { date: '2026-06-27', title: 'পানিহাটি চিড়াদধি মহোৎসব' },
    { date: '2026-06-29', title: 'শ্রী জগন্নাথদেবের স্নানযাত্রা' },

    { date: '2026-07-16', title: 'শ্রীশ্রী জগন্নাথদেবের রথযাত্রা' },
    { date: '2026-07-24', title: 'উল্টো রথযাত্রা' },

    { date: '2026-08-07', title: 'নিউইয়র্কে ইসকন প্রতিষ্ঠাবার্ষিকী' },
    { date: '2026-08-23', title: 'শ্রীশ্রী রাধা-মাধবের ঝুলনযাত্রা' },
    { date: '2026-08-28', title: 'শ্রী বলরাম পূর্ণিমা' },

    { date: '2026-09-04', title: 'শ্রীকৃষ্ণের জন্মাষ্টমী' },
    { date: '2026-09-05', title: 'শ্রীল প্রভুপাদের ১৩০তম শুভ আবির্ভাব' },
    { date: '2026-09-17', title: 'শ্রীল ভক্তিচারু স্বামী গুরু মহারাজের ব্যাসপূজা' },
    { date: '2026-09-19', title: 'শ্রীশ্রী রাধাষ্টমী' },
    { date: '2026-09-26', title: 'ভদ্র পূর্ণিমা' },

    { date: '2026-10-18', title: 'শ্রীশ্রী দুর্গাপূজা - সপ্তমী' },
    { date: '2026-10-26', title: 'শ্রী লক্ষ্মীপূজা, দামোদর ব্রত শুরু' },
    { date: '2026-10-30', title: 'শ্রীল নরোত্তম দাস ঠাকুরের তিরোভাব' },

    { date: '2026-11-09', title: 'দীপাবলি, শ্রীশ্রী কালীপূজা' },
    { date: '2026-11-10', title: 'গোবর্ধন পূজা, অন্নকূট মহোৎসব' },
    { date: '2026-11-13', title: 'শ্রীল প্রভুপাদের তিরোভাব' },
    { date: '2026-11-17', title: 'গোপষ্টমী' },
    { date: '2026-11-24', title: 'শ্রীকৃষ্ণের রাসযাত্রা' },

    { date: '2026-12-20', title: 'শ্রীশ্রী গীতা জয়ন্তী' },
    { date: '2026-12-31', title: 'শ্রীল সুভগ স্বামী গুরু মহারাজের ব্যাসপূজা' }
  ];

  const VAISHNAV_AMAVASYA_EVENTS: Array<{ date: string; title: string; start: string; end: string }> = [
    { date: '2026-01-18', title: 'অমাবস্যা', start: '১৮ জানু, ১২:০৩ AM', end: '১৯ জানু, ০১:২১ AM' },
    { date: '2026-02-17', title: 'অমাবস্যা', start: '১৬ ফেব, ০৫:৩৪ PM', end: '১৭ ফেব, ০৫:৩০ PM' },
    { date: '2026-03-18', title: 'অমাবস্যা', start: '১৮ মার্চ, ০৮:২৫ AM', end: '১৯ মার্চ, ০৬:৫২ AM' },
    { date: '2026-04-17', title: 'অমাবস্যা', start: '১৬ এপ্রিল, ০৮:১১ PM', end: '১৭ এপ্রিল, ০৫:২১ PM' },
    { date: '2026-05-16', title: 'অমাবস্যা', start: '১৬ মে, ০৫:১১ AM', end: '১৭ মে, ০১:৩০ AM' },
    { date: '2026-06-14', title: 'অমাবস্যা', start: '১৪ জুন, ১২:১৯ PM', end: '১৫ জুন, ০৮:২৩ AM' },
    { date: '2026-07-14', title: 'অমাবস্যা', start: '১৩ জুলাই, ০৬:৪৯ PM', end: '১৪ জুলাই, ০৩:১২ PM' },
    { date: '2026-08-12', title: 'অমাবস্যা', start: '১২ আগস্ট, ০১:৫২ AM', end: '১২ আগস্ট, ১১:০৬ PM' },
    { date: '2026-09-10', title: 'অমাবস্যা', start: '১০ সেপ্টে, ১০:৩৩ AM', end: '১১ সেপ্টে, ০৮:৫৬ AM' },
    { date: '2026-10-10', title: 'অমাবস্যা', start: '৯ অক্টো, ০৯:৩৫ PM', end: '১০ অক্টো, ০৯:১৯ PM' },
    { date: '2026-11-09', title: 'অমাবস্যা', start: '৮ নভে, ১১:২৭ AM', end: '৯ নভে, ১২:৩১ PM' },
    { date: '2026-12-09', title: 'অমাবস্যা', start: '৮ ডিসে, ০৪:১২ AM', end: '৯ ডিসে, ০৬:২১ AM' }
  ];

  const VAISHNAV_PURNIMA_EVENTS: Array<{ date: string; title: string; start: string; end: string }> = [
    { date: '2026-01-03', title: 'পৌষ পূর্ণিমা', start: '02 January 2026 at 06:55 PM', end: '03 January 2026 at 03:34 PM' },
    { date: '2026-02-01', title: 'মাঘ পূর্ণিমা', start: '01 February 2026 at 05:55 AM', end: '02 February 2026 at 03:41 AM' },
    { date: '2026-03-03', title: 'ফাল্গুন পূর্ণিমা', start: '02 March 2026 at 05:58 PM', end: '03 March 2026 at 05:09 PM' },
    { date: '2026-04-02', title: 'চৈত্র পূর্ণিমা', start: '01 April 2026 at 07:08 AM', end: '02 April 2026 at 07:43 AM' },
    { date: '2026-05-01', title: 'বৈশাখ পূর্ণিমা', start: '30 April 2026 at 09:14 PM', end: '01 May 2026 at 10:55 PM' },
    { date: '2026-06-29', title: 'জ্যৈষ্ঠ পূর্ণিমা', start: '29 June 2026 at 03:08 AM', end: '30 June 2026 at 05:28 AM' },
    { date: '2026-07-29', title: 'আষাঢ় পূর্ণিমা', start: '28 July 2026 at 06:21 PM', end: '29 July 2026 at 08:07 PM' },
    { date: '2026-08-28', title: 'শ্রাবণ পূর্ণিমা', start: '27 August 2026 at 09:11 AM', end: '28 August 2026 at 09:50 AM' },
    { date: '2026-09-26', title: 'ভাদ্র পূর্ণিমা', start: '25 September 2026 at 11:09 PM', end: '26 September 2026 at 10:20 PM' },
    { date: '2026-10-26', title: 'আশ্বিন পূর্ণিমা', start: '25 October 2026 at 11:58 AM', end: '26 October 2026 at 09:43 AM' },
    { date: '2026-11-24', title: 'কার্তিক পূর্ণিমা', start: '23 November 2026 at 11:44 PM', end: '24 November 2026 at 08:25 PM' },
    { date: '2026-12-23', title: 'মার্গশীর্ষ পূর্ণিমা', start: '23 December 2026 at 10:49 AM', end: '24 December 2026 at 07:00 AM' }
  ];

  const vaishnavEvents = useMemo(() => {
    const ek = VAISHNAV_EKADASHI_EVENTS.map(e => ({
      date: e.date,
      title: e.title,
      type: 'ekadashi' as const,
      parana: e.parana
    }));
    const other = VAISHNAV_OTHER_EVENTS.map(e => ({
      date: e.date,
      title: e.title,
      type: 'other' as const
    }));
    const amavasya = VAISHNAV_AMAVASYA_EVENTS.map(e => ({
      date: e.date,
      title: e.title,
      type: 'amavasya' as const,
      start: e.start,
      end: e.end
    }));
    const purnima = VAISHNAV_PURNIMA_EVENTS.map(e => ({
      date: e.date,
      title: e.title,
      type: 'purnima' as const,
      start: e.start,
      end: e.end
    }));
    return [...ek, ...other, ...amavasya, ...purnima].sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  const [vaishnavMonth, setVaishnavMonth] = useState(() => new Date(2026, 0, 1));
  const [vaishnavSelectedDate, setVaishnavSelectedDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear() === 2026 ? d.getFullYear() : 2026;
    const month = d.getFullYear() === 2026 ? d.getMonth() : 0;
    const day = d.getFullYear() === 2026 ? d.getDate() : 1;
    return toLocalIsoDate(new Date(year, month, day));
  });
  const [vaishnavPopupDate, setVaishnavPopupDate] = useState<string | null>(null);

  useEffect(() => {
    window.openVaishnavCalendarFromNative = (dateStr?: string) => {
      setView('tools');
      setActiveTool('vaishnavCalendar');
      if (dateStr) {
        setVaishnavSelectedDate(dateStr);
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          setVaishnavMonth(new Date(y, m, 1));
        }
      }
    };
  }, []);

  const vaishnavPopupEvents = useMemo(
    () => vaishnavEvents.filter(e => e.date === vaishnavPopupDate),
    [vaishnavEvents, vaishnavPopupDate]
  );

  useEffect(() => {
    localStorage.setItem('user_notes_v3', JSON.stringify(savedNotes));
  }, [savedNotes]);

  const checkIsOnline = useCallback((): boolean => {
    if (window.Android?.isNetworkAvailable) {
      const online = Boolean(window.Android.isNetworkAvailable());
      setIsOffline(!online);
      return online;
    }
    const online = navigator.onLine;
    setIsOffline(!online);
    return online;
  }, []);

  useEffect(() => {
    checkIsOnline();
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.onNativeNetworkChanged = (online: boolean) => {
      setIsOffline(!online);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.onNativeNetworkChanged = undefined;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkIsOnline]);

  // Show Banner Ad ONLY on Chapters page and PDF reading screen (NOT on Home page)
  useEffect(() => {
    const shouldShowBanner = !isSearchOpen && (view === 'chapters' || view === 'content');
    window.Android?.setBannerVisible?.(shouldShowBanner);
  }, [view, isSearchOpen, isOffline]);

  useEffect(() => {
    if (view !== 'content') {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
      setIsPdfAudioPlaying(false);
      setPdfAudioError(null);
    }
  }, [view]);

  useEffect(() => {
    if (view !== 'content') return;
    const a = audioRef.current;
    if (!a) return;

    if (!isPdfAudioPlaying) return;

    if (!checkIsOnline()) {
      a.pause();
      setIsPdfAudioPlaying(false);
      setPdfAudioError('অডিও শুনতে ইন্টারনেট সংযোগ লাগবে');
      setNoInternetReason('audio');
      return;
    }

    setPdfAudioError(null);
    a.currentTime = 0;
    a.play().catch(() => {
      setIsPdfAudioPlaying(false);
      setPdfAudioError(`শ্লোক-${pdfAudioIndex + 1} play করা যাচ্ছে না। ইন্টারনেট পরীক্ষা করুন।`);
    });
  }, [view, pdfAudioIndex, pdfAudioUrls, isPdfAudioPlaying, checkIsOnline]);

  useEffect(() => {
    window.onInterstitialDismissedFromNative = (action: string) => {
      const pending = pendingActionRef.current
      if (!pending || pending.key !== action) return

      if (pendingActionTimerRef.current) {
        window.clearTimeout(pendingActionTimerRef.current)
        pendingActionTimerRef.current = null
      }

      pendingActionRef.current = null
      pending.run()
    }

    return () => {
      window.onInterstitialDismissedFromNative = undefined
    }
  }, [])

  const runWithInterstitial = (actionKey: string, next: () => void) => {
    if (!ADS_ENABLED) {
      next()
      return
    }

    pendingActionRef.current = { key: actionKey, run: next }

    if (pendingActionTimerRef.current) {
      window.clearTimeout(pendingActionTimerRef.current)
    }

    pendingActionTimerRef.current = window.setTimeout(() => {
      const pending = pendingActionRef.current
      if (!pending || pending.key !== actionKey) return
      pendingActionRef.current = null
      pendingActionTimerRef.current = null
      next()
    }, 3200)

    const bridge = window.Android
    if (bridge?.triggerInterstitialAdWithAction) {
      bridge.triggerInterstitialAdWithAction(actionKey)
      return
    }

    bridge?.triggerInterstitialAd?.()
  }

  const shouldShowInterstitialNow = () => {
    if (!ADS_ENABLED) return false
    const now = Date.now()
    const actionGapOk = (userActionCounterRef.current - lastInterstitialActionRef.current) >= 1
    const cooldownOk = (now - lastInterstitialTsRef.current) >= 20_000
    return actionGapOk && cooldownOk
  }

  useEffect(() => {
    window.showExitPopupFromNative = () => {
      setShowExitPopup(true);
    };

    return () => {
      window.showExitPopupFromNative = undefined;
    };
  }, []);

  const triggerComingSoon = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  };

  const handleSubjectClick = (subject: Subject) => {
    setTimeout(() => {
      setCurrentSubject(subject);
      setGuideMode('guide');
      setView('chapters');
    }, 180);
  };

  useEffect(() => {
    if (view === 'chapters') {
      void pdfDownloadManager.refreshCache();
    }
  }, [view]);

  const openPdfDirectly = useCallback((chapter: Chapter, subject: Subject) => {
    setCurrentSubject(subject);
    setCurrentChapter(chapter);
    setShowPdfAudioList(false);
    if (subject.id === '3') {
      if (chapter.id === '3.0') {
        setPdfAudioUrls([]);
      } else {
        const fixedChapterAudioUrls = GITA_CHAPTER_1_TO_18_AUDIO_URLS[chapter.id];
        if (fixedChapterAudioUrls?.length) {
          setPdfAudioUrls([...fixedChapterAudioUrls]);
        } else {
          try {
            const key = `pdf_audio_playlist_${subject.id}_${chapter.id}`;
            const raw = localStorage.getItem(key);
            const list = raw ? (JSON.parse(raw) as unknown) : null;
            if (Array.isArray(list) && list.every(x => typeof x === 'string') && list.length > 0) {
              setPdfAudioUrls(list as string[]);
            } else {
              setPdfAudioUrls([DEFAULT_PDF_AUDIO_URL, DEFAULT_PDF_AUDIO_URL]);
            }
          } catch {
            setPdfAudioUrls([DEFAULT_PDF_AUDIO_URL, DEFAULT_PDF_AUDIO_URL]);
          }
        }
      }
    } else {
      setPdfAudioUrls([DEFAULT_PDF_AUDIO_URL]);
    }
    setPdfAudioIndex(0);
    setIsPdfAudioPlaying(false);
    setPdfAudioError(null);
    setView('content');
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [DEFAULT_PDF_AUDIO_URL]);

  const openPdfWithInterstitial = useCallback((chapter: Chapter, subject: Subject) => {
    chapterClickCounter.current += 1;
    userActionCounterRef.current += 1;

    // Offline downloaded PDFs open immediately without waiting for network ads
    if (!checkIsOnline() || !ADS_ENABLED) {
      openPdfDirectly(chapter, subject);
      return;
    }

    lastInterstitialActionRef.current = userActionCounterRef.current;
    lastInterstitialTsRef.current = Date.now();
    const actionKey = `open_pdf_${subject.id}_${chapter.id}_${chapterClickCounter.current}`;
    runWithInterstitial(actionKey, () => openPdfDirectly(chapter, subject));
  }, [checkIsOnline, openPdfDirectly]);

  // After outside chapter download finishes, automatically show Interstitial Ad then open PDF
  useEffect(() => {
    if (!pendingOpenAfterDownload) return;
    const { safeKey, chapter, subject } = pendingOpenAfterDownload;
    const isNowDownloaded = (cachedSizes[safeKey] || 0) > 500;
    if (isNowDownloaded) {
      setPendingOpenAfterDownload(null);
      openPdfWithInterstitial(chapter, subject);
      return;
    }
    if (downloads[safeKey]?.status === 'error') {
      setPendingOpenAfterDownload(null);
    }
  }, [cachedSizes, downloads, pendingOpenAfterDownload, openPdfWithInterstitial]);

  const handleChapterClick = (chapter: Chapter, subject: Subject) => {
    if (!chapter.pdfUrl || chapter.pdfUrl === "") {
      triggerComingSoon();
      return;
    }
    const cacheKey = getChapterCacheKey(subject.id, chapter.id, chapter.pdfUrl);
    const safeKey = sanitizeCacheKey(cacheKey);
    const alreadyDownloaded =
      (cachedSizes[safeKey] || 0) > 500 ||
      pdfDownloadManager.isCached(cacheKey);

    // Already downloaded PDFs open directly (interstitial if online, instant if offline)
    if (alreadyDownloaded) {
      if (pendingOpenAfterDownload?.safeKey === safeKey) {
        setPendingOpenAfterDownload(null);
      }
      openPdfWithInterstitial(chapter, subject);
      return;
    }

    // Not downloaded yet: requires internet to download outside on Chapters page first
    if (!checkIsOnline()) {
      setNoInternetReason('pdf');
      return;
    }

    // If clicked from Search or another view, navigate to Chapters page so progress is visible outside
    if (isSearchOpen || view !== 'chapters' || currentSubject?.id !== subject.id) {
      setCurrentSubject(subject);
      const isAlt = (subject.altChapters || []).some(c => c.id === chapter.id);
      setGuideMode(isAlt ? 'altGuide' : 'guide');
      setView('chapters');
      setIsSearchOpen(false);
      setSearchQuery('');
    }

    setPendingOpenAfterDownload({ safeKey, chapter, subject });
    pdfDownloadManager.startDownload(chapter.pdfUrl, cacheKey);
  };

  const handleToolClick = (toolId: ToolSubView) => {
    if (!checkIsOnline()) {
      setNoInternetReason('general');
      return;
    }
    userActionCounterRef.current += 1;
    const openTool = () => {
      setActiveTool(toolId);
      setView('tools');
    }

    if (!shouldShowInterstitialNow()) {
      openTool()
      return
    }

    lastInterstitialActionRef.current = userActionCounterRef.current
    lastInterstitialTsRef.current = Date.now()
    const actionKey = `open_tool_${toolId}_${Date.now()}`
    runWithInterstitial(actionKey, openTool)
  };

  const handleBack = useCallback(() => {
    if (view === 'content') setView('chapters');
    else if (view === 'gitaAudio') {
      if (gitaAudioChapterId) setGitaAudioChapterId(null);
      else setView('subjects');
    }
    else if (view === 'chapters' || view === 'tools') { setView('subjects'); setCurrentSubject(null); }
    else if (view === 'subjects') setShowExitPopup(true);
  }, [view, gitaAudioChapterId]);

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);
  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const exitApp = () => {
    if (window.Android?.exitApp) {
      window.Android.exitApp();
      return;
    }
    window.close();
  };

  const saveNote = () => {
    if (!noteInput.trim()) return;
    const newNote: SavedNote = {
      id: Date.now().toString(),
      text: noteInput,
      date: new Date().toLocaleString('bn-BD')
    };
    setSavedNotes([newNote, ...savedNotes]);
    setNoteInput('');
  };

  const deleteNote = (id: string) => {
    setSavedNotes(savedNotes.filter(n => n.id !== id));
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const results: any[] = [];
    Object.values(SUBJECTS_DATA).forEach(s => {
      [...s.chapters, ...(s.altChapters || [])].forEach(c => {
        if (c.title.toLowerCase().includes(searchQuery.toLowerCase())) results.push({ chapter: c, subject: s });
      });
    });
    return results;
  }, [searchQuery]);

  const LOGO_GIF = window.Android
    ? "file:///android_asset/Image/sticker/logo.jpg"
    : "./Image/sticker/logo.jpg";
  const PROVHUPAD_IMAGE = window.Android
    ? "file:///android_asset/Image/sticker/Provhupad.img.png"
    : "./Image/sticker/Provhupad.img.png";

  const BACKGROUND_IMAGE = window.Android
    ? "file:///android_asset/Image/Baground.jpg"
    : "./Image/Baground.jpg";

  const showPdfAudioPlayer = view === 'content' && currentSubject?.id === '3' && pdfAudioUrls.length > 0;
  const shouldHidePdfAudioLinks = currentSubject?.id === '3' && !!(currentChapter?.id && GITA_CHAPTER_1_TO_18_AUDIO_URLS[currentChapter.id]?.length);
  const pdfAudioItems = useMemo(() => {
    const base = currentChapter?.title || '';
    const count = Math.max(1, pdfAudioUrls.length || 0);
    return Array.from({ length: count }, (_, idx) => ({
      index: idx,
      label: `${base} - শ্লোক-${idx + 1}`
    }));
  }, [currentChapter?.title, pdfAudioUrls.length]);

  const toolItems = [
    {
      id: 'vaishnavCalendar',
      label: 'Vaishnava\nCalendar',
      icon: <CalendarDays size={22} />,
      iconWrapClass: 'bg-gradient-to-br from-amber-300 via-orange-300 to-rose-300 text-amber-900 shadow-[0_10px_24px_rgba(251,191,36,0.45)] border border-amber-100'
    },
    {
      id: 'note',
      label: 'Notepad',
      icon: <StickyNote size={22} />,
      iconWrapClass: 'bg-gradient-to-br from-fuchsia-300 via-pink-300 to-violet-300 text-fuchsia-900 shadow-[0_10px_24px_rgba(232,121,249,0.4)] border border-pink-100'
    },
    {
      id: 'timer',
      label: 'Timer',
      icon: <TimerIcon size={22} />,
      iconWrapClass: 'bg-gradient-to-br from-cyan-300 via-sky-300 to-blue-300 text-blue-900 shadow-[0_10px_24px_rgba(56,189,248,0.4)] border border-cyan-100'
    }
  ];

  return (
    <div
      className="relative min-h-screen pb-32 overflow-x-hidden selection:bg-blue-200"
      style={{
        backgroundImage: `url(${BACKGROUND_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="bird-container">
        {[...Array(5)].map((_, i) => (<div key={i} className="bird" style={{ top: `${10 + i * 20}%`, animationDuration: `${16 + Math.random() * 8}s`, animationDelay: `${i * 2}s` }} />))}
      </div>

      <header className="fixed top-4 left-4 right-4 h-18 floating-header flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-3">
          {view === 'subjects' ? (
            <button onClick={toggleDrawer} className="h-10 w-10 flex flex-col justify-center gap-1.5 p-2 bg-white/10 rounded-lg transition-transform active:scale-90">
              <div className="w-7 h-0.5 bg-sky-100 rounded-full"></div><div className="w-5 h-0.5 bg-sky-100 rounded-full"></div>
            </button>
          ) : (<button onClick={handleBack} className="h-10 w-10 flex items-center justify-center text-white bg-white/10 rounded-lg transition-transform active:scale-90"><ArrowLeft size={24}/></button>)}
        </div>
        <div className="text-center">
          <h1 className="text-lg font-black text-white brand-font tracking-wide">শ্রীমদ্ভগবদ গীতা যথাযথ</h1>
          <p className="text-[9px] font-bold text-sky-200 tracking-wider">অডিও সহ</p>
        </div>
        <div className="h-12 w-12 bg-white/20 rounded-xl p-0 overflow-hidden shadow-lg transition-transform active:scale-95"><img src={LOGO_GIF} className="w-full h-full object-cover" /></div>
      </header>

      <main className="pt-24 px-4 z-10 relative max-w-2xl mx-auto">
        {view === 'subjects' && (
          <div className="space-y-4">
            <div className="animate-in slide-in-from-top-2 duration-500 mb-6">
                <div className="w-full flex justify-center">
                  <div className="flex overflow-x-auto justify-center gap-3 py-4 px-1 scrollbar-hide snap-x snap-mandatory">
                  {toolItems.map(item => (
                    <button 
                      key={item.id} 
                      onClick={() => handleToolClick(item.id as ToolSubView)}
                      className="flex flex-col items-center justify-center gap-3 group flex-shrink-0 w-[31%] snap-center"
                    >
                      <div className={`h-14 w-14 rounded-[18px] backdrop-blur-sm flex items-center justify-center shadow-md group-active:scale-90 transition-all duration-200 icon-glow ${item.iconWrapClass}`}>
                        {item.icon}
                      </div>
                      <span className="px-3 py-2 rounded-2xl bg-slate-950/72 text-[13px] font-black text-white tracking-normal text-center shadow-lg border border-white/25 w-full max-w-[150px] min-h-[46px] leading-[1.15] whitespace-pre-line flex items-center justify-center">
                        {item.label}
                      </span>
                    </button>
                  ))}
                  </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pb-12 animate-in fade-in zoom-in-95 duration-500">
              {Object.values(SUBJECTS_DATA).map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSubjectClick(s)}
                  className="card-3d py-2.5 px-4 flex flex-col items-center justify-center gap-1.5 group"
                  style={{ backgroundColor: 'rgba(14, 165, 233, 0.45)' }}
                >
                  <div className="h-10 w-10 flex items-center justify-center icon-glow">
                     <div className="text-3xl icon-shadow group-active:scale-110 transition-transform">{s.icon}</div>
                  </div>
                  <span className="text-[15px] font-black text-white text-center brand-font leading-tight">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'chapters' && currentSubject && (() => {
          const activeChapters = guideMode === 'guide' ? currentSubject.chapters : (currentSubject.altChapters || []);
          let downloadedCount = 0;
          activeChapters.forEach(ch => {
            if (!ch.pdfUrl) return;
            const sk = sanitizeCacheKey(getChapterCacheKey(currentSubject.id, ch.id, ch.pdfUrl));
            const sz = cachedSizes[sk] || 0;
            if (sz > 500) {
              downloadedCount += 1;
            }
          });

          return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div
              className="flex backdrop-blur-md p-1.5 rounded-2xl gap-1.5 border border-white/75 shadow-sm"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.58)' }}
            >
              <button onClick={() => setGuideMode('guide')} className={`flex-1 py-3.5 rounded-xl font-black text-sm transition-all ${guideMode === 'guide' ? 'bg-sky-600 text-white shadow-lg' : 'text-blue-950/80'}`}>বাংলা ভার্সন</button>
              <button onClick={() => setGuideMode('altGuide')} className={`flex-1 py-3.5 rounded-xl font-black text-sm transition-all ${guideMode === 'altGuide' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-950/80'}`}>English Version</button>
            </div>

            {/* Offline Storage Summary Banner (no MB size shown) */}
            <div
              className="backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/75 shadow-sm flex items-center justify-between gap-2"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.62)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${downloadedCount > 0 ? 'bg-emerald-100/90 text-emerald-700' : 'bg-sky-100/90 text-sky-700'}`}>
                  <HardDrive size={14} />
                </div>
                <span className="text-[11px] font-bold text-slate-900 truncate">
                  {downloadedCount > 0
                    ? `অফলাইনে ডাউনলোড করা: ${downloadedCount}/${activeChapters.length} টি (ইন্টারনেট ছাড়াই পড়া যাবে)`
                    : 'অধ্যায়ে ক্লিক করে বা সেভ বাটনে ট্যাপ করে ডাউনলোড করুন'}
                </span>
              </div>
            </div>

            <div className="space-y-3 pb-10">
              {activeChapters.map(c => {
                const cacheKey = getChapterCacheKey(currentSubject.id, c.id, c.pdfUrl);
                const safeKey = sanitizeCacheKey(cacheKey);
                const savedSize = cachedSizes[safeKey] || 0;
                const isDownloaded = savedSize > 500;
                const dlState = downloads[safeKey];
                const isDownloading = !isDownloaded && dlState?.status === 'downloading';
                const isError = !isDownloaded && dlState?.status === 'error';
                const isPendingOpen = pendingOpenAfterDownload?.safeKey === safeKey;

                return (
                  <div
                    key={c.id}
                    className={`w-full rounded-2xl border backdrop-blur-md shadow-sm transition-all overflow-hidden ${
                      isDownloaded
                        ? 'border-emerald-300/90 shadow-md'
                        : isDownloading
                        ? 'border-sky-400/90 shadow-md'
                        : 'border-white/75'
                    }`}
                    style={{
                      backgroundColor: isDownloaded
                        ? 'rgba(255, 255, 255, 0.68)'
                        : isDownloading
                        ? 'rgba(255, 255, 255, 0.70)'
                        : 'rgba(255, 255, 255, 0.62)'
                    }}
                  >
                    <div className="p-3.5 flex items-center justify-between gap-2.5">
                      {/* Main tappable chapter area: downloads outside first if needed, then interstitial -> PDF */}
                      <button
                        onClick={() => handleChapterClick(c, currentSubject)}
                        className="flex-1 min-w-0 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                      >
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                            isDownloaded
                              ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300/70'
                              : 'bg-sky-100/90 text-blue-950 border-sky-200/80'
                          }`}
                        >
                          {c.id.split('.')[1] || '•'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-slate-950 font-black text-left text-sm block leading-snug">
                            {c.title}
                          </span>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {isDownloaded ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50/95 px-2 py-0.5 rounded-full border border-emerald-300/80">
                                <CheckCircle2 size={11} />
                                ডাউনলোড সম্পন্ন • অফলাইনে পড়ুন
                              </span>
                            ) : isDownloading ? (
                              <span className="text-[10px] font-bold text-sky-900">
                                ডাউনলোড হচ্ছে {dlState.percent}%
                                {isPendingOpen ? ' • সম্পূর্ণ হলে খুলবে...' : ''}
                              </span>
                            ) : isError ? (
                              <span className="text-[10px] font-bold text-rose-700">
                                ডাউনলোড ব্যর্থ হয়েছে • পুনরায় চেষ্টা করুন
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-700">
                                ডাউনলোড করা নেই
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Right side action buttons: Download / Progress+Cancel / Delete */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isDownloaded ? (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setDeleteTarget({
                                title: c.title,
                                cacheKey
                              });
                            }}
                            className="h-10 w-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 flex items-center justify-center active:scale-90 transition-all"
                            aria-label="ডাউনলোড ডিলিট করুন"
                            title="স্টোরেজ থেকে ডিলিট করুন"
                          >
                            <Trash2 size={17} />
                          </button>
                        ) : isDownloading ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-1 rounded-lg bg-sky-100 text-sky-800 font-mono font-black text-[11px] min-w-[40px] text-center">
                              {dlState.percent}%
                            </span>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                if (pendingOpenAfterDownload?.safeKey === safeKey) {
                                  setPendingOpenAfterDownload(null);
                                }
                                pdfDownloadManager.cancelDownload(cacheKey);
                              }}
                              className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center active:scale-90 transition-all"
                              aria-label="ডাউনলোড বাতিল করুন"
                              title="বাতিল করুন"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              if (!c.pdfUrl) {
                                triggerComingSoon();
                                return;
                              }
                              if (!checkIsOnline()) {
                                setNoInternetReason('pdf');
                                return;
                              }
                              pdfDownloadManager.startDownload(c.pdfUrl, cacheKey);
                            }}
                            className={`h-10 px-3 rounded-xl font-bold text-[11px] flex items-center gap-1.5 shadow-sm active:scale-90 transition-all ${
                              isError
                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                : 'bg-sky-600 hover:bg-sky-700 text-white'
                            }`}
                            aria-label="ডাউনলোড করুন"
                            title="অফলাইনে ডাউনলোড করুন"
                          >
                            {isError ? <RefreshCw size={15} /> : <Download size={15} />}
                            <span>{isError ? 'আবার' : 'সেভ'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Smooth Monotonic Inline Progress Bar while Downloading */}
                    {isDownloading && (
                      <div className="px-3.5 pb-3 pt-0.5">
                        <div className="w-full h-2 bg-slate-200/90 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-200 ease-out"
                            style={{ width: `${Math.max(2, dlState.percent)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })()}

        {view === 'tools' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-6 bg-white/40 p-3 rounded-[30px] border border-white shadow-sm">
                <button onClick={() => setView('subjects')} className="h-11 w-11 bg-white rounded-full flex items-center justify-center text-blue-700 shadow-sm active:scale-90 transition-transform"><ArrowLeft size={20}/></button>
                <div className="flex-1">
                  <h3 className="font-black text-blue-900 text-[10px] uppercase tracking-wider">{toolItems.find(i => i.id === activeTool)?.label}</h3>
                </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-[36px] p-6 min-h-[480px] shadow-2xl border-2 border-white/50 pb-12 overflow-hidden animate-in zoom-in-95 duration-500">
              {activeTool === 'vaishnavCalendar' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                  {/* Reminder Banner */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                        <Bell size={16} className="text-amber-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-amber-950 leading-tight">অনুষ্ঠান অনুস্মারক নোটিফিকেশন সক্রিয়</p>
                        <p className="text-[9px] text-amber-800/80 mt-0.5 leading-tight">প্রতিটি তিথির পূর্বের দিন রাত ৮:০০টায় ফোনে নোটিফিকেশন যাবে</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (window.Android?.sendTestVaishnavNotification) {
                          window.Android.sendTestVaishnavNotification();
                        }
                      }}
                      className="shrink-0 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[9px] font-bold shadow-sm active:scale-95 transition-all"
                    >
                      টেস্ট নোটিফিকেশন
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-sky-100/50 rounded-2xl p-3">
                    <button
                      onClick={() => setVaishnavMonth(new Date(vaishnavMonth.getFullYear(), vaishnavMonth.getMonth() - 1, 1))}
                      className="h-10 w-10 rounded-xl bg-white text-blue-700 shadow-sm flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <ChevronRight size={20} className="rotate-180" />
                    </button>
                    <div className="text-center">
                      <div className="text-[11px] font-black text-blue-900 tracking-widest uppercase">
                        {vaishnavMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <button
                      onClick={() => setVaishnavMonth(new Date(vaishnavMonth.getFullYear(), vaishnavMonth.getMonth() + 1, 1))}
                      className="h-10 w-10 rounded-xl bg-white text-blue-700 shadow-sm flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                      <div key={d} className="text-[8px] font-black text-blue-900/50 tracking-widest uppercase">{d}</div>
                    ))}
                    {(() => {
                      const year = vaishnavMonth.getFullYear();
                      const month = vaishnavMonth.getMonth();
                      const first = new Date(year, month, 1);
                      const start = new Date(year, month, 1 - first.getDay());
                      const days = Array.from({ length: 42 }, (_, idx) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + idx));
                      const countByType = vaishnavEvents.reduce<Record<string, { ekadashi: number; other: number; amavasya: number; purnima: number }>>((acc, e) => {
                        if (!acc[e.date]) acc[e.date] = { ekadashi: 0, other: 0, amavasya: 0, purnima: 0 };
                        if (e.type === 'ekadashi') acc[e.date].ekadashi += 1;
                        else if (e.type === 'other') acc[e.date].other += 1;
                        else if (e.type === 'amavasya') acc[e.date].amavasya += 1;
                        else if (e.type === 'purnima') acc[e.date].purnima += 1;
                        return acc;
                      }, {});

                      return days.map((d, idx) => {
                        const iso = toLocalIsoDate(d);
                        const inMonth = d.getMonth() === month;
                        const isSelected = iso === vaishnavSelectedDate;
                        const ek = countByType[iso]?.ekadashi || 0;
                        const other = countByType[iso]?.other || 0;
                        const ama = countByType[iso]?.amavasya || 0;
                        const pur = countByType[iso]?.purnima || 0;
                        const hasEk = ek > 0;
                        const hasOther = other > 0;
                        const hasAma = ama > 0;
                        const hasPur = pur > 0;
                        const hasAnyEvent = hasEk || hasOther || hasAma || hasPur;
                        const bg = hasEk && hasOther
                          ? 'bg-gradient-to-br from-amber-100 to-emerald-100 border-sky-100'
                          : hasEk
                            ? 'bg-amber-100 border-amber-200'
                            : hasOther
                              ? 'bg-emerald-100 border-emerald-200'
                              : inMonth
                                ? 'bg-white border-sky-100'
                                : 'bg-white/30 border-white/30';
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setVaishnavSelectedDate(iso);
                              if (hasAnyEvent) setVaishnavPopupDate(iso);
                            }}
                            className={`h-10 rounded-2xl border text-center flex flex-col items-center justify-center leading-none transition-all active:scale-95 ${bg} ${isSelected ? 'ring-2 ring-blue-700' : ''}`}
                          >
                            <div className={`text-[12px] font-black ${inMonth ? 'text-blue-900' : 'text-blue-900/30'}`}>{d.getDate()}</div>
                            {(hasEk || hasOther || hasAma || hasPur) && (
                              <div className="mt-1 flex items-center gap-1">
                                {hasEk && <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                                {hasOther && <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                                {hasPur && <div className="h-2 w-2 rounded-full bg-white border border-slate-400" />}
                                {hasAma && <div className="h-2 w-2 rounded-full bg-slate-900 border border-slate-900" />}
                              </div>
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  <div className="bg-sky-50 rounded-[28px] p-5 border border-sky-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[11px] font-black text-blue-900 uppercase tracking-widest">Events</div>
                    </div>
                    <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1 scrollbar-hide">
                      {vaishnavEvents.filter(e => e.date === vaishnavSelectedDate).length === 0 ? (
                        <div className="text-[12px] font-bold text-blue-900/50">No events for selected date</div>
                      ) : (
                        vaishnavEvents
                          .filter(e => e.date === vaishnavSelectedDate)
                          .map((e, i) => (
                            <div key={i} className="bg-white rounded-2xl p-4 border border-white shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div className="text-[14px] font-black text-blue-900 leading-snug">{e.title}</div>
                                <div className={`shrink-0 px-2 py-1 rounded-full text-[9px] font-black ${
                                  e.type === 'ekadashi'
                                    ? 'bg-amber-100 text-amber-800'
                                    : e.type === 'other'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : e.type === 'purnima'
                                        ? 'bg-slate-100 text-slate-800'
                                        : 'bg-slate-900 text-white'
                                }`}>
                                  {e.type === 'ekadashi'
                                    ? 'EKADASHI'
                                    : e.type === 'other'
                                      ? 'EVENT'
                                      : e.type === 'purnima'
                                        ? 'PURNIMA'
                                        : 'AMAVASYA'}
                                </div>
                              </div>
                              {e.type === 'ekadashi' && (
                                <div className="mt-2 text-[12px] font-black text-blue-900/60">পারণ: {e.parana}</div>
                              )}
                              {(e.type === 'amavasya' || e.type === 'purnima') && (
                                <div className="mt-2 text-[12px] font-black text-blue-900/60">
                                  শুরু: {e.start}
                                  <span className="mx-2">|</span>
                                  শেষ: {e.end}
                                </div>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {vaishnavPopupDate && vaishnavPopupEvents.length > 0 && (
                    <div
                      className="fixed inset-0 z-[17000] bg-blue-950/55 backdrop-blur-sm flex items-center justify-center p-4"
                      onClick={() => setVaishnavPopupDate(null)}
                    >
                      <div
                        className="w-full max-w-sm rounded-[30px] bg-white p-5 shadow-2xl border border-sky-100 animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-900/50">Event Details</div>
                            <div className="text-[15px] font-black text-blue-900 mt-1">{vaishnavPopupDate}</div>
                          </div>
                          <button
                            onClick={() => setVaishnavPopupDate(null)}
                            className="h-10 w-10 rounded-full bg-sky-50 text-blue-700 flex items-center justify-center active:scale-95 transition-transform"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-hide">
                          {vaishnavPopupEvents.map((e, i) => (
                            <div key={i} className="rounded-2xl bg-sky-50 border border-sky-100 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="text-[14px] font-black text-blue-900 leading-snug">{e.title}</div>
                                <div className={`shrink-0 px-2 py-1 rounded-full text-[9px] font-black ${
                                  e.type === 'ekadashi'
                                    ? 'bg-amber-100 text-amber-800'
                                    : e.type === 'other'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : e.type === 'purnima'
                                        ? 'bg-slate-100 text-slate-800'
                                        : 'bg-slate-900 text-white'
                                }`}>
                                  {e.type === 'ekadashi'
                                    ? 'EKADASHI'
                                    : e.type === 'other'
                                      ? 'EVENT'
                                      : e.type === 'purnima'
                                        ? 'PURNIMA'
                                        : 'AMAVASYA'}
                                </div>
                              </div>

                              {e.type === 'ekadashi' && (
                                <div className="mt-2 text-[12px] font-black text-blue-900/65">পারণ: {e.parana}</div>
                              )}

                              {(e.type === 'amavasya' || e.type === 'purnima') && (
                                <div className="mt-2 text-[12px] font-black text-blue-900/65">
                                  শুরু: {e.start}
                                  <span className="mx-2">|</span>
                                  শেষ: {e.end}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTool === 'timer' && (
                <div className="flex flex-col items-center justify-center py-10 space-y-10 animate-in fade-in">
                  <div className="h-52 w-52 rounded-full border-[10px] border-white flex items-center justify-center bg-sky-50 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-700 opacity-10" style={{ height: `${(time % 60) * 1.66}%`, top: 'auto', bottom: 0 }}></div>
                    <span className="text-4xl font-black text-blue-900 tracking-widest">{formatTime(time)}</span>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setIsTimerRunning(r => !r)}
                      className="px-8 py-4 bg-blue-700 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all"
                    >
                      {isTimerRunning ? 'Pause' : 'Start'}
                    </button>
                    <button
                      onClick={() => { setIsTimerRunning(false); setTime(0); }}
                      className="px-8 py-4 bg-white text-blue-900 rounded-2xl font-black shadow-xl active:scale-95 transition-all"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {activeTool === 'note' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-4">
                    <textarea
                      className="w-full h-36 bg-white border-2 border-sky-50 p-5 rounded-[28px] focus:outline-none focus:border-blue-500 font-bold text-blue-900 resize-none shadow-sm text-sm"
                      placeholder="Type your note here..."
                      onChange={e => setNoteInput(e.target.value)}
                      value={noteInput}
                    />
                    <button onClick={saveNote} className="w-full bg-blue-700 text-white py-3.5 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                      <Plus size={20} /> Save Note
                    </button>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-sky-50">
                    <h5 className="text-[9px] font-black text-blue-900/30 uppercase tracking-widest px-2">Notebook ({savedNotes.length})</h5>
                    {savedNotes.length === 0 ? (
                      <div className="text-center py-12 opacity-10 flex flex-col items-center gap-2"><StickyNote size={48} /><p className="text-[10px] font-black uppercase">No saved data</p></div>
                    ) : (
                      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-hide">
                        {savedNotes.map(note => (
                          <div key={note.id} className="bg-white border border-sky-50 p-5 rounded-[24px] shadow-sm animate-in slide-in-from-bottom-2">
                             <p className="text-blue-900 font-bold text-sm leading-relaxed whitespace-pre-wrap">{note.text}</p>
                             <div className="flex items-center justify-between mt-3 pt-3 border-t border-sky-50">
                               <span className="text-[8px] font-bold text-blue-300">{note.date}</span>
                               <button onClick={() => deleteNote(note.id)} className="text-red-300 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {view === 'gitaAudio' && (
          <GitaAudioScreen
            selectedChapterId={gitaAudioChapterId}
            onSelectChapter={setGitaAudioChapterId}
            normalizeAudioUrl={normalizePdfAudioUrl}
            onPlayingStateChange={setIsStandaloneGitaAudioPlaying}
            isOffline={isOffline}
            checkIsOnline={checkIsOnline}
            onRequireInternet={() => setNoInternetReason('audio')}
          />
        )}
      </main>

      {/* Custom 'No Internet' Modal */}
      {noInternetReason && (
        <div className="fixed inset-0 bg-blue-950/90 backdrop-blur-2xl z-[18000] flex items-center justify-center p-8">
          <div className="bg-white rounded-[40px] w-full max-w-[340px] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="h-20 w-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <WifiOff size={40} className="text-amber-500"/>
            </div>
            <h3 className="text-xl font-black text-blue-950 mb-4 brand-font leading-tight">
              {noInternetReason === 'audio' ? 'ইন্টারনেট সংযোগ প্রয়োজন!' : 'ইন্টারনেট সংযোগ নেই!'}
            </h3>
            <p className="text-blue-900/70 font-bold text-xs mb-8 leading-relaxed px-2">
              {noInternetReason === 'audio'
                ? 'অডিও ও মিউজিক শুনতে ইন্টারনেট সংযোগ লাগবে। ইন্টারনেট ছাড়া অডিও চলবে না। তবে আপনার ডাউনলোড করা পিডিএফগুলো ইন্টারনেট ছাড়াই পড়তে পারবেন।'
                : noInternetReason === 'pdf'
                ? 'নতুন পিডিএফ ডাউনলোড করতে ইন্টারনেট সংযোগ প্রয়োজন। আগে থেকে ডাউনলোড করা পিডিএফগুলো ইন্টারনেট ছাড়াই খুলতে পারবেন।'
                : 'এই সুবিধাটি ব্যবহার করতে আপনার ডিভাইসে ইন্টারনেট কানেকশন প্রয়োজন। দয়া করে ইন্টারনেট চালু করুন।'}
            </p>
            <button 
              onClick={() => setNoInternetReason(null)} 
              className="w-full py-4 bg-blue-700 text-white rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}

      {/* Delete Downloaded PDF Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-blue-950/80 backdrop-blur-md z-[15000] flex items-center justify-center p-6"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-[32px] w-full max-w-[330px] p-7 text-center shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={30} className="text-rose-500" />
            </div>
            <h3 className="text-lg font-black text-blue-950 mb-2 leading-tight">
              ডাউনলোড মুছে ফেলবেন?
            </h3>
            <p className="text-slate-600 font-semibold text-xs mb-6 leading-relaxed">
              “{deleteTarget.title}” মোবাইলের স্টোরেজ থেকে মুছে ফেলা হবে। পরবর্তীতে পড়তে হলে আবার ডাউনলোড করতে হবে।
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-2xl font-black text-xs active:scale-95 transition-all"
              >
                বাতিল
              </button>
              <button
                onClick={async () => {
                  const keyToDelete = deleteTarget.cacheKey;
                  setDeleteTarget(null);
                  await pdfDownloadManager.deleteDownloadedPdf(keyToDelete);
                }}
                className="flex-1 py-3.5 bg-rose-600 text-white rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all"
              >
                ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edge-to-Edge PDF Viewer Outside Main Wrapper */}
      {view === 'content' && currentChapter && (
        <div className="fixed inset-0 bg-[#0e1015] z-[9999] flex flex-col animate-in fade-in duration-200">
          {showPdfAudioPlayer && (
            <audio
              ref={audioRef}
              src={normalizePdfAudioUrl(pdfAudioUrls[pdfAudioIndex] || DEFAULT_PDF_AUDIO_URL)}
              onError={() => {
                setIsPdfAudioPlaying(false);
                setPdfAudioError(`শ্লোক-${pdfAudioIndex + 1} play করা যাচ্ছে না`);
              }}
              onEnded={() => {
                if (pdfAudioUrls.length > 1) {
                  setPdfAudioIndex(i => (i + 1) % pdfAudioUrls.length);
                  setIsPdfAudioPlaying(true);
                } else {
                  setIsPdfAudioPlaying(false);
                }
              }}
              onPlay={() => setIsPdfAudioPlaying(true)}
              onPause={() => setIsPdfAudioPlaying(false)}
              preload="none"
            />
          )}

          {showPdfAudioPlayer && showPdfAudioList && (
            <div className="fixed inset-0 z-[16000] bg-blue-950/75 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowPdfAudioList(false)}>
              <div className="w-full max-w-md rounded-[28px] border border-white/10 shadow-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(12,74,110,0.98), rgba(3,105,161,0.98))' }} onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 flex items-center justify-between">
                  <div className="text-white font-black text-sm tracking-tight">শ্লোক অডিও প্লেলিস্ট</div>
                  <button className="p-2 bg-white/10 rounded-xl border border-white/10 text-white/90" onClick={() => setShowPdfAudioList(false)} aria-label="Close">
                    <X size={18} />
                  </button>
                </div>

                <div className="px-6 pb-6">
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 scrollbar-hide">
                    {pdfAudioItems.map(item => (
                    <div key={item.index} className={`p-4 rounded-2xl border ${pdfAudioIndex === item.index ? 'bg-white/20 border-white/30 ring-2 ring-white/20' : 'bg-white/10 border-white/10'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-white font-black text-xs mb-1 truncate">{item.label}</div>
                          {!shouldHidePdfAudioLinks && (
                            <div className="text-white/60 text-[10px] break-all">{pdfAudioUrls[item.index] || ''}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {pdfAudioIndex === item.index && isPdfAudioPlaying && (
                            <div className="flex items-end gap-0.5 h-3 pr-1" aria-label="Playing">
                              <div className="w-0.5 bg-white/90 rounded-full animate-pulse" style={{ height: '6px' }} />
                              <div className="w-0.5 bg-white/90 rounded-full animate-pulse" style={{ height: '10px', animationDelay: '120ms' }} />
                              <div className="w-0.5 bg-white/90 rounded-full animate-pulse" style={{ height: '7px', animationDelay: '240ms' }} />
                            </div>
                          )}
                          <button
                            onClick={() => {
                              if (!checkIsOnline()) {
                                setIsPdfAudioPlaying(false);
                                setPdfAudioError('অডিও শুনতে ইন্টারনেট সংযোগ লাগবে');
                                setNoInternetReason('audio');
                                return;
                              }
                              setPdfAudioIndex(item.index);
                              setIsPdfAudioPlaying(true);
                            }}
                            className="p-2 bg-white rounded-xl shadow-sm active:scale-95 transition-all"
                            aria-label="Select"
                          >
                            <Play size={16} className="text-blue-900" />
                          </button>
                          {!shouldHidePdfAudioLinks && (
                            <button
                              onClick={() => {
                                const url = window.prompt('Audio link দিন (mp3/wav):', pdfAudioUrls[item.index] || DEFAULT_PDF_AUDIO_URL);
                                if (!url || !url.trim()) return;
                                const clean = url.trim();

                                setPdfAudioUrls(prev => {
                                  const next = [...prev];
                                  next[item.index] = clean;
                                  try {
                                    if (currentSubject && currentChapter) {
                                      const key = `pdf_audio_playlist_${currentSubject.id}_${currentChapter.id}`;
                                      localStorage.setItem(key, JSON.stringify(next));
                                    }
                                  } catch { }
                                  return next;
                                });
                              }}
                              className="p-2 bg-white/10 rounded-xl border border-white/10 text-white/90"
                              aria-label="Edit"
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <CustomPdfViewer
            subjectName={currentSubject?.name}
            title={currentChapter.title}
            pdfUrl={currentChapter.pdfUrl}
            cacheKey={getChapterCacheKey(currentSubject?.id || '1', currentChapter.id, currentChapter.pdfUrl)}
            onBack={() => setView('chapters')}
            hasAudioBar={showPdfAudioPlayer}
            isAudioPlaying={isPdfAudioPlaying}
            rotation={currentChapter.rotation || 0}
            enhanceScan={!!currentChapter.enhanceScan}
            isOffline={isOffline}
            checkIsOnline={checkIsOnline}
            onRequireInternetForAudio={() => setNoInternetReason('audio')}
            audioBarNode={
              showPdfAudioPlayer ? (
                <div
                  className="w-full rounded-2xl px-3 py-2 border border-white/10 shadow-md"
                  style={{ backgroundColor: '#0c4a6e' }}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Music size={15} className="text-sky-300 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-0.5 rounded-full bg-white/15 border border-white/10 text-white text-[10px] font-black tracking-tight">
                            শ্লোক-{pdfAudioIndex + 1} / {pdfAudioUrls.length}
                          </div>
                          {isPdfAudioPlaying && (
                            <div className="flex items-end gap-0.5 h-3" aria-label="Playing">
                              <div className="w-0.5 bg-sky-300 rounded-full animate-pulse" style={{ height: '6px' }} />
                              <div className="w-0.5 bg-sky-300 rounded-full animate-pulse" style={{ height: '10px', animationDelay: '120ms' }} />
                              <div className="w-0.5 bg-sky-300 rounded-full animate-pulse" style={{ height: '7px', animationDelay: '240ms' }} />
                              <div className="w-0.5 bg-sky-300 rounded-full animate-pulse" style={{ height: '11px', animationDelay: '360ms' }} />
                            </div>
                          )}
                        </div>
                        {pdfAudioError && (
                          <div className="mt-0.5 text-[10px] font-bold text-rose-200 truncate">
                            {pdfAudioError}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          if (pdfAudioUrls.length <= 1) return;
                          if (!checkIsOnline()) {
                            setIsPdfAudioPlaying(false);
                            setPdfAudioError('অডিও শুনতে ইন্টারনেট সংযোগ লাগবে');
                            setNoInternetReason('audio');
                            return;
                          }
                          setPdfAudioIndex(i => (i - 1 + pdfAudioUrls.length) % pdfAudioUrls.length);
                          setIsPdfAudioPlaying(true);
                        }}
                        className="p-2 bg-white/10 rounded-xl border border-white/10 shadow-sm active:scale-90 transition-all"
                        aria-label="Previous audio"
                        disabled={pdfAudioUrls.length <= 1}
                      >
                        <SkipBack size={16} className={pdfAudioUrls.length <= 1 ? 'text-white/30' : 'text-white/90'} />
                      </button>

                      <button
                        onClick={() => {
                          const a = audioRef.current;
                          if (!a) return;
                          if (a.paused) {
                            if (!checkIsOnline()) {
                              setIsPdfAudioPlaying(false);
                              setPdfAudioError('অডিও শুনতে ইন্টারনেট সংযোগ লাগবে');
                              setNoInternetReason('audio');
                              return;
                            }
                            setPdfAudioError(null);
                            a.play().then(() => setIsPdfAudioPlaying(true)).catch(() => {
                              setIsPdfAudioPlaying(false);
                              setPdfAudioError(`শ্লোক-${pdfAudioIndex + 1} play করা যাচ্ছে না। ইন্টারনেট পরীক্ষা করুন।`);
                            });
                          } else {
                            a.pause();
                            setIsPdfAudioPlaying(false);
                          }
                        }}
                        className="p-2 bg-white rounded-xl shadow-sm active:scale-90 transition-all"
                        aria-label={isPdfAudioPlaying ? 'Pause audio' : 'Play audio'}
                      >
                        {isPdfAudioPlaying ? <Pause size={16} className="text-blue-900" /> : <Play size={16} className="text-blue-900 ml-0.5" />}
                      </button>

                      <button
                        onClick={() => {
                          if (pdfAudioUrls.length <= 1) return;
                          if (!checkIsOnline()) {
                            setIsPdfAudioPlaying(false);
                            setPdfAudioError('অডিও শুনতে ইন্টারনেট সংযোগ লাগবে');
                            setNoInternetReason('audio');
                            return;
                          }
                          setPdfAudioIndex(i => (i + 1) % pdfAudioUrls.length);
                          setIsPdfAudioPlaying(true);
                        }}
                        className="p-2 bg-white/10 rounded-xl border border-white/10 shadow-sm active:scale-90 transition-all"
                        aria-label="Next audio"
                        disabled={pdfAudioUrls.length <= 1}
                      >
                        <SkipForward size={16} className={pdfAudioUrls.length <= 1 ? 'text-white/30' : 'text-white/90'} />
                      </button>

                      <button
                        onClick={() => {
                          if (!checkIsOnline()) {
                            setNoInternetReason('audio');
                            return;
                          }
                          setShowPdfAudioList(true);
                        }}
                        className="px-2.5 py-2 bg-white/15 rounded-xl border border-white/10 shadow-sm text-[10px] font-black text-white active:scale-95 transition-all"
                      >
                        শ্লোক
                      </button>
                    </div>
                  </div>
                </div>
              ) : null
            }
          />
        </div>
      )}

      {/* High-end Floating Update Coming Soon Notification */}
      {showComingSoon && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[11000] animate-in slide-in-from-top-6 fade-in duration-500 pointer-events-none">
          <div className="bg-blue-950/95 backdrop-blur-[30px] px-8 py-5 rounded-[32px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/20 flex items-center gap-4">
            <div className="h-10 w-10 bg-sky-400/20 rounded-2xl flex items-center justify-center animate-bounce">
              <AlertCircle size={22} className="text-sky-300" />
            </div>
            <div className="text-left">
              <p className="text-white font-black text-sm tracking-tight leading-none mb-1">আপডেট শীঘ্রই আসছে</p>
              <p className="text-sky-300/50 text-[9px] font-bold uppercase tracking-[0.2em]">STAY TUNED WITH US</p>
            </div>
          </div>
        </div>
      )}
      {view !== 'content' && (
        <nav className="fixed bottom-4 left-4 right-4 fixed-bottom-nav px-4 py-3 flex justify-around items-center text-white/30">
          <button
            onClick={() => { setIsSearchOpen(false); setView('subjects'); setCurrentSubject(null); }}
            className={`flex flex-col items-center gap-1 transition-all ${view==='subjects' && !isSearchOpen ?'text-sky-300 scale-110':'text-sky-100/40'}`}
          >
            <Home size={21}/>
            <span className="text-[9px] font-bold tracking-tight">Home</span>
          </button>

          <button
            onClick={() => {
              if (!checkIsOnline()) {
                setNoInternetReason('audio');
                return;
              }
              setIsSearchOpen(false);
              if (view === 'gitaAudio' && gitaAudioChapterId) {
                setGitaAudioChapterId(null);
              } else {
                setView('gitaAudio');
              }
            }}
            className={`relative flex flex-col items-center gap-1 transition-all ${view==='gitaAudio' && !isSearchOpen ?'text-sky-300 scale-110':'text-sky-100/40'}`}
          >
            <Headphones size={21} className={isStandaloneGitaAudioPlaying ? 'animate-pulse' : ''} />
            <span className="text-[9px] font-bold tracking-tight">গীতা অডিও</span>
            {isStandaloneGitaAudioPlaying && (
              <span className="absolute -top-0.5 right-1 w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            onClick={() => setIsSearchOpen(true)}
            className={`flex flex-col items-center gap-1 transition-all ${isSearchOpen?'text-sky-300 scale-110':'text-sky-100/40'}`}
          >
            <Search size={21}/>
            <span className="text-[9px] font-bold tracking-tight">Search</span>
          </button>

          <button
            onClick={() => { setIsSearchOpen(false); handleToolClick(activeTool); }}
            className={`flex flex-col items-center gap-1 transition-all ${view==='tools' && !isSearchOpen ?'text-sky-300 scale-110':'text-sky-100/40'}`}
          >
            <Wrench size={21}/>
            <span className="text-[9px] font-bold tracking-tight">Tools</span>
          </button>
        </nav>
      )}

      {/* Extreme Zoom Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-blue-950/98 backdrop-blur-[40px] z-[8000] flex flex-col animate-in fade-in zoom-in-75 slide-in-from-bottom-12 duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
          <div className="flex flex-col p-6 h-full origin-center">
            <div className="flex gap-4 mb-10 mt-4 animate-in slide-in-from-top-6 duration-700 delay-150 fill-mode-both">
              <div className="relative flex-1 group">
                <input 
                  autoFocus 
                  type="text" 
                  placeholder="Search chapters..." 
                  className="w-full bg-white/10 border border-white/20 rounded-full py-5 pl-14 pr-6 text-white placeholder-sky-200/40 focus:outline-none focus:ring-4 focus:ring-sky-400/30 font-bold transition-all duration-300" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-sky-400 group-focus-within:text-white group-focus-within:scale-110 transition-all" size={24} />
              </div>
              <button 
                onClick={() => {setIsSearchOpen(false); setSearchQuery('');}} 
                className="p-4 bg-white/10 rounded-full text-white shadow-lg active:scale-75 active:rotate-180 transition-all duration-500 ease-out"
              >
                <X size={28}/>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pb-32 scrollbar-hide">
              {searchQuery.trim() === '' ? (
                <div className="flex flex-col items-center justify-center py-24 text-center opacity-30 gap-4 animate-in zoom-in-50 fade-in duration-1000">
                   <div className="p-8 rounded-full bg-white/5 border border-white/10">
                     <Search size={60} className="text-white animate-pulse"/>
                   </div>
                   <p className="text-white font-black tracking-[0.2em] uppercase text-[10px]">Start your search journey...</p>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((res: any, idx: number) => (
                  <button 
                    key={idx} 
                    onClick={() => handleChapterClick(res.chapter, res.subject)} 
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-[28px] flex items-center justify-between group active:scale-[0.95] transition-all animate-in slide-in-from-bottom-10 duration-500 ease-out"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 flex items-center justify-center icon-glow">
                        <div className="text-2xl group-hover:scale-110 transition-all duration-300">{res.subject.icon}</div>
                      </div>
                      <div className="text-left">
                        <p className="text-white font-black text-sm mb-1 leading-tight group-hover:text-sky-300 transition-colors">{res.chapter.title}</p>
                        <p className="text-sky-300/40 text-[8px] font-black uppercase tracking-widest">{res.subject.name}</p>
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                      <BookOpen size={18} className="text-sky-400 group-hover:text-white group-hover:rotate-12 transition-all" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center opacity-30 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <p className="text-white font-black uppercase tracking-widest text-[10px]">Nothing matched your query</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drawer Overlay */}
      <div className={`fixed inset-0 bg-blue-950/60 backdrop-blur-md z-[5000] transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={toggleDrawer}>
        <div className={`absolute top-4 left-4 h-[calc(100%-32px)] w-[88%] max-w-[340px] drawer-card transition-transform duration-500 shadow-2xl flex flex-col ${isDrawerOpen ? 'translate-x-0' : '-translate-x-[110%]'}`} onClick={e=>e.stopPropagation()}>
          <div className="p-8 relative shrink-0">
            <button onClick={toggleDrawer} className="absolute top-8 right-8 text-white/50"><X size={30}/></button>
            <div className="flex flex-col items-center text-center mt-6">
              <div className="h-20 w-20 bg-white rounded-[32px] p-0 overflow-hidden shadow-xl flex items-center justify-center mb-6">
                <img src={LOGO_GIF} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-2xl font-black text-white brand-font tracking-tight leading-none mb-1">শ্রীমদ্ভগবদ গীতা যথাযথ</h3>
              <p className="text-sky-200/60 text-[10px] font-black tracking-[0.2em]">অডিও সহ</p>
            </div>
          </div>

          <div className="px-6 space-y-3 overflow-y-auto grow scrollbar-hide">
            <button onClick={() => { setShowPrivacyModal(true); setIsDrawerOpen(false); }} className="flex items-center gap-5 w-full p-4 rounded-[22px] bg-white/10 text-white font-black text-xs border border-white/5 active:scale-95 transition-all">
               <Shield size={20} className="text-sky-300"/> Privacy Policy
            </button>
            <button onClick={() => { setShowAdminPopup(true); setIsDrawerOpen(false); }} className="flex items-center gap-5 w-full p-4 rounded-[22px] bg-white/10 text-white font-black text-xs border border-white/5 active:scale-95 transition-all">
               <MessageCircle size={20} className="text-sky-300"/> Admin Support
            </button>
            <button onClick={() => { setIsDrawerOpen(false); window.Android?.openPlayStore?.(); }} className="flex items-center justify-center gap-4 w-full py-4 px-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-black text-sm shadow-xl transform active:scale-95 hover:scale-[1.02] transition-all border border-yellow-600/20">
              <Star size={20} className="text-white"/> <span className="ml-2">Rate This App</span>
            </button>
            <div className="pt-6 border-t border-white/10">
               <button onClick={() => setShowExitPopup(true)} className="flex items-center gap-5 w-full p-4 rounded-[22px] bg-red-500/20 text-white font-black text-xs border border-white/5 active:scale-95 transition-all">
                  <LogOut size={20} className="text-red-300"/> Exit App
               </button>
            </div>
          </div>

          <div className="shrink-0 px-6 pt-3 pb-6 border-t border-white/10">
            <div className="h-[190px] w-full flex items-end justify-center overflow-hidden">
              <img src={PROVHUPAD_IMAGE} className="w-full max-w-[220px] h-[250px] object-cover object-bottom opacity-95 select-none pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Support Popup */}
      {showAdminPopup && (
        <div className="fixed inset-0 bg-blue-950/90 backdrop-blur-3xl z-[9000] flex items-center justify-center p-8">
          <div className="bg-white rounded-[40px] w-full max-w-[340px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="h-16 w-16 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle size={30} className="text-blue-700"/>
            </div>
            <h3 className="text-xl font-black text-blue-950 mb-4 brand-font leading-tight">Admin Support</h3>
            <p className="text-blue-900/60 font-bold text-xs mb-8 leading-relaxed px-2">
              যদি কোনো চ্যাপ্টার ওপেন হতে প্রবলেম হয় আমার সাথে যোগাযোগ করুন সাথে সাথে
            </p>
            <div className="space-y-3 mb-8">
              <a href="https://wa.me/qr/2BNZLW7EGN5NH1" target="_blank" className="flex items-center justify-center gap-3 w-full bg-[#25D366] text-white py-4 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all">
                <MessageCircle size={18}/> WhatsApp
              </a>
              <a href="mailto:gyansohayota@gmail.com" className="flex items-center justify-center gap-3 w-full bg-blue-700 text-white py-4 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all">
                <Mail size={18}/> Gmail
              </a>
            </div>
            <button onClick={() => setShowAdminPopup(false)} className="w-full py-4 bg-sky-50 text-blue-900 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-sky-100 active:bg-sky-100 transition-all">
              Close
            </button>
          </div>
        </div>
      )}

      {showExitPopup && (
        <div className="fixed inset-0 bg-blue-950/90 backdrop-blur-xl z-[9000] flex items-center justify-center p-8">
          <div className="bg-white rounded-[40px] w-full max-w-[320px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut size={28} className="text-red-500"/>
            </div>
            <h3 className="text-xl font-black text-blue-950 mb-2 brand-font leading-tight">আপনি কি অ্যাপ থেকে বের হতে চান?</h3>
            <p className="text-sm text-blue-900/70 mb-6 leading-relaxed px-2">
              আপনি যদি অ্যাপে থাকতে চান "না" চাপুন। অ্যাপ বন্ধ করতে "হ্যাঁ, বের হই" চাপুন। রেট করতে চাইলে নিচের বাটন ব্যবহার করুন।
            </p>
            <div className="grid gap-3">
              <button onClick={() => { setShowExitPopup(false); window.Android?.openPlayStore?.(); }} className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-black text-sm shadow-xl hover:scale-[1.01] active:scale-95 transition-all border border-yellow-600/20">
                Rate App
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowExitPopup(false)} className="py-4 bg-sky-50 text-blue-900 rounded-2xl font-black text-sm border border-sky-100 active:scale-95 transition-all">
                  না
                </button>
                <button onClick={() => {
                  setShowExitPopup(false)
                  window.Android?.exitApp?.()
                }} className="py-4 bg-blue-700 text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all">
                  হ্যাঁ, বের হই
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrivacyModal && (
        <div className="fixed inset-0 bg-blue-950/90 backdrop-blur-3xl z-[16000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[10px] w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300 scrollbar-hide">
            <div className="text-center mb-6">
              <div className="text-green-800 text-2xl font-black brand-font tracking-wide">PRIVACY POLICY</div>
              <div className="text-[10px] font-bold text-slate-500 mt-1">শ্রীমদ্ভগবদ গীতা যথাযথ | অডিও সহ</div>
            </div>

            <div className="space-y-6 text-blue-900 font-bold text-xs leading-relaxed">
               <p className="bg-sky-50 p-4 rounded-2xl border border-sky-100 italic">
                 This Privacy Policy explains how শ্রীমদ্ভগবদ গীতা যথাযথ | অডিও সহ collects, uses, and protects information when you use this ad-supported educational app.
               </p>

               <div className="space-y-3">
                  <div className="flex items-center gap-3 text-blue-700 mb-1">
                    <Eye size={18} className="shrink-0" />
                    <span className="font-black text-sm uppercase">1. Information We Collect</span>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    We do not require account registration and we do not directly ask for sensitive personal information to use the app. If you use the Notes feature, your notes are stored locally on your device. We may also process limited technical information such as app usage events, network status, and device-related identifiers when required for ads, app functionality, security, and performance.
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="flex items-center gap-3 text-blue-700 mb-1">
                    <FileText size={18} className="shrink-0" />
                    <span className="font-black text-sm uppercase">2. Ads and Third-Party Services</span>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    This app may display ads through Google AdMob. Ad providers may collect information such as Advertising ID, approximate location derived from IP, device information, diagnostic data, and ad interaction data to deliver, improve, and measure ads, and to prevent fraud or abuse. The app also opens some educational content inside a WebView and may load third-party content providers such as PDF or flipbook services. Those third-party services operate under their own privacy policies and terms.
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="flex items-center gap-3 text-blue-700 mb-1">
                    <Lock size={18} className="shrink-0" />
                    <span className="font-black text-sm uppercase">3. Permissions and App Functionality</span>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    The app uses Internet access to load online PDFs, flipbooks, audio, support links, and ad content. It uses network state access to understand connectivity and improve loading behavior. The app may also use the Advertising ID permission for advertising and fraud prevention where applicable. We work to keep data use minimal and relevant to app features.
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="flex items-center gap-3 text-blue-700 mb-1">
                    <Info size={18} className="shrink-0" />
                    <span className="font-black text-sm uppercase">4. Data Storage and Security</span>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    Notes created inside the app are stored locally on your device unless a third-party service is intentionally opened by you. While we take reasonable steps to support secure app behavior, no internet transmission or electronic storage method can be guaranteed to be completely secure.
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="flex items-center gap-3 text-blue-700 mb-1">
                    <Info size={18} className="shrink-0" />
                    <span className="font-black text-sm uppercase">5. Children’s Privacy</span>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    This app is designed as an educational and devotional guide for a general audience, including students. We do not knowingly collect personal information from children directly. If you believe a child has provided personal information through a third-party service linked from the app, please contact the relevant service provider and also contact us.
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="flex items-center gap-3 text-blue-700 mb-1">
                    <AlertCircle size={18} className="shrink-0" />
                    <span className="font-black text-sm uppercase">6. Your Choices</span>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    You may stop using the app at any time. You may clear locally stored notes by deleting them inside the app or uninstalling the app. You can also manage advertising preferences through your Google or device ad settings, where available.
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="flex items-center gap-3 text-blue-700 mb-1">
                    <FileText size={18} className="shrink-0" />
                    <span className="font-black text-sm uppercase">7. Policy Updates</span>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    We may update this Privacy Policy from time to time to reflect app improvements, legal requirements, or advertising/service changes. Updated versions will be made available inside the app or through the published privacy policy page.
                  </div>
               </div>

               <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-blue-700 mb-4">
                    <Mail size={18} className="shrink-0" />
                    <span className="font-black text-sm uppercase">Contact Us</span>
                  </div>
                  <div className="bg-blue-700 text-white p-6 rounded-3xl shadow-xl">
                    <p className="text-[10px] opacity-80 mb-1 font-black uppercase tracking-widest">Developer</p>
                    <p className="text-sm font-black tracking-tight mb-3">Gyan Sohayota</p>
                    <p className="text-[10px] opacity-80 mb-1 font-black uppercase tracking-widest">Support Email</p>
                    <p className="text-lg font-black tracking-tight">gyansohayota@gmail.com</p>
                  </div>
               </div>
            </div>
            
            <button onClick={() => setShowPrivacyModal(false)} className="w-full bg-green-700 text-white py-4 rounded-[6px] font-black mt-8 shadow-xl text-xs active:scale-95 transition-all uppercase tracking-widest">
              Agree
            </button>
          </div>
        </div>
      )}

      {showSourcesModal && (
        <div className="fixed inset-0 bg-blue-950/90 backdrop-blur-3xl z-[16000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[10px] w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300 scrollbar-hide">
            <div className="text-center mb-6">
              <div className="text-green-800 text-2xl font-black brand-font tracking-wide">DISCLAIMER</div>
              <div className="text-[10px] font-bold text-slate-500 mt-1">Official Sources</div>
            </div>

            <div className="space-y-4 text-slate-800 font-bold text-xs leading-relaxed">
              <div className="bg-sky-50 p-4 rounded-lg border border-sky-100">
                This app is an independent educational guide. It is <span className="font-black">not affiliated with, endorsed by, or representing</span> any government entity of Bangladesh.
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                Some educational content and references may relate to government/public education information. For the official and original sources, please use the links below:
              </div>

              <div className="space-y-2">
                <a className="block underline text-blue-700 break-all" href="https://nctb.gov.bd/" target="_blank" rel="noreferrer">https://nctb.gov.bd/</a>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                Note: PDFs/flipbooks may be displayed via third-party viewers (for example Heyzine). Those websites have their own privacy policies and terms.
              </div>
            </div>

            <button onClick={() => setShowSourcesModal(false)} className="w-full bg-green-700 text-white py-4 rounded-[6px] font-black mt-8 shadow-xl text-xs active:scale-95 transition-all uppercase tracking-widest">
              Agree
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;




