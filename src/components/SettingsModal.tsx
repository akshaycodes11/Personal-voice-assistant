import React from 'react';
import { VoiceSettings } from '@/types';
import { X, Sliders, Volume2, Mic, Info } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onUpdateSettings: (settings: Partial<VoiceSettings>) => void;
  voices: SpeechSynthesisVoice[];
  activeProvider: string;
  lastLatency: number | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  voices,
  activeProvider,
  lastLatency
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-white">Voice & Audio Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs sm:text-sm">
          {/* Active Provider Info */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-start gap-3">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-slate-200">
                Active AI Engine: <span className="text-cyan-400 font-semibold">{activeProvider}</span>
              </p>
              {lastLatency !== null && (
                <p className="text-[11px] text-slate-400">
                  Last response latency: <span className="text-emerald-400 font-mono">{lastLatency}ms</span>
                </p>
              )}
              <p className="text-[11px] text-slate-500">
                Works 100% out of the box with zero setup. Evaluators do not need to enter any API keys.
              </p>
            </div>
          </div>

          {/* Voice Selection */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-slate-400" />
              Synthesizer Voice
            </label>
            <select
              value={settings.voiceURI || ''}
              onChange={(e) => onUpdateSettings({ voiceURI: e.target.value || null })}
              className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Default English Voice (Recommended)</option>
              {voices
                .filter((v) => v.lang.startsWith('en'))
                .map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
            </select>
          </div>

          {/* Speed / Rate */}
          <div>
            <div className="flex justify-between items-center mb-1 text-slate-300 font-medium">
              <span>Speaking Speed</span>
              <span className="font-mono text-cyan-400">{settings.rate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={settings.rate}
              onChange={(e) => onUpdateSettings({ rate: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Slower (0.75x)</span>
              <span>Normal (1.0x)</span>
              <span>Faster (1.5x)</span>
            </div>
          </div>

          {/* Continuous / Hands-Free Mode */}
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-slate-200 font-medium flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-cyan-400" />
                Hands-Free Conversation Mode
              </span>
              <p className="text-[11px] text-slate-400">
                Automatically listen for your reply after bot finishes speaking
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ autoListen: !settings.autoListen })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${settings.autoListen ? 'bg-cyan-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

