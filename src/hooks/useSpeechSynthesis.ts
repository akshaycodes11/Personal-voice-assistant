import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechSynthesisProps {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export function useSpeechSynthesis({
  onStart,
  onEnd,
  onError
}: UseSpeechSynthesisProps = {}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(false);

  const isSpeakingRef = useRef<boolean>(false);
  const sessionCounterRef = useRef<number>(0);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onStartRef.current = onStart;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onStart, onEnd, onError]);

  // Load available system voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          setVoices(available);

          // Find a great default English voice
          const naturalVoice =
            available.find(
              (v) =>
                v.lang.startsWith('en') &&
                (v.name.includes('Natural') ||
                  v.name.includes('Google') ||
                  v.name.includes('Samantha') ||
                  v.name.includes('Daniel') ||
                  v.name.includes('Jenny') ||
                  v.name.includes('Guy'))
            ) ||
            available.find((v) => v.lang.startsWith('en')) ||
            available[0];

          setSelectedVoice((prev) => prev || naturalVoice || null);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Split text into speakable sentence chunks to avoid browser synthesis cutoff bug
  const splitIntoChunks = (text: string): string[] => {
    const rawChunks = text.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g);
    if (!rawChunks) return [text];
    return rawChunks.map((c) => c.trim()).filter((c) => c.length > 0);
  };

  const speak = useCallback(
    (
      text: string,
      options: {
        voice?: SpeechSynthesisVoice | null;
        rate?: number;
        pitch?: number;
        volume?: number;
      } = {}
    ) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported in this browser.');
        return;
      }

      // Stop any active speech before starting new one and increment session counter
      window.speechSynthesis.cancel();
      const currentSession = ++sessionCounterRef.current;

      if (!text || !text.trim()) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        return;
      }

      const chunks = splitIntoChunks(text);
      if (chunks.length === 0) return;

      setIsSpeaking(true);
      isSpeakingRef.current = true;
      if (onStartRef.current) {
        onStartRef.current();
      }

      let currentChunkIndex = 0;

      const speakNextChunk = () => {
        // Interrupted speech safeguard: halt immediately if session changed or speaking was stopped
        if (!isSpeakingRef.current || currentSession !== sessionCounterRef.current) return;

        if (currentChunkIndex >= chunks.length) {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          if (onEndRef.current) {
            onEndRef.current();
          }
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[currentChunkIndex]);
        const voiceToUse = options.voice || selectedVoice;
        if (voiceToUse) {
          utterance.voice = voiceToUse;
        }
        utterance.rate = options.rate ?? 1.05;
        utterance.pitch = options.pitch ?? 1.0;
        utterance.volume = options.volume ?? 1.0;

        utterance.onend = () => {
          if (currentSession !== sessionCounterRef.current) return;
          currentChunkIndex++;
          speakNextChunk();
        };

        utterance.onerror = (e) => {
          console.warn('Speech utterance error:', e);
          if (currentSession !== sessionCounterRef.current) return;
          if (e.error !== 'interrupted' && e.error !== 'canceled') {
            if (onErrorRef.current) onErrorRef.current(e);
          }
          currentChunkIndex++;
          speakNextChunk();
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNextChunk();
    },
    [selectedVoice]
  );

  const stop = useCallback(() => {
    sessionCounterRef.current++;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    if (onEndRef.current) {
      onEndRef.current();
    }
  }, []);

  return {
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
    isSpeaking,
    speak,
    stop
  };
}

