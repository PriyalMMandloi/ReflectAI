import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialization of Gemini client with telemetry header
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Resilient Gemini generateContent with automatic model fallback & per-request timeout
const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
  'gemini-flash-latest',
];

async function generateWithFallback(options: {
  contents: any[];
  config?: any;
  timeoutMs?: number;
}) {
  const ai = getAI();
  const timeoutMs = options.timeoutMs || 20000;
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const responsePromise = ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });

      // Timeout race to prevent indefinite hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Model ${model} request timed out after ${timeoutMs}ms`)), timeoutMs);
      });

      const response: any = await Promise.race([responsePromise, timeoutPromise]);
      if (response) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('Unable to complete reflection at this time. Please try again in a moment.');
}

// Helper to normalize conversation history into strict alternating user/model turns
function buildSanitizedChatContents(
  history: Array<{ role: string; content?: string }>,
  currentPrompt: string
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const normalized: Array<{ role: 'user' | 'model'; text: string }> = [];

  if (Array.isArray(history)) {
    for (const item of history) {
      const text = (item.content || '').trim();
      if (!text) continue;

      const role: 'user' | 'model' = item.role === 'user' ? 'user' : 'model';

      if (normalized.length > 0 && normalized[normalized.length - 1].role === role) {
        // Merge consecutive turns of the same role
        normalized[normalized.length - 1].text += `\n\n${text}`;
      } else {
        normalized.push({ role, text });
      }
    }
  }

  // Ensure prompt is included
  const promptText = (currentPrompt || '').trim();
  if (promptText) {
    if (normalized.length > 0 && normalized[normalized.length - 1].role === 'user') {
      normalized[normalized.length - 1].text += `\n\n${promptText}`;
    } else {
      normalized.push({ role: 'user', text: promptText });
    }
  }

  // Ensure first turn is 'user'
  while (normalized.length > 0 && normalized[0].role !== 'user') {
    normalized.shift();
  }

  // Fallback if empty
  if (normalized.length === 0) {
    normalized.push({ role: 'user', text: promptText || 'Hello' });
  }

  return normalized.map((item) => ({
    role: item.role,
    parts: [{ text: item.text }],
  }));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// Reflect / Chat endpoint
app.post('/api/gemini/reflect', async (req, res) => {
  try {
    const { history = [], prompt, reflectionMode = 'socratic' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    let modeInstruction = '';
    switch (reflectionMode) {
      case 'socratic':
        modeInstruction = 'Act as an insightful, warm, and philosophical journal companion. Ask thoughtful, gentle questions that encourage the user to look deeper into their thoughts, motivations, and values. Offer empathetic observations and refrain from being overly clinical.';
        break;
      case 'summary':
        modeInstruction = 'Distill the core themes, emotional state, and insights from the user’s thoughts. Provide a structured reflection highlighting key realizations and patterns.';
        break;
      case 'brainstorm':
        modeInstruction = 'Act as a creative thought-partner. Offer fresh angles, imaginative analogies, novel possibilities, and lateral ideas to help the user unblock their thinking.';
        break;
      case 'empathy':
        modeInstruction = 'Provide compassionate, validating, and supportive reflections. Help the user feel heard, understood, and grounded in moments of stress or vulnerability.';
        break;
      case 'action':
        modeInstruction = 'Help translate feelings and scattered thoughts into clear, manageable next steps, priorities, or gentle daily intentions without being overwhelming.';
        break;
      default:
        modeInstruction = 'Act as an empathetic, introspective, and helpful journaling partner.';
    }

    const systemInstruction = `You are ReflectAI, an intelligent, empathetic, and mindful journaling companion.
Your goal is to converse with the user on their journal entries, reflections, and personal thoughts.
Style guidelines:
- Be authentic, thoughtful, concise, and articulate.
- Avoid robotic clichés (e.g. "I understand how you feel as an AI").
- Use clean Markdown with bullet points or italicized reflection questions where suitable.
- Tone directive for current reflection mode: ${modeInstruction}
`;

    const contents = buildSanitizedChatContents(history, prompt);

    const response = await generateWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
      timeoutMs: 25000,
    });

    const replyText = response?.text || 'I am here with you. What else is on your mind?';

    res.json({
      reply: replyText,
    });
  } catch (err: any) {
    console.error('Error generating reflection:', err);
    res.status(500).json({
      error: err.message || 'Failed to generate reflection with Gemini',
    });
  }
});

// Summarization & Insight generation endpoint
app.post('/api/gemini/summarize', async (req, res) => {
  try {
    const { turns = [], rawText = '' } = req.body;

    const fullContent = rawText || turns.map((t: any) => `${t.role === 'user' ? 'User' : 'ReflectAI'}: ${t.content}`).join('\n\n');

    if (!fullContent || fullContent.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required for summary' });
    }

    const ai = getAI();

    const prompt = `Analyze the following personal journal entry/conversation and provide:
1. A concise, evocative title (max 6 words).
2. A 2-3 sentence executive reflection summary.
3. 2-4 key takeaways, realizations, or intentions.
4. An overall mood descriptor (e.g., "Reflective & Hopeful", "Overwhelmed to Clear", "Curious & Creative", "Grounded & Content").

Journal Content:
"""
${fullContent}
"""

Format your response strictly as valid JSON matching this schema:
{
  "title": "string",
  "summary": "string",
  "takeaways": ["string", "string"],
  "mood": "string"
}`;

    const response = await generateWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(text);
    } catch {
      parsedData = {
        title: 'Personal Reflection',
        summary: text,
        takeaways: [],
        mood: 'Reflective',
      };
    }

    res.json(parsedData);
  } catch (err: any) {
    console.error('Error summarizing journal:', err);
    res.status(500).json({
      error: err.message || 'Failed to generate summary with Gemini',
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReflectAI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
