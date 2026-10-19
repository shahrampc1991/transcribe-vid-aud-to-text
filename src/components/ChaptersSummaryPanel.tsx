import React, { useState } from 'react';
import {
  FileText,
  ListCheck,
  Bookmark,
  Sparkles,
  BarChart3,
  Send,
  Loader2,
  Clock,
  CheckCircle,
  HelpCircle,
  Play,
} from 'lucide-react';
import { Chapter, TranscriptResult } from '../types/transcript';
import { computeWordStats, formatSecondsToTimestamp } from '../utils/transcript';

interface ChaptersSummaryPanelProps {
  transcript: TranscriptResult;
  onSeek: (seconds: number) => void;
  onToggleActionItem?: (index: number) => void;
}

export const ChaptersSummaryPanel: React.FC<ChaptersSummaryPanelProps> = ({
  transcript,
  onSeek,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'chapters' | 'ask' | 'stats'>('summary');
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: string }>>([]);
  const [completedActions, setCompletedActions] = useState<{ [key: number]: boolean }>({});

  const stats = computeWordStats(transcript.segments, transcript.durationSeconds);

  const toggleAction = (idx: number) => {
    setCompletedActions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleAskQuestion = async (customQ?: string) => {
    const qToSend = customQ || question;
    if (!qToSend.trim() || isAsking) return;

    setIsAsking(true);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: qToSend,
          fullText: transcript.fullText,
          summary: transcript.summary,
        }),
      });

      const data = await res.json();
      if (data.answer) {
        setQaHistory((prev) => [{ q: qToSend, a: data.answer }, ...prev]);
        if (!customQ) setQuestion('');
      } else {
        setQaHistory((prev) => [
          { q: qToSend, a: data.error || 'Could not get an answer from Gemini.' },
          ...prev,
        ]);
      }
    } catch (err: any) {
      setQaHistory((prev) => [
        { q: qToSend, a: `Error querying model: ${err.message}` },
        ...prev,
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[650px] shadow-xl overflow-hidden">
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'summary'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Executive Summary</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chapters')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'chapters'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Chapters ({transcript.chapters?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ask')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'ask'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ask AI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'stats'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Stats</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Tab 1: Summary & Takeaways */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Overview */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Overview
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
                {transcript.summary || 'No summary available.'}
              </p>
            </div>

            {/* Key Takeaways */}
            {transcript.keyPoints && transcript.keyPoints.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Key Takeaways
                  </h3>
                </div>
                <div className="space-y-2">
                  {transcript.keyPoints.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-300"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {transcript.actionItems && transcript.actionItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Action Items
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {Object.values(completedActions).filter(Boolean).length}/
                    {transcript.actionItems.length} completed
                  </span>
                </div>
                <div className="space-y-2">
                  {transcript.actionItems.map((action, idx) => {
                    const isDone = Boolean(completedActions[idx]);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleAction(idx)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isDone
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-400 line-through'
                            : 'bg-slate-950/40 border-slate-800/60 text-slate-200 hover:bg-slate-800/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => {}}
                          className="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 pointer-events-none"
                        />
                        <span>{action}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Chapters */}
        {activeTab === 'chapters' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 mb-2">
              Click any chapter to jump the player to that topic:
            </p>
            {transcript.chapters && transcript.chapters.length > 0 ? (
              transcript.chapters.map((chap, idx) => (
                <div
                  key={chap.id || idx}
                  onClick={() => onSeek(chap.startSeconds)}
                  className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-950/80 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      {chap.title}
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center gap-1">
                      <Play className="w-2.5 h-2.5" />
                      {chap.startTime || formatSecondsToTimestamp(chap.startSeconds, 'display')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{chap.summary}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs">
                No chapters were generated for this recording.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Ask AI */}
        {activeTab === 'ask' && (
          <div className="flex flex-col h-full space-y-4">
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2">
                Ask anything about this recording:
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  'What were the key takeaways?',
                  'What decisions were made?',
                  'Summarize action items',
                ].map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAskQuestion(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Input field */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. What did David say about latency benchmarks?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAskQuestion();
                  }}
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleAskQuestion()}
                  disabled={!question.trim() || isAsking}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {isAsking ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Q&A stream */}
            <div className="space-y-3 pt-2">
              {qaHistory.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{item.q}</span>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg">
                    {item.a}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Audio Stats */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Duration</div>
                <div className="text-lg font-bold text-white mt-1">
                  {formatSecondsToTimestamp(transcript.durationSeconds, 'display')}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Word Count</div>
                <div className="text-lg font-bold text-white mt-1">{stats.wordCount} words</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Speaking Pace</div>
                <div className="text-lg font-bold text-white mt-1">{stats.wpm} WPM</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Reading Time</div>
                <div className="text-lg font-bold text-white mt-1">
                  ~{stats.readingTimeMinutes} min
                </div>
              </div>
            </div>

            {/* Speakers List */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-xs font-bold text-slate-300 mb-2">
                Identified Speakers ({transcript.speakers?.length || 0})
              </div>
              <div className="flex flex-wrap gap-2">
                {transcript.speakers?.map((spk, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium"
                  >
                    {spk}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
