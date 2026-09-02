import type { ReflectionMode, Turn } from '../types';

export interface ReflectResponse {
  reply: string;
}

export interface SummarizeResponse {
  title: string;
  summary: string;
  takeaways: string[];
  mood: string;
}

export const generateGeminiReflection = async (
  prompt: string,
  history: Turn[],
  reflectionMode: ReflectionMode = 'socratic'
): Promise<ReflectResponse> => {
  const formattedHistory = history.map((t) => ({
    role: t.role === 'user' ? 'user' : 'model',
    content: t.content,
  }));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch('/api/gemini/reflect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        history: formattedHistory,
        reflectionMode,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate reflection`);
    }

    return await response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Reflection request timed out. Please try sending again.');
    }
    throw err;
  }
};

export const generateGeminiSummary = async (
  turns: Turn[],
  rawText?: string
): Promise<SummarizeResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch('/api/gemini/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        turns,
        rawText,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate summary`);
    }

    return await response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Summary generation timed out. Please try again.');
    }
    throw err;
  }
};
