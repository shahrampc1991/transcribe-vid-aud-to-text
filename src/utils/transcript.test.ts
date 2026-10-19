import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSecondsToTimestamp,
  parseTimestampToSeconds,
  exportToSRT,
  exportToVTT,
  exportToPlainText,
  exportToMarkdown,
  computeWordStats,
  findCurrentSegmentIndex,
} from './transcript.ts';
import type { TranscriptResult, TranscriptSegment } from '../types/transcript.ts';

const mockSegments: TranscriptSegment[] = [
  {
    id: 'seg-1',
    speaker: 'Alice',
    startTime: '00:00:02',
    startSeconds: 2.5,
    endTime: '00:00:07',
    endSeconds: 7.0,
    text: 'Welcome everyone to our technology presentation.',
  },
  {
    id: 'seg-2',
    speaker: 'Bob',
    startTime: '00:00:08',
    startSeconds: 8.0,
    endTime: '00:00:14',
    endSeconds: 14.5,
    text: 'Thanks Alice, today we are excited to unveil new audio transcription capabilities.',
  },
];

const mockTranscript: TranscriptResult = {
  id: 'tx-1',
  title: 'Tech Keynote Session',
  language: 'English',
  durationSeconds: 15,
  summary: 'Alice and Bob introduced next-gen speech-to-text features.',
  keyPoints: ['High accuracy audio transcription', 'Speaker diarization and timestamps'],
  actionItems: ['Integrate SRT subtitle export', 'Test multilingual translation'],
  speakers: ['Alice', 'Bob'],
  chapters: [
    {
      id: 'chap-1',
      title: 'Introduction',
      startTime: '00:00:00',
      startSeconds: 0,
      summary: 'Opening remarks',
    },
  ],
  segments: mockSegments,
  fullText:
    'Welcome everyone to our technology presentation. Thanks Alice, today we are excited to unveil new audio transcription capabilities.',
  createdAt: '2026-10-19T00:00:00.000Z',
  mediaType: 'audio',
};

test('formatSecondsToTimestamp formats display, srt, and vtt timestamps correctly', () => {
  // Display format
  assert.equal(formatSecondsToTimestamp(65, 'display'), '1:05');
  assert.equal(formatSecondsToTimestamp(3665, 'display'), '1:01:05');
  assert.equal(formatSecondsToTimestamp(0, 'display'), '0:00');

  // SRT format: 00:01:05,250
  assert.equal(formatSecondsToTimestamp(65.25, 'srt'), '00:01:05,250');

  // VTT format: 00:01:05.250
  assert.equal(formatSecondsToTimestamp(65.25, 'vtt'), '00:01:05.250');
});

test('parseTimestampToSeconds parses various timestamp formats', () => {
  assert.equal(parseTimestampToSeconds('01:05'), 65);
  assert.equal(parseTimestampToSeconds('01:05.500'), 65.5);
  assert.equal(parseTimestampToSeconds('01:05,500'), 65.5);
  assert.equal(parseTimestampToSeconds('01:00:05'), 3605);
  assert.equal(parseTimestampToSeconds('45'), 45);
});

test('exportToSRT produces valid SubRip formatting', () => {
  const srt = exportToSRT(mockSegments, true);
  assert.match(srt, /1\n00:00:02,500 --> 00:00:07,000\n\[Alice\]: Welcome everyone/);
  assert.match(srt, /2\n00:00:08,000 --> 00:00:14,500\n\[Bob\]: Thanks Alice/);
});

test('exportToVTT produces valid WebVTT formatting', () => {
  const vtt = exportToVTT(mockSegments, true);
  assert.match(vtt, /^WEBVTT/);
  assert.match(vtt, /00:00:02\.500 --> 00:00:07\.000/);
  assert.match(vtt, /<v Alice>Welcome everyone/);
});

test('exportToPlainText outputs readable text with timestamps and speaker tags', () => {
  const plain = exportToPlainText(mockTranscript, {
    includeSpeakers: true,
    includeTimestamps: true,
  });
  assert.match(plain, /\[0:02\] Alice: Welcome everyone/);
  assert.match(plain, /\[0:08\] Bob: Thanks Alice/);
});

test('exportToMarkdown creates structured document with summary and action items', () => {
  const md = exportToMarkdown(mockTranscript);
  assert.match(md, /# Tech Keynote Session/);
  assert.match(md, /## Executive Summary/);
  assert.match(md, /## Key Takeaways/);
  assert.match(md, /## Action Items/);
  assert.match(md, /- \[ \] Integrate SRT subtitle export/);
  assert.match(md, /> `\[0:02\]` \*\*Alice\*\*: Welcome everyone/);
});

test('computeWordStats calculates word count and reading metrics', () => {
  const stats = computeWordStats(mockSegments, 15);
  assert.equal(stats.wordCount, 18);
  assert.ok(stats.wpm > 0);
  assert.equal(stats.readingTimeMinutes, 1);
});

test('findCurrentSegmentIndex accurately selects active segment', () => {
  assert.equal(findCurrentSegmentIndex(mockSegments, 4.0), 0);
  assert.equal(findCurrentSegmentIndex(mockSegments, 10.0), 1);
  assert.equal(findCurrentSegmentIndex(mockSegments, 20.0), 1);
});
