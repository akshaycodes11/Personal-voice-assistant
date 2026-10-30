import React from 'react';
import { VoiceState } from '@/types';
import { Mic, Volume2, Sparkles, Loader2 } from 'lucide-react';

interface VoiceOrbProps {
  state: VoiceState;
  onClick: () => void;
  isListening: boolean;
  isSpeaking: boolean;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  onClick,
  isListening,
  isSpeaking
}) => {
  // Determine styles and labels based on current state
  const getStateConfig = () => {
    switch (state) {
      case 'listening':
        return {
          glow: 'from-emerald-500/40 via-cyan-500/40 to-blue-500/40',
          ring: 'border-emerald-400/60 shadow-[0_0_50px_rgba(52,211,153,0.5)]',
          core: 'from-emerald-400 to-teal-500',
          icon: <Mic className="w-10 h-10 text-white animate-pulse" />,
          label: 'Listening to you...',
          sublabel: 'Speak now or tap to send'
        };
      case 'thinking':
        return {
          glow: 'from-purple-500/40 via-pink-500/40 to-indigo-500/40',
          ring: 'border-purple-400/60 shadow-[0_0_50px_rgba(192,132,252,0.5)]',
          core: 'from-purple-500 to-indigo-600',
          icon: <Loader2 className="w-10 h-10 text-white animate-spin" />,
          label: 'Formulating response...',
          sublabel: 'Synthesizing thoughts'
        };
      case 'speaking':
        return {
          glow: 'from-cyan-500/40 via-blue-500/40 to-indigo-500/40',
          ring: 'border-cyan-400/60 shadow-[0_0_60px_rgba(56,189,248,0.6)] animate-pulse',
          core: 'from-cyan-400 to-blue-600',
          icon: <Volume2 className="w-10 h-10 text-white animate-bounce" />,
          label: 'Speaking...',
          sublabel: 'Tap orb to interrupt'
        };
      case 'idle':
      default:
        return {
          glow: 'from-blue-600/30 via-indigo-600/30 to-violet-600/30',
          ring: 'border-blue-500/30 hover:border-cyan-400/60 shadow-[0_0_40px_rgba(59,130,246,0.3)]',
          core: 'from-blue-500 via-indigo-500 to-purple-600',
          icon: <Sparkles className="w-10 h-10 text-white/90" />,
          label: 'Ready to converse',
          sublabel: 'Tap orb to start talking'
        };
    }
  };

  const config = getStateConfig();

  return (
    <div className="flex flex-col items-center justify-center my-6">
      {/* Outer Glow & Ripples */}
      <div className="relative flex items-center justify-center">
        {/* Animated Ripple Circles */}
        {state === 'listening' && (
          <>
            <span className="absolute w-64 h-64 rounded-full border border-emerald-500/30 animate-ping pointer-events-none" />
            <span className="absolute w-72 h-72 rounded-full border border-teal-500/20 animate-pulse pointer-events-none" />
          </>
        )}
        {state === 'speaking' && (
          <>
            <span className="absolute w-64 h-64 rounded-full border border-cyan-500/40 animate-ping pointer-events-none" />
            <span className="absolute w-80 h-80 rounded-full border border-blue-500/20 animate-pulse pointer-events-none" />
          </>
        )}

        {/* Ambient background bloom */}
        <div
          className={`absolute w-56 h-56 rounded-full bg-gradient-to-tr ${config.glow} blur-3xl transition-all duration-700 pointer-events-none`}
        />

        {/* Main Interactive Orb */}
        <button
          onClick={onClick}
          type="button"
          aria-label={config.label}
          className={`relative group w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 ${config.ring} flex items-center justify-center transition-all duration-500 transform active:scale-95 cursor-pointer backdrop-blur-md bg-slate-900/40`}
        >
          {/* Inner Core Gradient */}
          <div
            className={`w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr ${config.core} shadow-inner flex items-center justify-center transition-all duration-500 group-hover:scale-105`}
          >
            {/* Center Icon */}
            <div className="p-4 rounded-full bg-black/20 backdrop-blur-sm border border-white/20 shadow-md">
              {config.icon}
            </div>
          </div>
        </button>
      </div>

      {/* Dynamic Status Text */}
      <div className="mt-6 text-center space-y-1">
        <p className="text-lg font-semibold tracking-wide text-white flex items-center justify-center gap-2">
          {config.label}
        </p>
        <p className="text-xs sm:text-sm text-slate-400">
          {config.sublabel}
        </p>
      </div>
    </div>
  );
};

