import { useState, useEffect, useRef, useCallback } from 'react';

// Declarations for Web Speech API
interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface UseSpeechRecognitionOptions {
  onResult?: (finalText: string) => void;
  onSilenceTimeout?: (finalText: string) => void;
  onEndWithoutSpeech?: () => void;
  onUserSpeechDetected?: () => void;
  continuous?: boolean;
  silenceDelayMs?: number;
}

export function useSpeechRecognition({
  onResult,
  onSilenceTimeout,
  onEndWithoutSpeech,
  onUserSpeechDetected,
  continuous = true,
  silenceDelayMs = 1200
}: UseSpeechRecognitionOptions = {}) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Recognition instance ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptBufferRef = useRef<string>('');
  const interimBufferRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);
  const intentionallyStoppedRef = useRef<boolean>(false);

  // Safeguard against duplicate STT finalization (guards rapid silence timer + onend triggers)
  const lastFinalizedUtteranceRef = useRef<{ text: string; timestamp: number }>({
    text: '',
    timestamp: 0
  });

  // Stable callback refs to prevent useEffect remounts on every render
  const onResultRef = useRef(onResult);
  const onSilenceTimeoutRef = useRef(onSilenceTimeout);
  const onEndWithoutSpeechRef = useRef(onEndWithoutSpeech);
  const onUserSpeechDetectedRef = useRef(onUserSpeechDetected);

  useEffect(() => {
    onResultRef.current = onResult;
    onSilenceTimeoutRef.current = onSilenceTimeout;
    onEndWithoutSpeechRef.current = onEndWithoutSpeech;
    onUserSpeechDetectedRef.current = onUserSpeechDetected;
  }, [onResult, onSilenceTimeout, onEndWithoutSpeech, onUserSpeechDetected]);

  // Finalizes captured speech and dispatches callback with deduplication guard
  const triggerSpeechFinalized = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const finalSpeech = (
      transcriptBufferRef.current + ' ' + interimBufferRef.current
    ).trim();

    transcriptBufferRef.current = '';
    interimBufferRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    isListeningRef.current = false;
    setIsListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
    }

    if (!finalSpeech) return;

    // Safeguard: Drop duplicate finalization within 1800ms
    const now = Date.now();
    if (
      finalSpeech === lastFinalizedUtteranceRef.current.text &&
      now - lastFinalizedUtteranceRef.current.timestamp < 1800
    ) {
      return;
    }
    lastFinalizedUtteranceRef.current = { text: finalSpeech, timestamp: now };

    if (onSilenceTimeoutRef.current) {
      onSilenceTimeoutRef.current(finalSpeech);
    }
  }, []);

  // Check browser support and initialize recognition ONCE
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      // User speech detected safeguard: signal immediately for potential barge-in interruption of active TTS
      if (onUserSpeechDetectedRef.current) {
        onUserSpeechDetectedRef.current();
      }

      let currentInterim = '';
      let currentFinal = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const text = item[0]?.transcript || '';
        if (item.isFinal) {
          currentFinal += text + ' ';
        } else {
          currentInterim += text;
        }
      }

      if (currentFinal) {
        transcriptBufferRef.current = (
          transcriptBufferRef.current + ' ' + currentFinal
        ).trim();
        setTranscript(transcriptBufferRef.current);
        if (onResultRef.current) {
          onResultRef.current(transcriptBufferRef.current);
        }
      }

      interimBufferRef.current = currentInterim;
      setInterimTranscript(currentInterim);

      const combined = (
        transcriptBufferRef.current + (currentInterim ? ' ' + currentInterim : '')
      ).trim();

      // Reset and re-arm silence timer whenever speech is detected
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (combined) {
        silenceTimerRef.current = setTimeout(() => {
          triggerSpeechFinalized();
        }, silenceDelayMs);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      // 'aborted' and 'no-speech' are normal Web Speech API lifecycle signals, NOT errors
      if (event.error === 'aborted' || event.error === 'no-speech') {
        return;
      }

      console.warn('Speech recognition error:', event.error);

      if (event.error === 'not-allowed') {
        setError('Microphone permission was denied. Please click the lock or camera icon in your browser address bar to allow Microphone access.');
        setIsListening(false);
        isListeningRef.current = false;
      } else if (event.error === 'audio-capture') {
        setError('No microphone found on your device. Please ensure a microphone is connected and selected as default.');
        setIsListening(false);
        isListeningRef.current = false;
      } else if (event.error === 'network') {
        setError('Speech recognition network error. Please check your internet connection.');
      } else {
        setError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // If recognition ended and we have buffered speech, finalize and trigger message immediately
      const pendingSpeech = (
        transcriptBufferRef.current + ' ' + interimBufferRef.current
      ).trim();

      if (pendingSpeech) {
        triggerSpeechFinalized();
        return;
      }

      setIsListening(false);
      isListeningRef.current = false;
      setInterimTranscript('');

      // If ended naturally without speech (e.g. idle timeout) and not intentionally stopped, notify listener
      if (!intentionallyStoppedRef.current && onEndWithoutSpeechRef.current) {
        onEndWithoutSpeechRef.current();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch { }
      }
    };
  }, [continuous, silenceDelayMs, triggerSpeechFinalized]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    intentionallyStoppedRef.current = false;
    setError(null);
    transcriptBufferRef.current = '';
    interimBufferRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    try {
      recognitionRef.current.start();
    } catch (e: any) {
      if (e?.name !== 'InvalidStateError') {
        console.warn('Error starting speech recognition:', e);
      }
    }
  }, []);

  const stopListening = useCallback((): string => {
    intentionallyStoppedRef.current = true;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const captured = (transcriptBufferRef.current + ' ' + interimBufferRef.current).trim();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping speech recognition:', e);
      }
    }
    transcriptBufferRef.current = '';
    interimBufferRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setIsListening(false);
    isListeningRef.current = false;
    return captured;
  }, []);

  const resetTranscript = useCallback(() => {
    transcriptBufferRef.current = '';
    interimBufferRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const getCapturedText = useCallback((): string => {
    return (transcriptBufferRef.current + ' ' + interimBufferRef.current).trim();
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    getCapturedText
  };
}
