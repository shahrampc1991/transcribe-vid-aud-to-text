import React from 'react';
import { Mic, FileAudio, Sparkles, Plus, BookOpen } from 'lucide-react';
import { SAMPLE_TRANSCRIPTS } from '../data/sampleTranscripts';
import { TranscriptResult } from '../types/transcript';

interface HeaderProps {
  onNewTranscription: () => void;
  onSelectSample: (sample: TranscriptResult) => void;
  hasActiveTranscript: boolean;
  activeTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onNewTranscription,
  onSelectSample,
  hasActiveTranscript,
  activeTitle,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 p-[2px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <FileAudio className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">EchoScribe</span>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                AI Transcription
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Multimodal Audio & Video to Text • Diarization • Subtitles
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Sample Selector */}
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors"
              title="Try with sample media"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sample Demos</span>
            </button>

            {/* Dropdown menu */}
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900/95 border border-slate-800 shadow-xl backdrop-blur-lg p-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 z-50">
              <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Instant Test Recordings
              </div>
              {SAMPLE_TRANSCRIPTS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => onSelectSample(sample)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800/80 transition-colors group/item"
                >
                  <div className="flex items-center justify-between text-xs font-medium text-slate-200 group-hover/item:text-indigo-300">
                    <span className="truncate pr-2">{sample.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                      {sample.mediaType}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {sample.speakers.join(', ')} • {sample.durationSeconds}s
                  </div>
                </button>
              ))}
            </div>
          </div>

          {hasActiveTranscript && (
            <button
              type="button"
              onClick={onNewTranscription}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New File</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
