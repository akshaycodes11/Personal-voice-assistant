import React from 'react';
import { X, ShieldCheck, Lock, MicOff, RefreshCw, ServerOff } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Conversation Privacy & Security</h3>
            <p className="text-xs text-slate-400">Zero-storage, on-device audio, and ephemeral processing</p>
          </div>
        </div>

        <div className="space-y-3.5 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start gap-3">
            <MicOff className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">On-Device Voice Synthesis & Recognition</p>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Speech-to-text (STT) and text-to-speech (TTS) occur entirely inside your browser via the standard Web Speech API. No microphone audio streams or audio recordings are ever uploaded or saved.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start gap-3">
            <ServerOff className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">Zero Server Data Persistence</p>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Conversation transcripts are evaluated in-memory during inference and are never written to any database, file system, or analytics platform. Transcripts vanish when you close the tab.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start gap-3">
            <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">Cryptographically Hashed Abuse Protection</p>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Rate limiting uses ephemeral SHA-256 hashes with rotating salts. Client IP addresses are never recorded or logged. Hashes are purged from memory automatically every 60 seconds.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start gap-3">
            <RefreshCw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">Instant Local Session Purge</p>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Clicking the reset button in the voice controls immediately purges all conversation history from browser state.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

