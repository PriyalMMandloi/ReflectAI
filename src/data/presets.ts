import type { ReflectionPreset } from '../types';

export const REFLECTION_PRESETS: ReflectionPreset[] = [
  {
    id: 'socratic',
    label: 'Socratic Inquiry',
    tagline: 'Deep introspective inquiry',
    description: 'Asks gentle, probing questions to uncover underlying assumptions, beliefs, and emotions.',
    icon: 'Compass',
    samplePrompts: [
      'What was the most challenging decision I faced today, and why?',
      'I am feeling uncertain about a conversation I had earlier...',
      'Why do I feel a resistance towards starting this new project?',
      'What is one thing I took for granted today that I want to appreciate?',
    ],
  },
  {
    id: 'brainstorm',
    label: 'Creative Sparks',
    tagline: 'Unblock ideas & explore angles',
    description: 'Expands your thoughts with imaginative analogies, lateral perspectives, and alternative paths.',
    icon: 'Sparkles',
    samplePrompts: [
      'I have a rough concept for a project, help me expand it in 3 distinct directions...',
      'How might I approach this complex problem from a beginner’s mindset?',
      'Brainstorm 5 unusual ways to make my daily routine more joyful.',
    ],
  },
  {
    id: 'summary',
    label: 'Executive Digest',
    tagline: 'Distill core insights & patterns',
    description: 'Extracts key themes, emotional shifts, and clarity from your stream-of-consciousness writing.',
    icon: 'FileText',
    samplePrompts: [
      'Here is everything that happened today: let me know what patterns you notice...',
      'I feel mentally overloaded right now. Here is what is on my plate...',
    ],
  },
  {
    id: 'empathy',
    label: 'Supportive Space',
    tagline: 'Compassionate emotional processing',
    description: 'Offers a non-judgmental, validating presence when navigating vulnerability, stress, or grief.',
    icon: 'Heart',
    samplePrompts: [
      'I am feeling completely exhausted and overwhelmed today...',
      'I made a mistake at work and I keep replaying it in my head...',
      'I need a safe space to vent about what happened without needing a fix...',
    ],
  },
  {
    id: 'action',
    label: 'Clarity & Next Steps',
    tagline: 'Turn thoughts into actionable clarity',
    description: 'Helps translate feelings and ideas into clear, low-friction next steps and intentions.',
    icon: 'CheckCircle2',
    samplePrompts: [
      'I know what I want to achieve, but I feel paralyzed on where to begin...',
      'Help me break down my goals for the upcoming week into micro-steps...',
      'What is the single most impactful action I can take tomorrow morning?',
    ],
  },
];
