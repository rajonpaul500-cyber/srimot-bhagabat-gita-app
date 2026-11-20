import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Music,
  Headphones,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat1,
  Volume2,
  Loader2,
  ListMusic,
  ChevronRight,
  AlertCircle,
  WifiOff
} from 'lucide-react';
import { SUBJECTS_DATA } from './constants';
import { GITA_CHAPTER_1_TO_18_AUDIO_URLS } from './gitaChapter1To18Audio';

interface GitaAudioScreenProps {
  selectedChapterId: string | null;
  onSelectChapter: (chapterId: string | null) => void;
  normalizeAudioUrl: (url: string) => string;
  onPlayingStateChange?: (playing: boolean) => void;
  isOffline?: boolean;
  checkIsOnline?: () => boolean;
  onRequireInternet?: () => void;
}

const toBengaliDigits = (n: number | string): string => {
  const map: Record<string, string> = {
    '0': '০',
    '1': '১',
    '2': '২',
    '3': '৩',
    '4': '৪',
    '5': '৫',
    '6': '৬',
    '7': '৭',
    '8': '৮',
    '9': '৯'
  };
  return String(n).replace(/[0-9]/g, d => map[d] || d);
};

const formatAudioTime = (sec: number): string => {
  if (!isFinite(sec) || sec < 0) return '00:00';
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const GitaAudioScreen: React.FC<GitaAudioScreenProps> = ({
  selectedChapterId,
  onSelectChapter,
  normalizeAudioUrl,
  onPlayingStateChange,
  isOffline = false,
  checkIsOnline,
  onRequireInternet
}) => {
  const ensureInternetForAudio = useCallback((): boolean => {
    const online = checkIsOnline ? checkIsOnline() : navigator.onLine;
    if (!online) {
      const a = audioRef.current;
      if (a && !a.paused) {
        a.pause();
      }
      setIsPlaying(false);
      setIsBuffering(false);
      setAudioError('অডিও শুনতে ইন্টারনেট সংযোগ লাগবে। ইন্টারনেট ছাড়া অডিও চলবে না।');
      onRequireInternet?.();
      return false;
    }
    return true;
  }, [checkIsOnline, onRequireInternet]);
  const chapters = useMemo(() => {
    const gitaChapters = SUBJECTS_DATA['3']?.chapters || [];
    return gitaChapters
      .filter(ch => {
        const urls = GITA_CHAPTER_1_TO_18_AUDIO_URLS[ch.id];
        return Array.isArray(urls) && urls.length > 0;
      })
      .map((ch, idx) => ({
        id: ch.id,
        number: idx + 1,
        title: ch.title,
        urls: GITA_CHAPTER_1_TO_18_AUDIO_URLS[ch.id] || []
      }));
  }, []);

  const totalShlokas = useMemo(
    () => chapters.reduce((acc, ch) => acc + ch.urls.length, 0),
    [chapters]
  );

  // Playback state (persists while switching between chapter list and chapter detail)
  const [playingChapterId, setPlayingChapterId] = useState<string | null>(null);
  const [shlokaIndex, setShlokaIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [repeatOne, setRepeatOne] = useState<boolean>(false);
  const [autoNext, setAutoNext] = useState<boolean>(true);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldPlayOnLoadRef = useRef<boolean>(false);

  const activeChapter = useMemo(
    () => chapters.find(c => c.id === selectedChapterId) || null,
    [chapters, selectedChapterId]
  );

  const playingChapter = useMemo(
    () => chapters.find(c => c.id === playingChapterId) || null,
    [chapters, playingChapterId]
  );

  const currentTrackUrl = useMemo(() => {
    if (!playingChapter) return '';
    const raw = playingChapter.urls[shlokaIndex] || '';
    return raw ? normalizeAudioUrl(raw) : '';
  }, [playingChapter, shlokaIndex, normalizeAudioUrl]);

  useEffect(() => {
    onPlayingStateChange?.(isPlaying);
  }, [isPlaying, onPlayingStateChange]);

  // Cleanup audio on unmount (e.g. leaving gitaAudio view)
  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
      onPlayingStateChange?.(false);
    };
  }, [onPlayingStateChange]);

  // Trigger playback whenever track URL changes and autoplay was requested
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !currentTrackUrl) return;
    setAudioError(null);
    setCurrentTime(0);
    setDuration(0);
    a.load();
    if (shouldPlayOnLoadRef.current) {
      setIsBuffering(true);
      a.play()
        .then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setIsBuffering(false);
          setAudioError(`শ্লোক-${toBengaliDigits(shlokaIndex + 1)} চালু করা যাচ্ছে না। ইন্টারনেট সংযোগ পরীক্ষা করুন।`);
        });
    }
  }, [currentTrackUrl, shlokaIndex]);

  const playShloka = useCallback((chapterId: string, idx: number) => {
    setAudioError(null);
    const sameTrack = playingChapterId === chapterId && shlokaIndex === idx;
    if (sameTrack) {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) {
        if (!ensureInternetForAudio()) return;
        setIsBuffering(true);
        a.play()
          .then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
          })
          .catch(() => {
            setIsPlaying(false);
            setIsBuffering(false);
            setAudioError(`শ্লোক-${toBengaliDigits(idx + 1)} চালু করা যাচ্ছে না। ইন্টারনেট সংযোগ পরীক্ষা করুন।`);
          });
      } else {
        a.pause();
        setIsPlaying(false);
      }
      return;
    }

    if (!ensureInternetForAudio()) return;
    shouldPlayOnLoadRef.current = true;
    setPlayingChapterId(chapterId);
    setShlokaIndex(idx);
  }, [playingChapterId, shlokaIndex, ensureInternetForAudio]);

  const togglePlayPause = useCallback(() => {
    const targetChapter = activeChapter || playingChapter || chapters[0];
    if (!targetChapter) return;

    if (!playingChapterId) {
      playShloka(targetChapter.id, 0);
      return;
    }

    // If user is viewing a different chapter than what was playing, start this chapter's shloka 1
    if (activeChapter && playingChapterId !== activeChapter.id) {
      playShloka(activeChapter.id, 0);
      return;
    }

    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      if (!ensureInternetForAudio()) return;
      setAudioError(null);
      setIsBuffering(true);
      a.play()
        .then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setIsBuffering(false);
          setAudioError(`শ্লোক-${toBengaliDigits(shlokaIndex + 1)} চালু করা যাচ্ছে না। ইন্টারনেট সংযোগ পরীক্ষা করুন।`);
        });
    } else {
      a.pause();
      setIsPlaying(false);
    }
  }, [activeChapter, playingChapter, chapters, playingChapterId, playShloka, shlokaIndex, ensureInternetForAudio]);

  const handlePrevShloka = useCallback(() => {
    if (!ensureInternetForAudio()) return;
    const target = activeChapter || playingChapter;
    if (!target || target.urls.length === 0) return;
    const isSameChapter = playingChapterId === target.id;
    const prevIdx = isSameChapter
      ? (shlokaIndex - 1 + target.urls.length) % target.urls.length
      : 0;
    shouldPlayOnLoadRef.current = true;
    setPlayingChapterId(target.id);
    setShlokaIndex(prevIdx);
  }, [activeChapter, playingChapter, playingChapterId, shlokaIndex, ensureInternetForAudio]);

  const handleNextShloka = useCallback(() => {
    if (!ensureInternetForAudio()) return;
    const target = activeChapter || playingChapter;
    if (!target || target.urls.length === 0) return;
    const isSameChapter = playingChapterId === target.id;
    const nextIdx = isSameChapter
      ? (shlokaIndex + 1) % target.urls.length
      : 0;
    shouldPlayOnLoadRef.current = true;
    setPlayingChapterId(target.id);
    setShlokaIndex(nextIdx);
  }, [activeChapter, playingChapter, playingChapterId, shlokaIndex, ensureInternetForAudio]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const a = audioRef.current;
    if (a && isFinite(val)) {
      a.currentTime = val;
      setCurrentTime(val);
    }
  };

  return (
    <div className="space-y-4 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Hidden HTML5 Audio Engine */}
      <audio
        ref={audioRef}
        src={currentTrackUrl || undefined}
        preload="none"
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={e => {
          const el = e.currentTarget;
          setCurrentTime(el.currentTime || 0);
          if (isFinite(el.duration) && el.duration > 0) {
            setDuration(el.duration);
          }
        }}
        onLoadedMetadata={e => {
          const el = e.currentTarget;
          if (isFinite(el.duration) && el.duration > 0) {
            setDuration(el.duration);
          }
        }}
        onEnded={() => {
          const a = audioRef.current;
          if (repeatOne && a) {
            a.currentTime = 0;
            a.play().catch(() => setIsPlaying(false));
            return;
          }
          if (autoNext && playingChapter && shlokaIndex + 1 < playingChapter.urls.length) {
            shouldPlayOnLoadRef.current = true;
            setShlokaIndex(i => i + 1);
          } else {
            setIsPlaying(false);
          }
        }}
        onError={() => {
          if (!currentTrackUrl) return;
          setIsPlaying(false);
          setIsBuffering(false);
          setAudioError(`শ্লোক-${toBengaliDigits(shlokaIndex + 1)} প্লে করা যাচ্ছে না। ইন্টারনেট সংযোগ দেখুন।`);
        }}
      />

      {isOffline && (
        <div
          className="rounded-2xl p-3.5 border border-rose-300/80 backdrop-blur-md shadow-md flex items-center gap-3"
          style={{ backgroundColor: 'rgba(255, 241, 242, 0.92)' }}
        >
          <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <WifiOff size={18} />
          </div>
          <p className="text-xs font-extrabold text-rose-900 leading-snug">
            অডিও / মিউজিক শুনতে ইন্টারনেট সংযোগ লাগবে। ইন্টারনেট ছাড়া অডিও চলবে না।
          </p>
        </div>
      )}

      {/* LEVEL 1: CHAPTER LIST VIEW */}
      {!activeChapter ? (
        <>
          {/* Hero Summary Banner */}
          <div
            className="rounded-[24px] p-4 border border-white/75 backdrop-blur-md shadow-md flex items-center justify-between gap-3"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.68)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-800 text-white flex items-center justify-center shadow-md shrink-0">
                <Headphones size={24} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-slate-950 leading-tight">
                  গীতা শ্লোক অডিও
                </h2>
                <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                  অধ্যায়ভিত্তিক {toBengaliDigits(chapters.length)}টি অধ্যায় • {toBengaliDigits(totalShlokas)}টি শ্লোক
                </p>
              </div>
            </div>
            <span className="shrink-0 px-2.5 py-1 rounded-full bg-sky-600/15 border border-sky-700/20 text-blue-950 text-[10px] font-black">
              অডিও পাঠ
            </span>
          </div>

          {/* Sticky Now Playing Mini Bar when a track is active */}
          {playingChapter && (
            <div
              className="rounded-[22px] p-3.5 text-white shadow-xl border border-white/20 flex items-center justify-between gap-2.5"
              style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)' }}
            >
              <button
                onClick={() => onSelectChapter(playingChapter.id)}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <Volume2 size={18} className={isPlaying ? 'text-sky-300 animate-pulse' : 'text-white/80'} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-sky-200 truncate">
                    চলছে • শ্লোক-{toBengaliDigits(shlokaIndex + 1)} / {toBengaliDigits(playingChapter.urls.length)}
                  </p>
                  <p className="text-xs font-black text-white truncate leading-snug">
                    {playingChapter.title}
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handlePrevShloka}
                  className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center active:scale-90 transition-all"
                  aria-label="আগের শ্লোক"
                >
                  <SkipBack size={15} />
                </button>
                <button
                  onClick={togglePlayPause}
                  className="w-10 h-10 rounded-xl bg-white text-blue-950 flex items-center justify-center shadow active:scale-90 transition-all"
                  aria-label={isPlaying ? 'বিরতি' : 'চালু করুন'}
                >
                  {isBuffering ? (
                    <Loader2 size={17} className="animate-spin text-sky-700" />
                  ) : isPlaying ? (
                    <Pause size={17} />
                  ) : (
                    <Play size={17} className="ml-0.5" />
                  )}
                </button>
                <button
                  onClick={handleNextShloka}
                  className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center active:scale-90 transition-all"
                  aria-label="পরের শ্লোক"
                >
                  <SkipForward size={15} />
                </button>
              </div>
            </div>
          )}

          {/* 18 Chapters List */}
          <div className="space-y-2.5">
            {chapters.map(ch => {
              const isCurrentPlayingChapter = playingChapterId === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => onSelectChapter(ch.id)}
                  className={`w-full rounded-2xl p-3.5 border backdrop-blur-md shadow-sm flex items-center justify-between gap-3 text-left active:scale-[0.98] transition-all ${
                    isCurrentPlayingChapter
                      ? 'border-sky-400 ring-2 ring-sky-400/40 shadow-md'
                      : 'border-white/75'
                  }`}
                  style={{
                    backgroundColor: isCurrentPlayingChapter
                      ? 'rgba(255, 255, 255, 0.78)'
                      : 'rgba(255, 255, 255, 0.64)'
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                        isCurrentPlayingChapter
                          ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                          : 'bg-sky-100/90 text-blue-950 border-sky-200/80'
                      }`}
                    >
                      {toBengaliDigits(ch.number)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="text-slate-950 font-black text-sm block leading-snug">
                        {ch.title}
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-900 bg-sky-100/90 px-2 py-0.5 rounded-full border border-sky-200/80">
                          <ListMusic size={10} />
                          {toBengaliDigits(ch.urls.length)}টি শ্লোক অডিও
                        </span>
                        {isCurrentPlayingChapter && isPlaying && (
                          <span className="inline-flex items-end gap-0.5 h-3 px-1">
                            <span className="w-0.5 bg-sky-600 rounded-full animate-pulse" style={{ height: '6px' }} />
                            <span className="w-0.5 bg-sky-600 rounded-full animate-pulse" style={{ height: '11px', animationDelay: '120ms' }} />
                            <span className="w-0.5 bg-sky-600 rounded-full animate-pulse" style={{ height: '8px', animationDelay: '240ms' }} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-9 w-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm shrink-0">
                    <ChevronRight size={18} />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        /* LEVEL 2: SELECTED CHAPTER SHLOKA PLAYER + SHLOKA LIST */
        <>
          {/* Chapter Header + Back to Chapters */}
          <div
            className="rounded-2xl p-3 border border-white/75 backdrop-blur-md shadow-sm flex items-center gap-3"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.68)' }}
          >
            <button
              onClick={() => onSelectChapter(null)}
              className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm active:scale-90 transition-all shrink-0"
              aria-label="সকল অধ্যায়"
            >
              <ArrowLeft size={19} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-sky-800 uppercase tracking-wide">
                অধ্যায় {toBengaliDigits(activeChapter.number)} • {toBengaliDigits(activeChapter.urls.length)}টি শ্লোক
              </p>
              <h2 className="text-sm font-black text-slate-950 truncate leading-snug">
                {activeChapter.title}
              </h2>
            </div>
          </div>

          {/* Main Audio Player Card */}
          {(() => {
            const isThisChapterActive = playingChapterId === activeChapter.id;
            const displayIdx = isThisChapterActive ? shlokaIndex : 0;
            const displayIsPlaying = isThisChapterActive && isPlaying;
            const displayIsBuffering = isThisChapterActive && isBuffering;
            const displayCur = isThisChapterActive ? currentTime : 0;
            const displayDur = isThisChapterActive ? duration : 0;

            return (
              <div
                className="rounded-[28px] p-5 text-white shadow-2xl border border-white/20 space-y-4"
                style={{ background: 'linear-gradient(145deg, #082f49 0%, #0c4a6e 50%, #0369a1 100%)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                      <Music size={22} className={displayIsPlaying ? 'text-sky-300 animate-pulse' : 'text-white'} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/15 border border-white/15 text-[11px] font-black text-sky-100">
                          শ্লোক {toBengaliDigits(displayIdx + 1)} / {toBengaliDigits(activeChapter.urls.length)}
                        </span>
                        {displayIsPlaying && (
                          <div className="flex items-end gap-0.5 h-3.5" aria-label="Playing">
                            <div className="w-0.5 bg-sky-300 rounded-full animate-pulse" style={{ height: '7px' }} />
                            <div className="w-0.5 bg-sky-300 rounded-full animate-pulse" style={{ height: '13px', animationDelay: '120ms' }} />
                            <div className="w-0.5 bg-sky-300 rounded-full animate-pulse" style={{ height: '9px', animationDelay: '240ms' }} />
                            <div className="w-0.5 bg-sky-300 rounded-full animate-pulse" style={{ height: '12px', animationDelay: '360ms' }} />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-bold text-sky-100/90 truncate mt-1">
                        {activeChapter.title}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seekable Progress Slider */}
                <div className="space-y-1.5">
                  <input
                    type="range"
                    min={0}
                    max={displayDur > 0 ? displayDur : 100}
                    step={0.2}
                    value={displayDur > 0 ? Math.min(displayCur, displayDur) : 0}
                    onChange={handleSeek}
                    disabled={!isThisChapterActive || displayDur <= 0}
                    className="w-full h-1.5 rounded-full accent-sky-300 cursor-pointer disabled:opacity-40"
                    aria-label="Audio progress"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-sky-200/80">
                    <span>{formatAudioTime(displayCur)}</span>
                    <span>{formatAudioTime(displayDur)}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => setAutoNext(v => !v)}
                    className={`px-2.5 py-2 rounded-xl text-[10px] font-black border transition-all active:scale-95 ${
                      autoNext
                        ? 'bg-sky-400/25 border-sky-300/50 text-sky-100'
                        : 'bg-white/10 border-white/10 text-white/50'
                    }`}
                    title="স্বয়ংক্রিয়ভাবে পরের শ্লোক চলবে"
                  >
                    অটো পরেরটি
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrevShloka}
                      className="h-11 w-11 rounded-2xl bg-white/15 border border-white/15 flex items-center justify-center active:scale-90 transition-all"
                      aria-label="পূর্ববর্তী শ্লোক"
                    >
                      <SkipBack size={20} />
                    </button>

                    <button
                      onClick={togglePlayPause}
                      className="h-14 w-14 rounded-full bg-white text-blue-950 shadow-xl flex items-center justify-center active:scale-90 transition-all"
                      aria-label={displayIsPlaying ? 'বিরতি' : 'চালু করুন'}
                    >
                      {displayIsBuffering ? (
                        <Loader2 size={24} className="animate-spin text-sky-700" />
                      ) : displayIsPlaying ? (
                        <Pause size={24} />
                      ) : (
                        <Play size={24} className="ml-0.5" />
                      )}
                    </button>

                    <button
                      onClick={handleNextShloka}
                      className="h-11 w-11 rounded-2xl bg-white/15 border border-white/15 flex items-center justify-center active:scale-90 transition-all"
                      aria-label="পরবর্তী শ্লোক"
                    >
                      <SkipForward size={20} />
                    </button>
                  </div>

                  <button
                    onClick={() => setRepeatOne(v => !v)}
                    className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${
                      repeatOne
                        ? 'bg-amber-400/25 border-amber-300/60 text-amber-200'
                        : 'bg-white/10 border-white/10 text-white/60'
                    }`}
                    title="একই শ্লোক বারবার শুনুন"
                    aria-label="Repeat Shloka"
                  >
                    <Repeat1 size={17} />
                  </button>
                </div>

                {audioError && (
                  <div className="rounded-xl bg-rose-500/20 border border-rose-300/30 px-3 py-2 flex items-center gap-2 text-[11px] font-bold text-rose-100">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{audioError}</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Shloka List for Selected Chapter */}
          <div className="space-y-2">
            <div className="px-1 flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full border border-white/75 shadow-sm">
                শ্লোক তালিকা ({toBengaliDigits(activeChapter.urls.length)}টি)
              </span>
            </div>

            <div className="space-y-2">
              {activeChapter.urls.map((_, idx) => {
                const isThisTrack = playingChapterId === activeChapter.id && shlokaIndex === idx;
                const isThisPlaying = isThisTrack && isPlaying;
                const isThisBuffering = isThisTrack && isBuffering;

                return (
                  <button
                    key={idx}
                    onClick={() => playShloka(activeChapter.id, idx)}
                    className={`w-full rounded-2xl px-3.5 py-3 border backdrop-blur-md shadow-sm flex items-center justify-between gap-3 text-left active:scale-[0.98] transition-all ${
                      isThisTrack
                        ? 'border-sky-500 ring-2 ring-sky-400/40 shadow-md'
                        : 'border-white/75'
                    }`}
                    style={{
                      backgroundColor: isThisTrack
                        ? 'rgba(255, 255, 255, 0.84)'
                        : 'rgba(255, 255, 255, 0.64)'
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                          isThisTrack
                            ? 'bg-sky-600 text-white border-sky-500'
                            : 'bg-sky-100/90 text-blue-950 border-sky-200/80'
                        }`}
                      >
                        {toBengaliDigits(idx + 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-950 leading-tight">
                          শ্লোক - {toBengaliDigits(idx + 1)}
                        </p>
                        <p className="text-[10px] font-bold text-slate-700 truncate mt-0.5">
                          {isThisPlaying
                            ? 'এখন চলছে...'
                            : isThisBuffering
                            ? 'লোড হচ্ছে...'
                            : activeChapter.title}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        isThisTrack
                          ? 'bg-sky-600 text-white'
                          : 'bg-white/90 text-sky-700 border border-sky-200'
                      }`}
                    >
                      {isThisBuffering ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : isThisPlaying ? (
                        <Pause size={16} />
                      ) : (
                        <Play size={16} className="ml-0.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
