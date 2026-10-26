import { contextBridge, ipcRenderer } from 'electron';
import {
  DeviceInfo,
  ServerInfo,
  AudioPacketTelemetry,
  VirtualAudioDeviceStatus,
  PhoneMicDesktopAPI
} from '@phonemic/shared';

const api: PhoneMicDesktopAPI = {
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  regeneratePin: () => ipcRenderer.invoke('regenerate-pin'),
  selectIPAddress: (ip: string) => ipcRenderer.invoke('select-ip', ip),
  getVirtualMicStatus: () => ipcRenderer.invoke('get-virtual-mic-status'),
  getVirtualMicInstructions: () => ipcRenderer.invoke('get-virtual-mic-instructions'),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),

  onAudioData: (callback) => {
    const handler = (_: unknown, telemetry: AudioPacketTelemetry) => callback(telemetry);
    ipcRenderer.on('audio-telemetry', handler);
    return () => ipcRenderer.removeListener('audio-telemetry', handler);
  },

  onDeviceConnected: (callback) => {
    const handler = (_: unknown, device: DeviceInfo) => callback(device);
    ipcRenderer.on('device-connected', handler);
    return () => ipcRenderer.removeListener('device-connected', handler);
  },

  onDeviceDisconnected: (callback) => {
    const handler = (_: unknown, deviceId: string) => callback(deviceId);
    ipcRenderer.on('device-disconnected', handler);
    return () => ipcRenderer.removeListener('device-disconnected', handler);
  },

  onDeviceStateUpdated: (callback) => {
    const handler = (_: unknown, device: DeviceInfo) => callback(device);
    ipcRenderer.on('device-state-updated', handler);
    return () => ipcRenderer.removeListener('device-state-updated', handler);
  },

  onLog: (callback) => {
    const handler = (_: unknown, log: string) => callback(log);
    ipcRenderer.on('server-log', handler);
    return () => ipcRenderer.removeListener('server-log', handler);
  }
};

contextBridge.exposeInMainWorld('phoneMicDesktop', api);
