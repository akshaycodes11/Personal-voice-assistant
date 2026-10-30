export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

export interface PersonaConfig {
  name: string;
  role: string;
  location?: string;
  bio: string;
  lifeStory: string;
  superpower: string;
  growthAreas: string[];
  coworkerMisconception: string;
  pushingLimits: string;
  favoriteStack: string[];
  notableProjects: string[];
  why100x: string;
  speakingStyle: string;
}

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type AIProvider = 'auto' | 'gemini' | 'groq' | 'openai' | 'fallback';

export interface VoiceSettings {
  voiceURI: string | null;
  rate: number; // 0.5 to 2
  pitch: number; // 0.5 to 1.5
  volume: number; // 0 to 1
  autoListen: boolean; // Continuous conversation mode
  soundEffects: boolean;
}

