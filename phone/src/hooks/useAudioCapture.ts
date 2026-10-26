import { useState, useRef, useCallback, useEffect } from 'react';
import { calculateLevels, floatToInt16 } from '../utils/pcm';

export interface AudioCaptureOptions {
  sampleRate?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface AudioCaptureState {
  isCapturing: boolean;
  isMuted: boolean;
  gain: number;
  permissionGranted: boolean;
  permissionError: string | null;
  peakLevel: number;
  rmsLevel: number;
  dbLevel: number;
  actualSampleRate: number;
  usingWorklet: boolean;
}

export function useAudioCapture(onAudioChunk?: (pcmBuffer: ArrayBuffer) => void) {
  const [state, setState] = useState<AudioCaptureState>({
    isCapturing: false,
    isMuted: false,
    gain: 1.0,
    permissionGranted: false,
    permissionError: null,
    peakLevel: 0,
    rmsLevel: 0,
    dbLevel: -60,
    actualSampleRate: 48000,
    usingWorklet: false
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const isMutedRef = useRef(false);
  const gainValueRef = useRef(1.0);
  const onAudioChunkRef = useRef(onAudioChunk);

  useEffect(() => {
    onAudioChunkRef.current = onAudioChunk;
  }, [onAudioChunk]);

  const setMuted = useCallback((muted: boolean) => {
    isMutedRef.current = muted;
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = muted ? 0 : gainValueRef.current;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ muted });
    }
    setState(prev => ({ ...prev, isMuted: muted }));
  }, []);

  const setGain = useCallback((gain: number) => {
    gainValueRef.current = gain;
    if (gainNodeRef.current && !isMutedRef.current) {
      gainNodeRef.current.gain.value = gain;
    }
    setState(prev => ({ ...prev, gain }));
  }, []);

  const stopCapture = useCallback(() => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isCapturing: false,
      peakLevel: 0,
      rmsLevel: 0,
      dbLevel: -60
    }));
  }, []);

  const startCapture = useCallback(async (options: AudioCaptureOptions = {}) => {
    try {
      setState(prev => ({ ...prev, permissionError: null }));

      // Security check: navigator.mediaDevices in insecure contexts
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = window.isSecureContext === false
          ? 'Browser blocked microphone API: Insecure HTTP connection. Please connect using HTTPS or enable Chrome flags for this IP.'
          : 'Microphone API is not supported in this browser.';
        setState(prev => ({ ...prev, permissionError: errorMsg }));
        return false;
      }

      // Request microphone stream
      const constraints: MediaStreamConstraints = {
        audio: {
          channelCount: 1,
          echoCancellation: options.echoCancellation ?? false,
          noiseSuppression: options.noiseSuppression ?? false,
          autoGainControl: options.autoGainControl ?? false,
          sampleRate: options.sampleRate || 48000
        },
        video: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: options.sampleRate || 48000, latencyHint: 'interactive' });
      
      // Mobile browsers require resume() after user gesture
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      const sourceNode = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;

      const gainNode = audioCtx.createGain();
      gainNode.gain.value = isMutedRef.current ? 0 : gainValueRef.current;
      gainNodeRef.current = gainNode;
      sourceNode.connect(gainNode);

      let usingWorklet = false;

      // Try AudioWorklet first for best real-time performance
      try {
        await audioCtx.audioWorklet.addModule('/audio-processor.js');
        const workletNode = new AudioWorkletNode(audioCtx, 'phone-mic-processor');
        workletNodeRef.current = workletNode;

        workletNode.port.onmessage = (event) => {
          const { type, pcm, peak, rms } = event.data;
          if (type === 'audio_chunk' && pcm) {
            const db = rms > 0.0001 ? Math.max(-60, 20 * Math.log10(rms)) : -60;
            setState(prev => ({
              ...prev,
              peakLevel: peak,
              rmsLevel: rms,
              dbLevel: db
            }));

            if (onAudioChunkRef.current && !isMutedRef.current) {
              onAudioChunkRef.current(pcm);
            }
          }
        };

        gainNode.connect(workletNode);
        // Connect to destination via silent dummy or keep awake
        const silentGain = audioCtx.createGain();
        silentGain.gain.value = 0;
        workletNode.connect(silentGain);
        silentGain.connect(audioCtx.destination);

        usingWorklet = true;
      } catch (workletError) {
        console.warn('AudioWorklet unavailable, falling back to ScriptProcessorNode:', workletError);
        
        // Fallback for older WebKit / browsers
        const bufferSize = 1024;
        const scriptProcessor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
        scriptProcessorRef.current = scriptProcessor;

        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
          const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
          const { peak, rms, db } = calculateLevels(inputData);

          setState(prev => ({
            ...prev,
            peakLevel: peak,
            rmsLevel: rms,
            dbLevel: db
          }));

          if (isMutedRef.current) return;

          const int16Buffer = floatToInt16(inputData);
          if (onAudioChunkRef.current) {
            onAudioChunkRef.current(int16Buffer.buffer as ArrayBuffer);
          }
        };

        gainNode.connect(scriptProcessor);
        const silentGain = audioCtx.createGain();
        silentGain.gain.value = 0;
        scriptProcessor.connect(silentGain);
        silentGain.connect(audioCtx.destination);
      }

      setState(prev => ({
        ...prev,
        isCapturing: true,
        permissionGranted: true,
        actualSampleRate: audioCtx.sampleRate,
        usingWorklet
      }));

      return true;
    } catch (err: unknown) {
      console.error('Failed to start microphone capture:', err);
      const errorMsg = err instanceof Error ? err.message : 'Microphone access denied or unavailable.';
      setState(prev => ({
        ...prev,
        permissionGranted: false,
        permissionError: errorMsg,
        isCapturing: false
      }));
      stopCapture();
      return false;
    }
  }, [stopCapture]);

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    state,
    startCapture,
    stopCapture,
    setMuted,
    setGain
  };
}
