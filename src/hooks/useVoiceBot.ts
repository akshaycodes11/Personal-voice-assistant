import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, PersonaConfig, VoiceSettings, VoiceState } from '@/types';
import { DEFAULT_PERSONA } from '@/lib/persona';
import { generateFallbackResponse } from '@/lib/fallbackEngine';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';

const STORAGE_KEY_PERSONA = 'voicebot_persona_v1';
const STORAGE_KEY_SETTINGS = 'voicebot_settings_v1';

export function useVoiceBot() {
  const [persona, setPersona] = useState<PersonaConfig>(DEFAULT_PERSONA);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [activeProvider, setActiveProvider] = useState<string>('FastAPI Backend');

  const [settings, setSettings] = useState<VoiceSettings>({
    voiceURI: null,
    rate: 1.05,
    pitch: 1.0,
    volume: 1.0,
    autoListen: false,
    soundEffects: true
  });

  const isHandsFreeRef = useRef<boolean>(false);
  isHandsFreeRef.current = settings.autoListen;

  const voiceStateRef = useRef<VoiceState>(voiceState);
  voiceStateRef.current = voiceState;

  // Detect active backend provider on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.activeProvider) {
          setActiveProvider(data.activeProvider);
        }
      })
      .catch(() => {
        setActiveProvider('Client Heuristic Engine');
      });
  }, []);

  // Load persisted persona & settings from localStorage
  useEffect(() => {
    try {
      const savedPersona = localStorage.getItem(STORAGE_KEY_PERSONA);
      if (savedPersona) {
        setPersona(JSON.parse(savedPersona));
      }

      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        setSettings((prev) => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
    }
  }, []);

  const savePersona = (newPersona: PersonaConfig) => {
    setPersona(newPersona);
    try {
      localStorage.setItem(STORAGE_KEY_PERSONA, JSON.stringify(newPersona));
    } catch { }
  };

  const updateSettings = (partial: Partial<VoiceSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updated));
      } catch { }
      return updated;
    });
  };

  // Setup TTS
  const {
    isSupported: isTtsSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
    isSpeaking,
    speak,
    stop: stopSpeakingInternal
  } = useSpeechSynthesis({
    onStart: () => {
      setVoiceState('speaking');
    },
    onEnd: () => {
      setVoiceState('idle');
      if (isHandsFreeRef.current) {
        setTimeout(() => {
          if (isHandsFreeRef.current && voiceStateRef.current === 'idle') {
            startListening();
          }
        }, 400);
      }
    },
    onError: () => {
      setVoiceState('idle');
    }
  });

  // Keep selected voice in sync with settings voiceURI
  useEffect(() => {
    if (settings.voiceURI && voices.length > 0) {
      const match = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (match) setSelectedVoice(match);
    }
  }, [settings.voiceURI, voices, setSelectedVoice]);

  // Forward ref to prevent stale closures in recognition callbacks
  const handleUserMessageRef = useRef<(text: string) => Promise<void>>();

  // Setup STT
  const {
    isSupported: isSttSupported,
    isListening,
    transcript,
    interimTranscript,
    error: sttError,
    startListening: startListeningInternal,
    stopListening: stopListeningInternal,
    resetTranscript,
    getCapturedText
  } = useSpeechRecognition({
    silenceDelayMs: 1200,
    onUserSpeechDetected: () => {
      // Voice interaction safeguard: Barge-in interruption
      // If user speaks while TTS is playing, interrupt speech synthesis immediately
      if (voiceStateRef.current === 'speaking') {
        stopSpeakingInternal();
        setVoiceState('listening');
      }
    },
    onSilenceTimeout: (spokenText) => {
      if (spokenText && spokenText.trim()) {
        if (handleUserMessageRef.current) {
          handleUserMessageRef.current(spokenText.trim());
        }
      }
    },
    onEndWithoutSpeech: () => {
      // If hands-free is active and we are in listening mode, keep listening
      if (isHandsFreeRef.current && voiceStateRef.current === 'listening') {
        setTimeout(() => {
          if (isHandsFreeRef.current && voiceStateRef.current === 'listening') {
            startListeningInternal();
          }
        }, 250);
      }
    }
  });

  // Send message to server and trigger voice output
  const sendMessage = useCallback(
    async (text: string) => {
      const cleanText = text.trim();
      if (!cleanText) return;

      // Immediately halt listening and current speech while processing
      stopListeningInternal();
      stopSpeakingInternal();

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: cleanText,
        timestamp: Date.now()
      };

      setMessages((prev) => [...prev, userMsg]);
      setVoiceState('thinking');
      resetTranscript();

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMsg],
            persona
          })
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();
        const replyText = data.reply || "I didn't quite catch that. Could you ask again?";
        setActiveProvider(data.providerUsed || 'FastAPI');
        if (typeof data.latencyMs === 'number') {
          setLastLatency(data.latencyMs);
        }

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          timestamp: Date.now()
        };

        setMessages((prev) => [...prev, botMsg]);

        speak(replyText, {
          voice: selectedVoice,
          rate: settings.rate,
          pitch: settings.pitch,
          volume: settings.volume
        });
      } catch (err) {
        console.warn('Backend API fetch failed, activating resilient fallback:', err);
        const replyText = generateFallbackResponse(cleanText, persona);
        setActiveProvider('Client Fallback Engine');
        setLastLatency(12);

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          timestamp: Date.now()
        };

        setMessages((prev) => [...prev, botMsg]);

        speak(replyText, {
          voice: selectedVoice,
          rate: settings.rate,
          pitch: settings.pitch,
          volume: settings.volume
        });
      }
    },
    [
      messages,
      persona,
      speak,
      selectedVoice,
      settings.rate,
      settings.pitch,
      settings.volume,
      stopSpeakingInternal,
      stopListeningInternal,
      resetTranscript
    ]
  );

  handleUserMessageRef.current = sendMessage;

  const startListening = useCallback(async () => {
    stopSpeakingInternal();
    setVoiceState('listening');
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.warn('Microphone permission check:', err);
      }
    }
    startListeningInternal();
  }, [startListeningInternal, stopSpeakingInternal]);

  const stopListening = useCallback(() => {
    const capturedFromStop = stopListeningInternal();
    const finalContent = (capturedFromStop || transcript || interimTranscript || getCapturedText()).trim();
    if (finalContent) {
      sendMessage(finalContent);
    } else {
      setVoiceState('idle');
    }
  }, [stopListeningInternal, transcript, interimTranscript, getCapturedText, sendMessage]);

  const toggleListening = useCallback(() => {
    if (isListening || voiceState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, voiceState, stopListening, startListening]);

  const toggleHandsFree = useCallback(() => {
    const nextState = !settings.autoListen;
    updateSettings({ autoListen: nextState });
    if (nextState) {
      if (voiceState === 'idle') {
        startListening();
      }
    } else {
      if (voiceState === 'listening') {
        stopListeningInternal();
        setVoiceState('idle');
      }
    }
  }, [settings.autoListen, voiceState, updateSettings, startListening, stopListeningInternal]);

  const stopSpeaking = useCallback(() => {
    stopSpeakingInternal();
    setVoiceState('idle');
  }, [stopSpeakingInternal]);

  const replayMessage = useCallback(
    (text: string) => {
      stopSpeakingInternal();
      stopListeningInternal();
      speak(text, {
        voice: selectedVoice,
        rate: settings.rate,
        pitch: settings.pitch,
        volume: settings.volume
      });
    },
    [speak, selectedVoice, settings.rate, settings.pitch, settings.volume, stopSpeakingInternal, stopListeningInternal]
  );

  const resetConversation = useCallback(() => {
    stopSpeakingInternal();
    stopListeningInternal();
    setMessages([]);
    resetTranscript();
    setVoiceState('idle');
  }, [stopSpeakingInternal, stopListeningInternal, resetTranscript]);

  return {
    voiceState,
    messages,
    persona,
    savePersona,
    settings,
    updateSettings,
    voices,
    selectedVoice,
    setSelectedVoice,
    isListening: isListening || voiceState === 'listening',
    isSpeaking,
    transcript,
    interimTranscript,
    isSttSupported,
    isTtsSupported,
    sttError,
    activeProvider,
    lastLatency,
    sendMessage,
    startListening,
    stopListening,
    toggleListening,
    toggleHandsFree,
    stopSpeaking,
    replayMessage,
    resetConversation
  };
}
