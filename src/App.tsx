import React, { useState } from 'react';
import { useVoiceBot } from '@/hooks/useVoiceBot';
import { VoiceOrb } from '@/components/VoiceOrb';
import { AudioWaveform } from '@/components/AudioWaveform';
import { VoiceControls } from '@/components/VoiceControls';
import { QuickPrompts } from '@/components/QuickPrompts';
import { ChatDrawer } from '@/components/ChatDrawer';
import { SettingsModal } from '@/components/SettingsModal';
import { PrivacyModal } from '@/components/PrivacyModal';
import {
  Sliders,
  MessageSquare,
  MicOff,
  ShieldCheck,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const {
    voiceState,
    messages,
    persona,
    settings,
    updateSettings,
    voices,
    selectedVoice,
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    isSttSupported,
    sttError,
    activeProvider,
    lastLatency,
    sendMessage,
    startListening,
    toggleListening,
    toggleHandsFree,
    stopSpeaking,
    replayMessage,
    resetConversation
  } = useVoiceBot();

  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Latest messages to display
  const lastBotMessage = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Subtle Background Glow Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-cyan-600/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-600/10 blur-[100px] pointer-events-none rounded-full" />

      {/* Top Navigation Bar */}
      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20">
            {persona.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                {persona.name}
              </h1>

            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              {persona.role}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">

          {/* Privacy Policy Modal Toggle */}
          <button
            type="button"
            onClick={() => setIsPrivacyModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Privacy & Data Retention Policy"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Privacy</span>
          </button>

          {/* Voice Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Voice Settings</span>
          </button>

          {/* Chat Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsChatDrawerOpen(true)}
            className="relative p-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-[9px] font-bold text-white flex items-center justify-center">
                {messages.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-6 px-4 max-w-4xl mx-auto w-full">
        {/* Browser Speech Recognition Unsupported Banner */}
        {!isSttSupported && (
          <div className="w-full max-w-md mb-3 p-3 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Browser Voice Notice:</span> Two-way microphone recognition requires Chrome, Edge, or Safari. You can still converse smoothly using the 1-click prompts and chat drawer!
            </div>
          </div>
        )}

        {/* Microphone Permission Denial or Device Warning with Retry Action */}
        {sttError && (
          <div className="w-full max-w-md mb-3 p-3 rounded-xl bg-amber-950/60 border border-amber-700/50 text-amber-200 text-xs flex items-center gap-2">
            <MicOff className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Voice Alert:</span> {sttError}
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startListening()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-700/60 hover:bg-amber-600 text-[11px] font-medium text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Mic
                </button>
                <span className="text-[10px] text-amber-300/80">Or click any prompt card below</span>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Glowing 3D Voice Orb */}
        <VoiceOrb
          state={voiceState}
          onClick={voiceState === 'speaking' ? stopSpeaking : toggleListening}
          isListening={isListening}
          isSpeaking={isSpeaking}
        />

        {/* Dynamic Audio Waveform */}
        <AudioWaveform state={voiceState} />

        {/* Live Subtitle / Spoken Transcript Feedback */}
        <div className="w-full max-w-xl min-h-[52px] flex items-center justify-center text-center px-4 my-2">
          {voiceState === 'listening' ? (
            <p className="text-emerald-300 text-sm font-medium animate-pulse">
              &ldquo;{transcript || interimTranscript || 'Listening... speak clearly into your mic'}&rdquo;
            </p>
          ) : voiceState === 'thinking' ? (
            <p className="text-purple-300 text-sm font-medium animate-pulse">
              Formulating thoughts...
            </p>
          ) : voiceState === 'speaking' && lastBotMessage ? (
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed max-h-20 overflow-y-auto px-2">
              &ldquo;{lastBotMessage.content}&rdquo;
            </p>
          ) : lastBotMessage ? (
            <p className="text-slate-400 text-xs sm:text-sm line-clamp-2">
              &ldquo;{lastBotMessage.content}&rdquo;
            </p>
          ) : (
            <p className="text-slate-500 text-xs sm:text-sm">
              Press the mic button or click any test question below to converse.
            </p>
          )}
        </div>

        {/* Primary Voice Controls */}
        <VoiceControls
          state={voiceState}
          isListening={isListening}
          isSpeaking={isSpeaking}
          isHandsFree={settings.autoListen}
          transcript={transcript}
          interimTranscript={interimTranscript}
          onToggleListen={toggleListening}
          onStopSpeaking={stopSpeaking}
          onToggleHandsFree={toggleHandsFree}
          onReset={resetConversation}
          onOpenDrawer={() => setIsChatDrawerOpen(true)}
        />

        {/* 1-Click Assessment Prompts */}
        <QuickPrompts
          onSelectPrompt={(promptText) => sendMessage(promptText)}
          disabled={voiceState === 'thinking'}
        />
      </main>



      {/* Slide-out Chat / Transcript Drawer */}
      <ChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        messages={messages}
        onSendMessage={sendMessage}
        onReplayAudio={(text) => replayMessage(text)}
        isThinking={voiceState === 'thinking'}
      />

      {/* Audio & Voice Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        voices={voices}
        activeProvider={activeProvider}
        lastLatency={lastLatency}
      />

      {/* Privacy & Zero-Storage Policy Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
}

