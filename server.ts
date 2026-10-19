import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Increase payload limit for audio/video uploads
app.use(express.json({ limit: '120mb' }));
app.use(express.urlencoded({ limit: '120mb', extended: true }));

// Initialize GoogleGenAI if key is present
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Health endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// Transcribe Audio / Video endpoint
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const { fileData, mimeType, fileName, options } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: 'Missing fileData payload' });
    }

    // Clean base64 string
    const base64Content = fileData.replace(/^data:[^;]+;base64,/, '');

    const languageHint = options?.languageHint || 'Detect automatically';
    const detectSpeakers = options?.detectSpeakers !== false;
    const promptNotes = options?.promptNotes ? `Additional context: ${options.promptNotes}` : '';

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please configure it in AI Studio Secrets.',
        code: 'MISSING_API_KEY',
      });
    }

    const systemPrompt = `You are a world-class audio and video speech transcription AI.
Transcribe the provided media recording accurately and verbatim.
Ensure:
1. Identify distinct speakers if multiple voices are present (e.g. "Speaker 1", "Speaker 2", or actual names if stated).
2. Segment speech into logical conversational sentences or phrases (typically 3 to 15 seconds per segment).
3. Provide accurate start and end timestamps for each segment in HH:MM:SS or MM:SS format, along with exact numeric seconds.
4. Extract an executive summary of the entire discussion.
5. Extract key discussion points and any specific action items or tasks mentioned.
6. Divide into thematic chapters with title, start timestamp, and brief summary.
Language preference: ${languageHint}.
${promptNotes}`;

    const promptText = `Please transcribe this audio/video recording completely into structured JSON according to the schema provided.
Include title, detected language, summary, keyPoints, actionItems, chapters, and segments with speaker, start/end seconds, and text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'audio/mp3',
            data: base64Content,
          },
        },
        {
          text: promptText,
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            language: { type: Type.STRING },
            durationSeconds: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            actionItems: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            speakers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  startTime: { type: Type.STRING },
                  startSeconds: { type: Type.NUMBER },
                  summary: { type: Type.STRING },
                },
                required: ['title', 'startTime', 'startSeconds', 'summary'],
              },
            },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                  startTime: { type: Type.STRING },
                  startSeconds: { type: Type.NUMBER },
                  endTime: { type: Type.STRING },
                  endSeconds: { type: Type.NUMBER },
                  text: { type: Type.STRING },
                },
                required: ['speaker', 'startTime', 'startSeconds', 'endTime', 'endSeconds', 'text'],
              },
            },
            fullText: { type: Type.STRING },
          },
          required: ['title', 'summary', 'segments'],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response received from Gemini model');
    }

    const parsedData = JSON.parse(responseText);

    // Ensure IDs and valid seconds
    const segments = (parsedData.segments || []).map((seg: any, idx: number) => ({
      id: seg.id || `seg-${idx + 1}`,
      speaker: detectSpeakers ? seg.speaker || `Speaker 1` : 'Speaker',
      startTime: seg.startTime || '00:00:00',
      startSeconds: typeof seg.startSeconds === 'number' ? seg.startSeconds : idx * 5,
      endTime: seg.endTime || '00:00:05',
      endSeconds: typeof seg.endSeconds === 'number' ? seg.endSeconds : (idx + 1) * 5,
      text: seg.text || '',
    }));

    const chapters = (parsedData.chapters || []).map((c: any, idx: number) => ({
      id: c.id || `chap-${idx + 1}`,
      title: c.title || `Chapter ${idx + 1}`,
      startTime: c.startTime || '00:00:00',
      startSeconds: typeof c.startSeconds === 'number' ? c.startSeconds : 0,
      summary: c.summary || '',
    }));

    const fullText =
      parsedData.fullText || segments.map((s: any) => `${s.speaker}: ${s.text}`).join('\n\n');

    const durationSeconds =
      parsedData.durationSeconds ||
      (segments.length > 0 ? segments[segments.length - 1].endSeconds : 60);

    const result = {
      id: `tx-${Date.now()}`,
      title: parsedData.title || fileName || 'Untitled Audio Recording',
      language: parsedData.language || 'English',
      durationSeconds,
      summary: parsedData.summary || 'Transcription completed successfully.',
      keyPoints: parsedData.keyPoints || [],
      actionItems: parsedData.actionItems || [],
      speakers: parsedData.speakers || Array.from(new Set(segments.map((s: any) => s.speaker))),
      chapters,
      segments,
      fullText,
      createdAt: new Date().toISOString(),
      mediaType: (mimeType?.startsWith('video/') ? 'video' : 'audio') as 'audio' | 'video',
      fileName: fileName || 'media_file',
    };

    return res.json(result);
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to transcribe audio/video',
    });
  }
});

// Translation endpoint
app.post('/api/translate', async (req: Request, res: Response) => {
  try {
    const { segments, summary, targetLanguage } = req.body;

    if (!segments || !Array.isArray(segments) || !targetLanguage) {
      return res.status(400).json({ error: 'Missing segments or targetLanguage' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    const prompt = `Translate the following speech transcript segments and summary into ${targetLanguage}.
Keep the exact same ids, speakers, and timing numbers (startSeconds, endSeconds, startTime, endTime).
Only translate the "text" property of each segment and the "summary" string.

Data to translate:
${JSON.stringify({ summary, segments }, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedSummary: { type: Type.STRING },
            translatedSegments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                  startTime: { type: Type.STRING },
                  startSeconds: { type: Type.NUMBER },
                  endTime: { type: Type.STRING },
                  endSeconds: { type: Type.NUMBER },
                  text: { type: Type.STRING },
                },
                required: ['id', 'speaker', 'text', 'startSeconds', 'endSeconds'],
              },
            },
          },
          required: ['translatedSummary', 'translatedSegments'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      summary: parsed.translatedSummary || summary,
      segments: parsed.translatedSegments || segments,
      targetLanguage,
    });
  } catch (err: any) {
    console.error('Translation error:', err);
    return res.status(500).json({ error: err.message || 'Translation failed' });
  }
});

// Ask / Q&A endpoint about the transcript
app.post('/api/ask', async (req: Request, res: Response) => {
  try {
    const { question, fullText, summary } = req.body;
    if (!question || !fullText) {
      return res.status(400).json({ error: 'Missing question or fullText' });
    }

    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const prompt = `You are an AI research assistant analyzing this audio/video transcript.
Transcript Summary:
${summary || 'N/A'}

Full Transcript:
${fullText}

User Question: ${question}

Provide a direct, accurate, and insightful answer based on what was said in the transcript. If specific timestamps or speakers are relevant, mention them.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return res.json({ answer: response.text });
  } catch (err: any) {
    console.error('Q&A error:', err);
    return res.status(500).json({ error: err.message || 'Failed to answer question' });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
