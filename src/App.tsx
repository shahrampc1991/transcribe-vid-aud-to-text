import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MediaUploader } from './components/MediaUploader';
import { MediaPlayer } from './components/MediaPlayer';
import { TranscriptViewer } from './components/TranscriptViewer';
import { ChaptersSummaryPanel } from './components/ChaptersSummaryPanel';
import { ExportModal } from './components/ExportModal';
import { TranslateModal } from './components/TranslateModal';
import { SAMPLE_TRANSCRIPTS } from './data/sampleTranscripts';
import { TranscriptResult, TranscriptionOptions } from './types/transcript';
import { findCurrentSegmentIndex } from './utils/transcript';
import { createSynthesizedAudioUrl } from './utils/audioSynthesizer';
import { Download, Languages, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'audio' | 'video'>('audio');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isTranslateOpen, setIsTranslateOpen] = useState<boolean>(false);

  // Find active segment index for audio/video sync
  const activeSegmentIndex = transcript
    ? findCurrentSegmentIndex(transcript.segments, currentTime)
    : -1;
  const activeSegment =
    transcript && activeSegmentIndex >= 0 ? transcript.segments[activeSegmentIndex] : undefined;

  // Handle Loading a sample
  const handleSelectSample = useCallback((sample: TranscriptResult) => {
    setIsPlaying(false);
    setCurrentTime(0);
    setErrorMessage(null);

    // Create synthetic audio track so player functions smoothly
    const syntheticUrl = createSynthesizedAudioUrl(sample.durationSeconds, sample.title);
    setMediaUrl(syntheticUrl);
    setMediaType(sample.mediaType);
    setDuration(sample.durationSeconds);
    setTranscript({
      ...sample,
      mediaUrl: syntheticUrl,
    });
  }, []);

  // Handle URL cleanup
  useEffect(() => {
    return () => {
      if (mediaUrl && mediaUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [mediaUrl]);

  // Handle Transcribe Action
  const handleTranscribe = async (
    file: File | Blob,
    options: TranscriptionOptions,
    detectedMediaType: 'audio' | 'video',
    localUrl: string,
    fileName: string
  ) => {
    setIsLoading(true);
    setLoadingMessage('Uploading & analyzing audio frames with Gemini 3.8 Flash...');
    setErrorMessage(null);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setLoadingMessage('Processing speech-to-text, timestamps & speaker diarization...');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData: base64,
          mimeType: file.type || (detectedMediaType === 'video' ? 'video/mp4' : 'audio/mp3'),
          fileName,
          options,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transcription service error');
      }

      setMediaType(detectedMediaType);
      setMediaUrl(localUrl);
      setDuration(data.durationSeconds || 60);
      setCurrentTime(0);
      setTranscript({
        ...data,
        mediaUrl: localUrl,
        mediaType: detectedMediaType,
      });
    } catch (err: any) {
      console.error('Transcription failed:', err);
      setErrorMessage(
        err.message || 'Failed to complete transcription. Please check your file or try a sample.'
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Seek handler
  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleUpdateSegmentText = (id: string, newText: string) => {
    if (!transcript) return;
    setTranscript({
      ...transcript,
      segments: transcript.segments.map((seg) =>
        seg.id === id ? { ...seg, text: newText } : seg
      ),
    });
  };

  const handleRenameSpeaker = (oldName: string, newName: string) => {
    if (!transcript) return;
    setTranscript({
      ...transcript,
      speakers: transcript.speakers.map((s) => (s === oldName ? newName : s)),
      segments: transcript.segments.map((seg) =>
        seg.speaker === oldName ? { ...seg, speaker: newName } : seg
      ),
    });
  };

  const handleApplyTranslation = (translatedData: {
    language: string;
    summary: string;
    segments: any[];
  }) => {
    if (!transcript) return;
    setTranscript({
      ...transcript,
      language: translatedData.language,
      summary: translatedData.summary,
      segments: translatedData.segments,
    });
  };

  const handleNewTranscription = () => {
    setIsPlaying(false);
    setTranscript(null);
    setCurrentTime(0);
    setDuration(0);
    setMediaUrl(null);
    setErrorMessage(null);
  };

  // Keyboard controls for global convenience
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(0, currentTime - 5));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(duration, currentTime + 5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <Header
        onNewTranscription={handleNewTranscription}
        onSelectSample={handleSelectSample}
        hasActiveTranscript={Boolean(transcript)}
        activeTitle={transcript?.title}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start justify-between gap-3 shadow-lg">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Notice</p>
                <p className="text-xs text-red-300/90 mt-0.5">{errorMessage}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectSample(SAMPLE_TRANSCRIPTS[0])}
                    className="text-xs px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-white font-medium transition-colors"
                  >
                    Load Sample Podcast Instead
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-white text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {!transcript ? (
          <MediaUploader
            onTranscribe={handleTranscribe}
            onSelectSample={handleSelectSample}
            isLoading={isLoading}
            loadingMessage={loadingMessage}
          />
        ) : (
          <div className="space-y-6">
            {/* Action Bar & Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-md">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {transcript.mediaType}
                  </span>
                  <span className="text-xs text-slate-400">
                    Language: <span className="text-white font-medium">{transcript.language}</span>
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white truncate mt-1">
                  {transcript.title}
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsTranslateOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  title="Translate transcript"
                >
                  <Languages className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Translate</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExportOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                  title="Export to SRT, VTT, TXT, Markdown, or JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Media Player Bar */}
            <MediaPlayer
              mediaUrl={mediaUrl || undefined}
              mediaType={mediaType}
              currentTime={currentTime}
              duration={duration}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
              onSeek={handleSeek}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              activeSegment={activeSegment}
              chapters={transcript.chapters}
              title={transcript.title}
            />

            {/* 2-Column Split: Synchronized Transcript & Chapters/Summary/Q&A */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Interactive Transcript with Search (7 cols) */}
              <div className="lg:col-span-7">
                <TranscriptViewer
                  segments={transcript.segments}
                  activeSegmentIndex={activeSegmentIndex}
                  onSeek={handleSeek}
                  onUpdateSegmentText={handleUpdateSegmentText}
                  onRenameSpeaker={handleRenameSpeaker}
                />
              </div>

              {/* Right Column: Chapters, Executive Summary, Q&A, and Stats (5 cols) */}
              <div className="lg:col-span-5">
                <ChaptersSummaryPanel
                  transcript={transcript}
                  onSeek={handleSeek}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Export Modal */}
      {transcript && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          transcript={transcript}
        />
      )}

      {/* Translate Modal */}
      {transcript && (
        <TranslateModal
          isOpen={isTranslateOpen}
          onClose={() => setIsTranslateOpen(false)}
          transcript={transcript}
          onApplyTranslation={handleApplyTranslation}
        />
      )}
    </div>
  );
}
