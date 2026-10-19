import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Mic,
  Square,
  Play,
  RotateCcw,
  Sparkles,
  FileVideo,
  FileAudio,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { TranscriptionOptions, TranscriptResult } from '../types/transcript';
import { SAMPLE_TRANSCRIPTS } from '../data/sampleTranscripts';
import { createSynthesizedAudioUrl } from '../utils/audioSynthesizer';

interface MediaUploaderProps {
  onTranscribe: (
    file: File | Blob,
    options: TranscriptionOptions,
    mediaType: 'audio' | 'video',
    mediaUrl: string,
    fileName: string
  ) => Promise<void>;
  onSelectSample: (sample: TranscriptResult) => void;
  isLoading: boolean;
  uploadProgress?: number;
  loadingMessage?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  onTranscribe,
  onSelectSample,
  isLoading,
  loadingMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'samples'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced options
  const [options, setOptions] = useState<TranscriptionOptions>({
    languageHint: 'Auto-detect',
    detectSpeakers: true,
    generateChapters: true,
    generateSummary: true,
    promptNotes: '',
  });

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      if (recordedAudioUrl && recordedAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [previewUrl, recordedAudioUrl]);

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Live Microphone Recording
  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Web Audio setup for visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);

        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
        if (audioCtx.state !== 'closed') {
          audioCtx.close();
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Start visualizer loop
      drawVisualizer();
    } catch (err: any) {
      console.error('Microphone error:', err);
      setMicError(err.message || 'Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    setRecordedBlob(null);
    setRecordedAudioUrl(null);
    setRecordingDuration(0);
    setMicError(null);
  };

  // Canvas waveform visualizer
  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(1, '#a855f7');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };
    render();
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    const isVideo = selectedFile.type.startsWith('video/');
    await onTranscribe(
      selectedFile,
      options,
      isVideo ? 'video' : 'audio',
      previewUrl || '',
      selectedFile.name
    );
  };

  const handleRecordedSubmit = async () => {
    if (!recordedBlob) return;
    await onTranscribe(
      recordedBlob,
      options,
      'audio',
      recordedAudioUrl || '',
      `microphone_recording_${new Date().toISOString().slice(0, 10)}.webm`
    );
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Intro hero banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Powered by Gemini Multimodal Speech Comprehension</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Transcribe Video & Audio to Text
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Upload audio, video, or record voice with automated speaker diarization, interactive timestamped playback, executive summaries, chapters, and SRT/VTT subtitle export.
        </p>
      </div>

      {/* Main card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('record')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'record'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Record Voice</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'samples'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Sample Library</span>
          </button>
        </div>

        {/* Tab 1: Upload File */}
        {activeTab === 'upload' && (
          <div className="p-6 sm:p-8">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
                dragOver
                  ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-950/30 hover:bg-slate-950/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm,.mp4,.mov,.mkv"
                onChange={handleFileChange}
              />

              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                {selectedFile?.type.startsWith('video/') ? (
                  <FileVideo className="w-8 h-8" />
                ) : (
                  <FileAudio className="w-8 h-8" />
                )}
              </div>

              {selectedFile ? (
                <div>
                  <div className="text-base font-semibold text-white truncate max-w-md mx-auto">
                    {selectedFile.name}
                  </div>
                  <div className="text-xs text-indigo-300 mt-1">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB •{' '}
                    {selectedFile.type || 'Media File'}
                  </div>
                  <div className="mt-3 text-xs text-slate-400">
                    Click or drag another file to replace
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-base font-semibold text-white">
                    Drag and drop your audio or video file here
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    or click to browse files from your computer
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-[11px] text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">MP3</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">WAV</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">M4A</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">MP4</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">WebM</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">MOV</span>
                  </div>
                </div>
              )}
            </div>

            {/* Media quick preview if file selected */}
            {selectedFile && previewUrl && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Preview Source File
                </div>
                {selectedFile.type.startsWith('video/') ? (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full max-h-56 rounded-lg bg-black"
                  />
                ) : (
                  <audio src={previewUrl} controls className="w-full" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Live Recording */}
        {activeTab === 'record' && (
          <div className="p-6 sm:p-8 text-center">
            <div className="max-w-md mx-auto">
              {/* Visualizer canvas */}
              <div className="h-28 w-full bg-slate-950/70 border border-slate-800 rounded-xl mb-6 flex items-center justify-center overflow-hidden relative">
                {isRecording ? (
                  <canvas ref={canvasRef} width={400} height={112} className="w-full h-full" />
                ) : (
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-slate-600" />
                    <span>Microphone visualizer activates when recording starts</span>
                  </div>
                )}

                {/* Duration timer overlay */}
                {isRecording && (
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-mono font-semibold flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span>{formatSeconds(recordingDuration)}</span>
                  </div>
                )}
              </div>

              {micError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{micError}</span>
                </div>
              )}

              {/* Recording Controls */}
              <div className="flex items-center justify-center gap-4">
                {!isRecording && !recordedBlob && (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Recording</span>
                  </button>
                )}

                {isRecording && (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-lg shadow-red-600/30 transition-all animate-pulse cursor-pointer"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Stop Recording ({formatSeconds(recordingDuration)})</span>
                  </button>
                )}

                {recordedBlob && !isRecording && (
                  <div className="w-full space-y-4">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="text-xs text-slate-400 mb-2">Recorded Speech Preview</div>
                      <audio src={recordedAudioUrl || ''} controls className="w-full" />
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={resetRecording}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Discard & Re-record</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Curated Samples */}
        {activeTab === 'samples' && (
          <div className="p-6 sm:p-8">
            <div className="text-xs text-slate-400 mb-4">
              Select any pre-analyzed demo recording to immediately explore interactive playback, speaker tags, chapter marks, and subtitle exports:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SAMPLE_TRANSCRIPTS.map((sample) => (
                <div
                  key={sample.id}
                  className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-950/80 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {sample.mediaType}
                      </span>
                      <span className="text-xs text-slate-400">{sample.durationSeconds}s</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                      {sample.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                      {sample.summary}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 truncate">
                      {sample.speakers.join(', ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectSample(sample)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      Load Sample
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Transcription Options Accordion */}
        <div className="border-t border-slate-800 bg-slate-950/30 px-6 py-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              <span>Advanced Options (Language, Diarization, Chapters)</span>
            </div>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              {/* Language selection */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">Language Hint</label>
                <select
                  value={options.languageHint}
                  onChange={(e) => setOptions({ ...options, languageHint: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Auto-detect">Auto-detect Language</option>
                  <option value="English">English</option>
                  <option value="Spanish">Spanish (Español)</option>
                  <option value="French">French (Français)</option>
                  <option value="German">German (Deutsch)</option>
                  <option value="Japanese">Japanese (日本語)</option>
                  <option value="Chinese">Chinese (中文)</option>
                  <option value="Portuguese">Portuguese (Português)</option>
                  <option value="Italian">Italian (Italiano)</option>
                  <option value="Arabic">Arabic (العربية)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                </select>
              </div>

              {/* Additional vocabulary / prompt notes */}
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Vocabulary / Context Hints
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acronyms, product names, specialized terms"
                  value={options.promptNotes}
                  onChange={(e) => setOptions({ ...options, promptNotes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
              </div>

              {/* Toggles */}
              <div className="sm:col-span-2 flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={options.detectSpeakers}
                    onChange={(e) =>
                      setOptions({ ...options, detectSpeakers: e.target.checked })
                    }
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Speaker Diarization (Identify separate speakers)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={options.generateChapters}
                    onChange={(e) =>
                      setOptions({ ...options, generateChapters: e.target.checked })
                    }
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Generate Thematic Chapters</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={options.generateSummary}
                    onChange={(e) =>
                      setOptions({ ...options, generateSummary: e.target.checked })
                    }
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Generate Summary & Action Items</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Action Submit Bar */}
        <div className="border-t border-slate-800 bg-slate-950 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {activeTab === 'upload' &&
              (selectedFile
                ? `Ready to transcribe "${selectedFile.name}"`
                : 'Choose an audio or video file above to begin')}
            {activeTab === 'record' &&
              (recordedBlob
                ? 'Ready to transcribe microphone audio'
                : 'Click "Start Recording" above')}
            {activeTab === 'samples' && 'Select a pre-loaded sample recording'}
          </div>

          <div>
            {activeTab === 'upload' && (
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={!selectedFile || isLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{loadingMessage || 'Transcribing with Gemini...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Transcribe File</span>
                  </>
                )}
              </button>
            )}

            {activeTab === 'record' && recordedBlob && (
              <button
                type="button"
                onClick={handleRecordedSubmit}
                disabled={isLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{loadingMessage || 'Transcribing voice...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Transcribe Voice</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
