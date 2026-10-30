import React from 'react';
import { VoiceState } from '@/types';

interface AudioWaveformProps {
  state: VoiceState;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ state }) => {
  const isActive = state === 'listening' || state === 'speaking';

  // Heights for 16 waveform bars
  const heights = [
    'h-3', 'h-6', 'h-10', 'h-5', 'h-8', 'h-12', 'h-7', 'h-11',
    'h-9', 'h-12', 'h-6', 'h-10', 'h-4', 'h-8', 'h-5', 'h-3'
  ];

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-1.5 h-14 my-2">
      {heights.map((heightClass, idx) => {
        // Staggered delays for wave effect
        const delay = (idx % 5) * 0.15;
        const barColor =
          state === 'listening'
            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
            : state === 'speaking'
              ? 'bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]'
              : state === 'thinking'
                ? 'bg-purple-400 animate-pulse'
                : 'bg-slate-700';

        return (
          <div
            key={idx}
            style={{
              animationDelay: `${delay}s`,
              animationDuration: state === 'speaking' ? '0.8s' : '1.2s'
            }}
            className={`w-1 sm:w-1.5 rounded-full transition-all duration-300 ${barColor} ${isActive ? `${heightClass} animate-wave` : 'h-2'
              }`}
          />
        );
      })}
    </div>
  );
};

