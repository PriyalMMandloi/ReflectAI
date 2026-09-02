export type ReflectionMode = 'socratic' | 'summary' | 'brainstorm' | 'empathy' | 'action';

export interface Turn {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  mode?: ReflectionMode;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  turns: Turn[];
  summary?: string;
  takeaways?: string[];
  mood?: string;
  tags?: string[];
  isPinned?: boolean;
  reflectionMode?: ReflectionMode;
}

export interface ReflectionPreset {
  id: ReflectionMode;
  label: string;
  tagline: string;
  description: string;
  icon: string;
  samplePrompts: string[];
}
