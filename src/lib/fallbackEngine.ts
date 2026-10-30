import { DEFAULT_PERSONA } from './persona';
import { PersonaConfig } from '@/types';

interface IntentMatch {
  keywords: string[];
  phrases?: string[];
  responder: (persona: PersonaConfig) => string;
}

const INTENT_RULES: IntentMatch[] = [
  // 1. Life story
  {
    keywords: ['life story', 'story', 'background', 'journey', 'who are you', 'tell me about yourself', 'about your life', 'where are you from'],
    phrases: ['life story', 'tell me about yourself', 'your story', 'your journey'],
    responder: (p) =>
      `In a few sentences: ${p.lifeStory} That drive to take complex ideas and turn them into intuitive software is what defines everything I do.`
  },

  // 2. Superpower
  {
    keywords: ['superpower', 'number one superpower', 'greatest strength', 'best skill', 'strength', 'super power'],
    phrases: ['#1 superpower', 'number one superpower', 'your superpower', 'superpower'],
    responder: (p) =>
      `${p.superpower} I don't just think about solutions—I ship them.`
  },

  // 3. Top 3 Growth Areas
  {
    keywords: ['growth', 'grow', 'areas to grow', 'improve', 'top 3', 'weakness', 'development', 'learn'],
    phrases: ['areas you\'d like to grow', 'areas you would like to grow', 'top 3 areas', 'areas to grow'],
    responder: (p) =>
      `The top three areas I am actively growing in are: First, ${p.growthAreas[0]} Second, ${p.growthAreas[1]} And third, ${p.growthAreas[2]} I constantly look for projects that stretch these muscles.`
  },

  // 4. Misconceptions
  {
    keywords: ['misconception', 'coworker', 'colleague', 'think about you', 'misunderstand', 'perceive'],
    phrases: ['misconception do your coworkers have', 'misconception', 'coworkers think'],
    responder: (p) =>
      `${p.coworkerMisconception}`
  },

  // 5. Pushing boundaries and limits
  {
    keywords: ['boundary', 'boundaries', 'limit', 'limits', 'push', 'comfort zone', 'challenge yourself', 'pressure'],
    phrases: ['push your boundaries', 'boundaries and limits', 'push limits'],
    responder: (p) =>
      `${p.pushingLimits}`
  },

  // 6. Tech stack
  {
    keywords: ['tech stack', 'technology', 'tools', 'framework', 'languages', 'react', 'typescript', 'python', 'nextjs'],
    phrases: ['tech stack', 'favorite stack', 'technologies you use'],
    responder: (p) =>
      `My go-to stack centers around TypeScript, Next.js, and Node.js on the web, paired with Python and FastAPI for AI and agentic backends. I also work extensively with modern LLM APIs from OpenAI, Groq, and Gemini, alongside PostgreSQL and Redis.`
  },

  // 7. Why 100x
  {
    keywords: ['100x', 'engineers', 'cohort', 'fellowship', 'program', 'why 100x', 'why join'],
    phrases: ['why 100x', '100x engineers'],
    responder: (p) =>
      `${p.why100x}`
  },

  // 8. Notable Projects
  {
    keywords: ['project', 'built', 'portfolio', 'created', 'shipped', 'recent work'],
    phrases: ['what projects', 'notable projects', 'things you built'],
    responder: (p) =>
      `Some of my favorite recent builds include this interactive real-time Voicebot Persona engine, autonomous multi-agent reasoning workflows for automated research, and full-stack collaborative web apps. I love building tools that feel magical and save people real hours.`
  },

  // 9. Greetings
  {
    keywords: ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'sup'],
    phrases: ['hello', 'hi there', 'hey akshay'],
    responder: (p) =>
      `Hey there, I'm ${p.name}! Great to meet you. Feel free to ask me anything about my journey, my superpowers, top growth areas, or how I build and push limits. What would you like to know?`
  },

  // 10. How are you / Status
  {
    keywords: ['how are you', 'how do you do', 'how is it going', 'doing today'],
    phrases: ['how are you', 'how is it going'],
    responder: () =>
      `I am doing great and excited to chat with you! What questions do you have about my engineering journey or mindset?`
  },

  // 11. Work style / Culture / Teamwork
  {
    keywords: ['team', 'culture', 'collaborate', 'communication', 'conflict', 'feedback'],
    phrases: ['working in a team', 'team player', 'handle feedback'],
    responder: () =>
      `I thrive in high-trust, fast-paced teams with radical candor. I believe in giving and receiving direct, ego-free feedback, documenting decisions clearly, and celebrating teammates when they ship high-impact wins.`
  }
];

/**
 * Clean text for voice synthesis (strip markdown, asterisks, hashtags, backticks)
 */
export function sanitizeForVoice(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold
    .replace(/\*(.*?)\*/g, '$1')     // remove italics
    .replace(/__(.*?)__/g, '$1')     // remove underline
    .replace(/#+\s+/g, '')           // remove headers
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // remove inline code
    .replace(/^\s*[-*+]\s+/gm, '')   // remove bullet points
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // remove links
    .replace(/[^\w\s.,?!'"-:;]/g, '') // remove exotic symbols / emoji
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Intelligent fallback generator when LLM API is unavailable.
 */
export function generateFallbackResponse(
  query: string,
  persona: PersonaConfig = DEFAULT_PERSONA
): string {
  const normalized = query.toLowerCase().trim();

  // 1. Direct phrase matching
  for (const rule of INTENT_RULES) {
    if (rule.phrases && rule.phrases.some((p) => normalized.includes(p))) {
      return sanitizeForVoice(rule.responder(persona));
    }
  }

  // 2. Keyword density matching
  let bestMatch: IntentMatch | null = null;
  let maxScore = 0;

  for (const rule of INTENT_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (normalized.includes(kw)) {
        score += kw.split(' ').length; // weight multi-word matches more
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = rule;
    }
  }

  if (bestMatch && maxScore > 0) {
    return sanitizeForVoice(bestMatch.responder(persona));
  }

  // 3. Fallback response that stays in character
  return sanitizeForVoice(
    "That's an insightful question! In my work, I focus on high-velocity learning, strong architectural fundamentals, and building things that matter. Feel free to ask about my life story, my number one superpower, growth areas, or how I push my boundaries!"
  );
}

