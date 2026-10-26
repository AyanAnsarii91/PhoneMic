import { useRef, useCallback, useState, useEffect, useMemo } from 'react';

export interface AudioDeviceOption {
  deviceId: string;
  label: string;
}

export function useDesktopAudio() {
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [monitorVolume, setMonitorVolume] = useState(1.0);
  const [outputDevices, setOutputDevices] = useState<AudioDeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [isPlayingTestTone, setIsPlayingTestTone] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const testToneOscRef = useRef<OscillatorNode | null>(null);

  // Initialize AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 48000 });
      const gainNode = ctx.createGain();
      gainNode.gain.value = monitorVolume;
      gainNode.connect(ctx.destination);

      audioContextRef.current = ctx;
      gainNodeRef.current = gainNode;
      nextPlayTimeRef.current = ctx.currentTime;
    }
    return audioContextRef.current;
  }, [monitorVolume]);

  // Handle selected output device (e.g. VB-Audio Cable Input)
  const setOutputDevice = useCallback(async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    const ctx = getAudioContext();
    if ('setSinkId' in ctx && typeof (ctx as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId === 'function') {
      try {
        await (ctx as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId);
      } catch (err) {
        console.warn('Failed to set sinkId on AudioContext:', err);
      }
    }
  }, [getAudioContext]);

  // Enumerate available Windows audio output devices
  const refreshOutputDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Audio Output (${d.deviceId.slice(0, 5)})`
        }));

      setOutputDevices(audioOutputs);

      // Auto-detect VB-Audio Cable Input or PhoneMic virtual device
      const vbCable = audioOutputs.find(d => {
        const lower = d.label.toLowerCase();
        return lower.includes('cable input') || lower.includes('vb-audio') || lower.includes('phonemic');
      });
      if (vbCable) {
        setOutputDevice(vbCable.deviceId);
      }
    } catch (e) {
      console.warn('Failed to enumerate audio devices:', e);
    }
  }, [setOutputDevice]);

  useEffect(() => {
    refreshOutputDevices();
    navigator.mediaDevices?.addEventListener('devicechange', refreshOutputDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', refreshOutputDevices);
    };
  }, [refreshOutputDevices]);

  // Change volume
  const handleVolumeChange = useCallback((vol: number) => {
    setMonitorVolume(vol);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMonitoring ? vol : 0;
    }
  }, [isMonitoring]);

  // Toggle monitoring
  const toggleMonitoring = useCallback((enable?: boolean) => {
    const nextState = enable !== undefined ? enable : !isMonitoring;
    setIsMonitoring(nextState);

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = nextState ? monitorVolume : 0;
    }
  }, [getAudioContext, isMonitoring, monitorVolume]);

  // Feed incoming PCM chunk into AudioContext queue for low-latency playback
  const playPcmChunk = useCallback((pcmInt16: number[]) => {
    if (!isMonitoring) return;

    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const sampleCount = pcmInt16.length;
      if (sampleCount === 0) return;

      const audioBuffer = ctx.createBuffer(1, sampleCount, 48000);
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < sampleCount; i++) {
        channelData[i] = pcmInt16[i] / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      if (gainNodeRef.current) {
        source.connect(gainNodeRef.current);
      } else {
        source.connect(ctx.destination);
      }

      const now = ctx.currentTime;
      // Schedule chunk smoothly to avoid audio clicks
      const startTime = Math.max(now, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
    } catch (err) {
      console.warn('Error playing audio chunk:', err);
    }
  }, [getAudioContext, isMonitoring]);

  // Play test tone (440Hz beep) for checking virtual audio cable or speaker output
  const toggleTestTone = useCallback(() => {
    const ctx = getAudioContext();
    if (isPlayingTestTone) {
      if (testToneOscRef.current) {
        testToneOscRef.current.stop();
        testToneOscRef.current.disconnect();
        testToneOscRef.current = null;
      }
      setIsPlayingTestTone(false);
    } else {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);

      const toneGain = ctx.createGain();
      toneGain.gain.setValueAtTime(0.2, ctx.currentTime);

      osc.connect(toneGain);
      if (gainNodeRef.current) {
        toneGain.connect(gainNodeRef.current);
      } else {
        toneGain.connect(ctx.destination);
      }

      osc.start();
      testToneOscRef.current = osc;
      setIsPlayingTestTone(true);

      // Auto stop after 2.5 seconds
      setTimeout(() => {
        if (testToneOscRef.current === osc) {
          try {
            osc.stop();
            osc.disconnect();
          } catch {
            // ignore
          }
          testToneOscRef.current = null;
          setIsPlayingTestTone(false);
        }
      }, 2500);
    }
  }, [getAudioContext, isPlayingTestTone]);

  return useMemo(() => ({
    isMonitoring,
    monitorVolume,
    outputDevices,
    selectedDeviceId,
    isPlayingTestTone,
    toggleMonitoring,
    handleVolumeChange,
    setOutputDevice,
    playPcmChunk,
    toggleTestTone,
    refreshOutputDevices
  }), [
    isMonitoring,
    monitorVolume,
    outputDevices,
    selectedDeviceId,
    isPlayingTestTone,
    toggleMonitoring,
    handleVolumeChange,
    setOutputDevice,
    playPcmChunk,
    toggleTestTone,
    refreshOutputDevices
  ]);
}
