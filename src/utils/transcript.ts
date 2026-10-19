import type { TranscriptResult, TranscriptSegment } from '../types/transcript.ts';

/**
 * Format numeric seconds to HH:MM:SS or MM:SS
 */
export function formatSecondsToTimestamp(
  seconds: number,
  format: 'srt' | 'vtt' | 'display' = 'display'
): string {
  if (isNaN(seconds) || seconds < 0) {
    seconds = 0;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, size = 2) => String(n).padStart(size, '0');

  if (format === 'srt') {
    // 00:01:23,456
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
  }

  if (format === 'vtt') {
    // 00:01:23.456
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(ms, 3)}`;
  }

  // Display format
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${minutes}:${pad(secs)}`;
}

/**
 * Parses timestamp string (e.g., "00:01:23", "01:23", "00:01:23.456", "00:01:23,456") to seconds
 */
export function parseTimestampToSeconds(timestamp: string): number {
  if (!timestamp) return 0;
  
  // Replace comma with dot for fractional seconds
  const clean = timestamp.trim().replace(',', '.');
  const parts = clean.split(':');

  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    const secs = parseFloat(parts[2]) || 0;
    return hours * 3600 + mins * 60 + secs;
  } else if (parts.length === 2) {
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  } else if (parts.length === 1) {
    return parseFloat(parts[0]) || 0;
  }

  return 0;
}

/**
 * Converts segments into SubRip (.srt) subtitle string
 */
export function exportToSRT(segments: TranscriptSegment[], includeSpeaker = true): string {
  if (!segments || segments.length === 0) return '';

  return segments
    .map((seg, idx) => {
      const start = formatSecondsToTimestamp(seg.startSeconds, 'srt');
      const end = formatSecondsToTimestamp(seg.endSeconds, 'srt');
      const text = includeSpeaker && seg.speaker
        ? `[${seg.speaker}]: ${seg.text}`
        : seg.text;

      return `${idx + 1}\n${start} --> ${end}\n${text.trim()}`;
    })
    .join('\n\n');
}

/**
 * Converts segments into WebVTT (.vtt) subtitle string
 */
export function exportToVTT(segments: TranscriptSegment[], includeSpeaker = true): string {
  if (!segments || segments.length === 0) return 'WEBVTT\n';

  const body = segments
    .map((seg, idx) => {
      const start = formatSecondsToTimestamp(seg.startSeconds, 'vtt');
      const end = formatSecondsToTimestamp(seg.endSeconds, 'vtt');
      const text = includeSpeaker && seg.speaker
        ? `<v ${seg.speaker}>${seg.text}</v>`
        : seg.text;

      return `${idx + 1}\n${start} --> ${end}\n${text.trim()}`;
    })
    .join('\n\n');

  return `WEBVTT\n\n${body}`;
}

/**
 * Converts transcript to Plain Text (.txt)
 */
export function exportToPlainText(
  transcript: TranscriptResult,
  options: { includeSpeakers?: boolean; includeTimestamps?: boolean } = {}
): string {
  const { includeSpeakers = true, includeTimestamps = true } = options;

  if (!transcript.segments || transcript.segments.length === 0) {
    return transcript.fullText || '';
  }

  return transcript.segments
    .map((seg) => {
      let prefix = '';
      if (includeTimestamps) {
        prefix += `[${formatSecondsToTimestamp(seg.startSeconds, 'display')}] `;
      }
      if (includeSpeakers && seg.speaker) {
        prefix += `${seg.speaker}: `;
      }
      return `${prefix}${seg.text}`;
    })
    .join('\n\n');
}

/**
 * Converts transcript to Markdown (.md)
 */
export function exportToMarkdown(transcript: TranscriptResult): string {
  const lines: string[] = [];

  lines.push(`# ${transcript.title || 'Transcript'}`);
  lines.push('');
  lines.push(`- **Date:** ${new Date(transcript.createdAt || Date.now()).toLocaleDateString()}`);
  lines.push(`- **Duration:** ${formatSecondsToTimestamp(transcript.durationSeconds, 'display')}`);
  lines.push(`- **Language:** ${transcript.language || 'Auto-detected'}`);
  lines.push(`- **Speakers:** ${transcript.speakers?.join(', ') || 'None detected'}`);
  lines.push('');

  if (transcript.summary) {
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(transcript.summary);
    lines.push('');
  }

  if (transcript.keyPoints && transcript.keyPoints.length > 0) {
    lines.push('## Key Takeaways');
    lines.push('');
    transcript.keyPoints.forEach((point) => {
      lines.push(`- ${point}`);
    });
    lines.push('');
  }

  if (transcript.actionItems && transcript.actionItems.length > 0) {
    lines.push('## Action Items');
    lines.push('');
    transcript.actionItems.forEach((action) => {
      lines.push(`- [ ] ${action}`);
    });
    lines.push('');
  }

  if (transcript.chapters && transcript.chapters.length > 0) {
    lines.push('## Chapters');
    lines.push('');
    transcript.chapters.forEach((chap) => {
      lines.push(`- **${formatSecondsToTimestamp(chap.startSeconds, 'display')}** — ${chap.title}: ${chap.summary}`);
    });
    lines.push('');
  }

  lines.push('## Full Transcript');
  lines.push('');

  transcript.segments.forEach((seg) => {
    const time = formatSecondsToTimestamp(seg.startSeconds, 'display');
    const speaker = seg.speaker ? `**${seg.speaker}**` : '';
    lines.push(`> \`[${time}]\` ${speaker}: ${seg.text}`);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Computes word statistics: word count, reading time, words per minute
 */
export function computeWordStats(segments: TranscriptSegment[], durationSeconds = 0) {
  let wordCount = 0;
  segments.forEach((seg) => {
    if (seg.text) {
      wordCount += seg.text.trim().split(/\s+/).filter(Boolean).length;
    }
  });

  const minutes = durationSeconds > 0 ? durationSeconds / 60 : wordCount / 140;
  const wpm = minutes > 0 ? Math.round(wordCount / minutes) : 0;
  const readingTimeMinutes = Math.ceil(wordCount / 200);

  return {
    wordCount,
    wpm,
    readingTimeMinutes,
  };
}

/**
 * Finds index of the segment currently playing given media current time in seconds
 */
export function findCurrentSegmentIndex(
  segments: TranscriptSegment[],
  currentTime: number
): number {
  if (!segments || segments.length === 0) return -1;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (currentTime >= seg.startSeconds && currentTime <= seg.endSeconds) {
      return i;
    }
  }

  // Fallback: segment before current time
  for (let i = segments.length - 1; i >= 0; i--) {
    if (currentTime >= segments[i].startSeconds) {
      return i;
    }
  }

  return 0;
}
