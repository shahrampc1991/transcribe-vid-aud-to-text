import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  X,
  FileCode,
  FileText,
  Subtitles,
  FileType,
} from 'lucide-react';
import { ExportFormat, TranscriptResult } from '../types/transcript';
import {
  exportToSRT,
  exportToVTT,
  exportToPlainText,
  exportToMarkdown,
} from '../utils/transcript';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: TranscriptResult;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, transcript }) => {
  const [format, setFormat] = useState<ExportFormat>('srt');
  const [includeSpeakers, setIncludeSpeakers] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate exported content based on selected format & options
  const getExportData = () => {
    switch (format) {
      case 'srt':
        return {
          content: exportToSRT(transcript.segments, includeSpeakers),
          extension: 'srt',
          mime: 'text/plain',
        };
      case 'vtt':
        return {
          content: exportToVTT(transcript.segments, includeSpeakers),
          extension: 'vtt',
          mime: 'text/vtt',
        };
      case 'txt':
        return {
          content: exportToPlainText(transcript, { includeSpeakers, includeTimestamps }),
          extension: 'txt',
          mime: 'text/plain',
        };
      case 'md':
        return {
          content: exportToMarkdown(transcript),
          extension: 'md',
          mime: 'text/markdown',
        };
      case 'json':
        return {
          content: JSON.stringify(transcript, null, 2),
          extension: 'json',
          mime: 'application/json',
        };
    }
  };

  const { content, extension, mime } = getExportData();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = (transcript.title || 'transcript')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');
    a.href = url;
    a.download = `${safeTitle}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Export Transcript</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Pills */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Output Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'srt', label: 'SRT Subtitles', icon: Subtitles, ext: '.srt' },
                { id: 'vtt', label: 'WebVTT', icon: Subtitles, ext: '.vtt' },
                { id: 'txt', label: 'Plain Text', icon: FileText, ext: '.txt' },
                { id: 'md', label: 'Markdown', icon: FileType, ext: '.md' },
                { id: 'json', label: 'JSON Data', icon: FileCode, ext: '.json' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = format === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormat(item.id as ExportFormat)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold">{item.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5">{item.ext}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format Options */}
          {(format === 'srt' || format === 'vtt' || format === 'txt') && (
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSpeakers}
                  onChange={(e) => setIncludeSpeakers(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Include Speaker Tags</span>
              </label>

              {format === 'txt' && (
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTimestamps}
                    onChange={(e) => setIncludeTimestamps(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Include Timestamps</span>
                </label>
              )}
            </div>
          )}

          {/* Live Preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Preview ({extension.toUpperCase()})
            </label>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 h-48 overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
              {content}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Text</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download .{extension}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
