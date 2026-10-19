import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Check,
  Edit2,
  Copy,
  ChevronDown,
  ChevronUp,
  Volume2,
  Lock,
  Unlock,
  Play,
  UserCheck,
} from 'lucide-react';
import { TranscriptSegment } from '../types/transcript';
import { formatSecondsToTimestamp } from '../utils/transcript';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  activeSegmentIndex: number;
  onSeek: (seconds: number) => void;
  onUpdateSegmentText: (id: string, newText: string) => void;
  onRenameSpeaker: (oldName: string, newName: string) => void;
}

// Generate consistent speaker colors
const SPEAKER_COLORS: { [key: string]: { bg: string; text: string; border: string } } = {
  '0': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  '1': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  '2': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  '3': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  '4': { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  '5': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
};

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  segments,
  activeSegmentIndex,
  onSeek,
  onUpdateSegmentText,
  onRenameSpeaker,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Speaker rename dialog state
  const [renamingSpeaker, setRenamingSpeaker] = useState<string | null>(null);
  const [newSpeakerName, setNewSpeakerName] = useState('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeSegmentRef = useRef<HTMLDivElement | null>(null);

  // Speaker mapping
  const uniqueSpeakers = Array.from(new Set(segments.map((s) => s.speaker)));

  const getSpeakerStyle = (speaker: string) => {
    const idx = Math.abs(
      uniqueSpeakers.indexOf(speaker) % Object.keys(SPEAKER_COLORS).length
    );
    return SPEAKER_COLORS[idx] || SPEAKER_COLORS['0'];
  };

  // Auto scroll to active segment
  useEffect(() => {
    if (autoScroll && activeSegmentRef.current && containerRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSegmentIndex, autoScroll]);

  const handleStartEdit = (seg: TranscriptSegment) => {
    setEditingSegmentId(seg.id);
    setEditText(seg.text);
  };

  const handleSaveEdit = (id: string) => {
    onUpdateSegmentText(id, editText);
    setEditingSegmentId(null);
  };

  const handleCopy = (seg: TranscriptSegment) => {
    navigator.clipboard.writeText(`[${seg.startTime}] ${seg.speaker}: ${seg.text}`);
    setCopiedId(seg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartRenameSpeaker = (speaker: string) => {
    setRenamingSpeaker(speaker);
    setNewSpeakerName(speaker);
  };

  const handleConfirmRenameSpeaker = () => {
    if (renamingSpeaker && newSpeakerName.trim()) {
      onRenameSpeaker(renamingSpeaker, newSpeakerName.trim());
      setRenamingSpeaker(null);
    }
  };

  // Filter matching segments
  const filteredSegments = segments.filter((seg) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      seg.text.toLowerCase().includes(q) ||
      seg.speaker.toLowerCase().includes(q) ||
      seg.startTime.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[650px] shadow-xl overflow-hidden">
      {/* Top Header & Search Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search transcript text or speaker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
              {filteredSegments.length} match{filteredSegments.length === 1 ? '' : 'es'}
            </span>
          )}
        </div>

        {/* Auto Scroll Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              autoScroll
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-300'
            }`}
            title="Auto-scroll with playback"
          >
            {autoScroll ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>Auto-Scroll</span>
          </button>
        </div>
      </div>

      {/* Speaker Rename Modal / Bar */}
      {renamingSpeaker && (
        <div className="bg-indigo-950/50 border-b border-indigo-800/40 p-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-200">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Rename "{renamingSpeaker}" across all segments:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSpeakerName}
              onChange={(e) => setNewSpeakerName(e.target.value)}
              className="bg-slate-900 border border-indigo-500/40 rounded px-2 py-1 text-white text-xs focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={handleConfirmRenameSpeaker}
              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setRenamingSpeaker(null)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Segments List */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-800/40"
      >
        {filteredSegments.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-8 text-slate-500 text-xs">
            No matching transcript segments found.
          </div>
        ) : (
          filteredSegments.map((seg) => {
            const originalIndex = segments.findIndex((s) => s.id === seg.id);
            const isActive = originalIndex === activeSegmentIndex;
            const speakerStyle = getSpeakerStyle(seg.speaker);
            const isEditing = editingSegmentId === seg.id;

            return (
              <div
                key={seg.id}
                ref={isActive ? activeSegmentRef : null}
                className={`pt-3 rounded-xl p-3 transition-all duration-150 group ${
                  isActive
                    ? 'bg-indigo-950/30 border border-indigo-500/40 shadow-sm'
                    : 'hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                {/* Segment Meta Bar: Timestamp, Speaker, Actions */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {/* Timestamp button (click to seek) */}
                    <button
                      type="button"
                      onClick={() => onSeek(seg.startSeconds)}
                      className={`font-mono text-xs px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-400'
                      }`}
                      title="Jump player to this timestamp"
                    >
                      <Play className="w-2.5 h-2.5" />
                      <span>{formatSecondsToTimestamp(seg.startSeconds, 'display')}</span>
                    </button>

                    {/* Speaker badge (click to rename) */}
                    <button
                      type="button"
                      onClick={() => handleStartRenameSpeaker(seg.speaker)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${speakerStyle.bg} ${speakerStyle.text} ${speakerStyle.border}`}
                      title="Click to rename this speaker"
                    >
                      {seg.speaker}
                    </button>
                  </div>

                  {/* Actions: Edit, Copy */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(seg)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit transcript text"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(seg)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Copy segment"
                    >
                      {copiedId === seg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Segment Text Content */}
                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-slate-950 border border-indigo-500 rounded-lg p-2.5 text-xs text-white focus:outline-none leading-relaxed"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingSegmentId(null)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(seg.id)}
                        className="px-3 py-1 rounded bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    onClick={() => onSeek(seg.startSeconds)}
                    className={`text-xs sm:text-sm leading-relaxed cursor-pointer transition-colors ${
                      isActive
                        ? 'text-white font-medium'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {seg.text}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer stats */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between px-4">
        <span>{segments.length} segments</span>
        <span className="hidden sm:inline">Click any line or timestamp to seek playback</span>
      </div>
    </div>
  );
};
