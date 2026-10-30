import React from 'react';
import { Sparkles, TrendingUp, ShieldAlert, Flame, Award, HelpCircle } from 'lucide-react';

interface QuickPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

interface PromptItem {
  id: string;
  category: string;
  icon: React.ReactNode;
  prompt: string;
  badge?: string;
}

export const SAMPLE_PROMPTS: PromptItem[] = [
  {
    id: 'lifestory',
    category: 'Assessment Core',
    icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
    prompt: 'What should we know about your life story in a few sentences?',
    badge: 'Life Story'
  },
  {
    id: 'growth',
    category: 'Assessment Core',
    icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
    prompt: "What are the top 3 areas you'd like to grow in?",
    badge: 'Growth Areas'
  },

  {
    id: 'boundaries',
    category: 'Assessment Core',
    icon: <Flame className="w-4 h-4 text-rose-400" />,
    prompt: 'How do you push your boundaries and limits?',
    badge: 'Limits'
  },

  {
    id: 'rag-project',
    category: 'RAG Architecture',
    icon: <ShieldAlert className="w-4 h-4 text-indigo-400" />,
    prompt: 'How did you architect the PlaceMux Support & Knowledge Chat Assistant?',
    badge: 'RAG Guardrails'
  },

  {
    id: 'five-years',
    category: 'Professional Vision',
    icon: <Award className="w-4 h-4 text-purple-400" />,
    prompt: 'Where do you see yourself in next 5 years?',
    badge: '5-Year Vision'
  }
];

export const QuickPrompts: React.FC<QuickPromptsProps> = ({
  onSelectPrompt,
  disabled = false
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Test Interview Questions (1-Click)
        </h3>
        <span className="text-[11px] text-slate-500">Tap any prompt to test instantly</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {SAMPLE_PROMPTS.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(item.prompt)}
            className="group text-left p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-800/80 hover:border-cyan-500/40 transition-all duration-200 backdrop-blur-sm flex items-start gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-cyan-950/30 cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700/60 group-hover:scale-105 transition-transform shrink-0 mt-0.5">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  {item.category}
                </span>
                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 font-mono">
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-200 group-hover:text-white line-clamp-2">
                &ldquo;{item.prompt}&rdquo;
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
