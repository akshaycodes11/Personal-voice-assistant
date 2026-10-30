import React from 'react';
import { Mic, MicOff, Square, RotateCcw, Radio, MessageSquare } from 'lucide-react';
import { VoiceState } from '@/types';

interface VoiceControlsProps {
  state: VoiceState;
  isListening: boolean;
  isSpeaking: boolean;
  isHandsFree: boolean;
  transcript: string;
  interimTranscript: string;
  onToggleListen: () => void;
  onStopSpeaking: () => void;
  onToggleHandsFree: () => void;
  onReset: () => void;
  onOpenDrawer: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  state,
  isListening,
  isSpeaking,
  isHandsFree,
  transcript,
  interimTranscript,
  onToggleListen,
  onStopSpeaking,
  onToggleHandsFree,
  onReset,
  onOpenDrawer
}) => {
  const currentSpokenText = (transcript + ' ' + interimTranscript).trim();

  return (
    <div className="w-full max-w-xl mx-auto px-4 flex flex-col items-center gap-4">
      {/* Live speech feedback pill */}
      {isListening && (
        <div className="w-full p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-700/40 text-emerald-300 text-xs sm:text-sm text-center flex items-center justify-center gap-2 animate-pulse">
          <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">
            {currentSpokenText || 'Listening... speak your question'}
          </span>
        </div>
      )}

      {/* Control Buttons Bar */}
      <div className="flex items-center justify-center gap-3 w-full">
        {/* Reset Conversation */}
        <button
          type="button"
          onClick={onReset}
          title="Reset conversation"
          className="p-3 rounded-full border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* Primary Mic Toggle */}
        <button
          type="button"
          onClick={onToggleListen}
          className={`flex items-center gap-2 px-6 py-3.5 rounded-full font-medium transition-all shadow-lg ${
            isListening
              ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/30 ring-4 ring-emerald-500/20'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20'
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="w-5 h-5 animate-pulse" />
              <span>Tap to Stop & Send</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>Speak Question</span>
            </>
          )}
        </button>

        {/* Interrupt / Stop Speaking (Visible when bot is speaking) */}
        {isSpeaking && (
          <button
            type="button"
            onClick={onStopSpeaking}
            title="Interrupt voice"
            className="p-3 rounded-full border border-rose-800/60 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 transition-colors animate-pulse"
          >
            <Square className="w-5 h-5 fill-current" />
          </button>
        )}

        {/* Full Chat Transcript Drawer Button */}
        <button
          type="button"
          onClick={onOpenDrawer}
          title="View Transcript History"
          className="p-3 rounded-full border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>

      {/* Hands-Free Conversation Mode Toggle */}
      <button
        type="button"
        onClick={onToggleHandsFree}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          isHandsFree
            ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isHandsFree ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'
          }`}
        />
        Hands-Free Auto-Listen: {isHandsFree ? 'Active' : 'Off'}
      </button>
    </div>
  );
};

