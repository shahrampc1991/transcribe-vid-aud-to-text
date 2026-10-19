import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Maximize2,
  Subtitles,
  Activity,
} from 'lucide-react';
import { formatSecondsToTimestamp } from '../utils/transcript';
import { Chapter, TranscriptSegment } from '../types/transcript';

interface MediaPlayerProps {
  mediaUrl?: string;
  mediaType: 'audio' | 'video';
  currentTime: number;
  duration: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  activeSegment?: TranscriptSegment;
  chapters?: Chapter[];
  title?: string;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  mediaUrl,
  mediaType,
  currentTime,
  duration,
  onTimeUpdate,
  onDurationChange,
  onSeek,
  isPlaying,
  onTogglePlay,
  activeSegment,
  chapters = [],
  title,
}) => {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  // Sync internal media play/pause with parent state
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    if (isPlaying) {
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Playback interrupted:', err);
        });
      }
    } else {
      el.pause();
    }
  }, [isPlaying]);

  // Sync seek requests
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (Math.abs(el.currentTime - currentTime) > 0.5) {
      el.currentTime = currentTime;
    }
  }, [currentTime]);

  // Playback rate
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Volume
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleTimeUpdateInternal = () => {
    if (mediaRef.current) {
      onTimeUpdate(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current && mediaRef.current.duration) {
      onDurationChange(mediaRef.current.duration);
    }
  };

  const handleSkip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    onSeek(newTime);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const hoverX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = hoverX / rect.width;
    setHoverTime(ratio * duration);
    setHoverPosition(hoverX);
  };

  const handleTimelineMouseLeave = () => {
    setHoverTime(null);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Media Display Area (Video canvas or Audio Waveform hero) */}
      <div className="relative bg-slate-950 flex items-center justify-center min-h-[220px] max-h-[380px] overflow-hidden select-none">
        {mediaType === 'video' && mediaUrl ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={mediaUrl}
            className="w-full max-h-[380px] object-contain"
            onTimeUpdate={handleTimeUpdateInternal}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => onTogglePlay()}
            playsInline
          />
        ) : (
          <div className="w-full py-10 px-6 flex flex-col items-center justify-center relative">
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={mediaUrl}
              onTimeUpdate={handleTimeUpdateInternal}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => onTogglePlay()}
            />

            {/* Stylized Audio Visualizer Bars */}
            <div className="flex items-center justify-center gap-1.5 h-20 w-full max-w-md">
              {Array.from({ length: 36 }).map((_, i) => {
                const isActive = (i / 36) * 100 <= progressPercent;
                const animatedHeight = isPlaying
                  ? Math.sin(i * 0.4 + currentTime * 4) * 35 + 45
                  : 15 + ((i * 7) % 25);

                return (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-100 ${
                      isActive
                        ? 'bg-gradient-to-t from-indigo-500 to-cyan-400'
                        : 'bg-slate-800'
                    }`}
                    style={{ height: `${Math.max(10, animatedHeight)}%` }}
                  />
                );
              })}
            </div>

            <div className="mt-3 text-center">
              <div className="text-xs font-semibold text-slate-300 truncate max-w-sm">
                {title || 'Audio Recording'}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                <Activity className="w-3 h-3 text-indigo-400" />
                <span>Synchronized Audio Playback</span>
              </div>
            </div>
          </div>
        )}

        {/* Live Closed Caption Subtitle Overlay */}
        {showCaptions && activeSegment && (
          <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none">
            <div className="max-w-xl px-4 py-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/60 shadow-2xl text-center">
              {activeSegment.speaker && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 mr-2">
                  {activeSegment.speaker}
                </span>
              )}
              <span className="text-xs sm:text-sm font-medium text-white tracking-wide">
                {activeSegment.text}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Scrubbing Timeline */}
      <div className="px-4 pt-4 pb-2">
        <div
          ref={progressBarRef}
          onClick={handleTimelineClick}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          className="relative h-2 bg-slate-800 rounded-full cursor-pointer group"
        >
          {/* Chapter markers */}
          {chapters.map((chap) => {
            const leftPct = duration > 0 ? (chap.startSeconds / duration) * 100 : 0;
            return (
              <div
                key={chap.id}
                className="absolute top-0 bottom-0 w-1 bg-cyan-400 z-10 rounded-full hover:w-1.5 transition-all"
                style={{ left: `${leftPct}%` }}
                title={`${chap.title} (${chap.startTime})`}
              />
            );
          })}

          {/* Progress fill */}
          <div
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform -ml-1.5 z-20 pointer-events-none"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Hover tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-950 text-white text-[10px] font-mono border border-slate-700 pointer-events-none shadow"
              style={{ left: `${hoverPosition}px` }}
            >
              {formatSecondsToTimestamp(hoverTime, 'display')}
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons Bar */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-slate-300">
        {/* Left: Time display */}
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 min-w-[120px]">
          <span className="text-white font-semibold">
            {formatSecondsToTimestamp(currentTime, 'display')}
          </span>
          <span>/</span>
          <span>{formatSecondsToTimestamp(duration, 'display')}</span>
        </div>

        {/* Center: Main Playback Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => handleSkip(-5)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Rewind 5 seconds"
          >
            <Rewind className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => handleSkip(5)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Skip forward 5 seconds"
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Playback Speed, Captions Toggle, Volume */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Subtitle toggle */}
          <button
            type="button"
            onClick={() => setShowCaptions(!showCaptions)}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              showCaptions
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle On-Screen Captions"
          >
            <Subtitles className="w-4 h-4" />
            <span className="hidden sm:inline">CC</span>
          </button>

          {/* Speed Selector */}
          <select
            value={playbackRate}
            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
            title="Playback Speed"
          >
            <option value="0.75">0.75x</option>
            <option value="1">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>

          {/* Volume control */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
