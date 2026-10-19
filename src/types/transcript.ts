export interface TranscriptSegment {
  id: string;
  speaker: string;
  startTime: string; // e.g. "00:00:04"
  startSeconds: number; // e.g. 4.2
  endTime: string; // e.g. "00:00:12"
  endSeconds: number; // e.g. 12.5
  text: string;
}

export interface Chapter {
  id: string;
  title: string;
  startTime: string;
  startSeconds: number;
  summary: string;
}

export interface TranscriptResult {
  id: string;
  title: string;
  language: string;
  durationSeconds: number;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  speakers: string[];
  chapters: Chapter[];
  segments: TranscriptSegment[];
  fullText: string;
  createdAt: string;
  mediaType: 'audio' | 'video';
  mediaUrl?: string; // object URL or data URL
  fileName?: string;
  fileSize?: number;
}

export interface TranscriptionOptions {
  languageHint?: string;
  detectSpeakers: boolean;
  generateChapters: boolean;
  generateSummary: boolean;
  promptNotes?: string;
}

export type ExportFormat = 'srt' | 'vtt' | 'txt' | 'md' | 'json';
