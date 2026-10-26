using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace PhoneMic.Audio {
    class VBCablePlayer {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
        public struct WAVEOUTCAPS {
            public ushort wMid;
            public ushort wPid;
            public uint vDriverVersion;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
            public string szPname;
            public uint dwFormats;
            public ushort wChannels;
            public ushort wReserved1;
            public uint dwSupport;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct WAVEFORMATEX {
            public ushort wFormatTag;
            public ushort nChannels;
            public uint nSamplesPerSec;
            public uint nAvgBytesPerSec;
            public ushort nBlockAlign;
            public ushort wBitsPerSample;
            public ushort cbSize;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct WAVEHDR {
            public IntPtr lpData;
            public uint dwBufferLength;
            public uint dwBytesRecorded;
            public IntPtr dwUser;
            public uint dwFlags;
            public uint dwLoops;
            public IntPtr lpNext;
            public IntPtr reserved;
        }

        public const uint WHDR_DONE = 0x00000001;
        public const uint WHDR_PREPARED = 0x00000002;

        [DllImport("winmm.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern uint waveOutGetNumDevs();

        [DllImport("winmm.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern uint waveOutGetDevCaps(UIntPtr uDeviceID, ref WAVEOUTCAPS lpCaps, uint uSize);

        [DllImport("winmm.dll", SetLastError = true)]
        public static extern int waveOutOpen(out IntPtr hWaveOut, uint uDeviceID, ref WAVEFORMATEX lpFormat, IntPtr dwCallback, IntPtr dwInstance, uint dwFlags);

        [DllImport("winmm.dll", SetLastError = true)]
        public static extern int waveOutPrepareHeader(IntPtr hWaveOut, ref WAVEHDR lpWaveOutHdr, uint uSize);

        [DllImport("winmm.dll", SetLastError = true)]
        public static extern int waveOutWrite(IntPtr hWaveOut, ref WAVEHDR lpWaveOutHdr, uint uSize);

        [DllImport("winmm.dll", SetLastError = true)]
        public static extern int waveOutUnprepareHeader(IntPtr hWaveOut, ref WAVEHDR lpWaveOutHdr, uint uSize);

        [DllImport("winmm.dll", SetLastError = true)]
        public static extern int waveOutReset(IntPtr hWaveOut);

        [DllImport("winmm.dll", SetLastError = true)]
        public static extern int waveOutClose(IntPtr hWaveOut);

        static void Main(string[] args) {
            string targetKeyword = args.Length > 0 ? args[0] : "CABLE Input";
            uint sampleRate = args.Length > 1 ? uint.Parse(args[1]) : 48000;
            ushort channels = args.Length > 2 ? ushort.Parse(args[2]) : (ushort)1;

            uint numDevs = waveOutGetNumDevs();
            int selectedDevId = -1;
            string selectedDevName = "";

            for (uint i = 0; i < numDevs; i++) {
                WAVEOUTCAPS caps = new WAVEOUTCAPS();
                waveOutGetDevCaps((UIntPtr)i, ref caps, (uint)Marshal.SizeOf(caps));
                if (caps.szPname.IndexOf(targetKeyword, StringComparison.OrdinalIgnoreCase) >= 0) {
                    selectedDevId = (int)i;
                    selectedDevName = caps.szPname;
                    break;
                }
            }

            // Fallback: search for "cable" or "virtual"
            if (selectedDevId == -1) {
                for (uint i = 0; i < numDevs; i++) {
                    WAVEOUTCAPS caps = new WAVEOUTCAPS();
                    waveOutGetDevCaps((UIntPtr)i, ref caps, (uint)Marshal.SizeOf(caps));
                    if (caps.szPname.IndexOf("cable", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        caps.szPname.IndexOf("virtual", StringComparison.OrdinalIgnoreCase) >= 0) {
                        selectedDevId = (int)i;
                        selectedDevName = caps.szPname;
                        break;
                    }
                }
            }

            if (selectedDevId == -1) {
                // If not found, use default device 0
                if (numDevs > 0) {
                    selectedDevId = 0;
                    WAVEOUTCAPS caps = new WAVEOUTCAPS();
                    waveOutGetDevCaps(UIntPtr.Zero, ref caps, (uint)Marshal.SizeOf(caps));
                    selectedDevName = caps.szPname;
                } else {
                    Console.WriteLine("{\"event\":\"error\",\"message\":\"No audio playback devices found on system\"}");
                    return;
                }
            }

            WAVEFORMATEX fmt = new WAVEFORMATEX();
            fmt.wFormatTag = 1; // PCM
            fmt.nChannels = channels;
            fmt.nSamplesPerSec = sampleRate;
            fmt.wBitsPerSample = 16;
            fmt.nBlockAlign = (ushort)(channels * 2);
            fmt.nAvgBytesPerSec = sampleRate * fmt.nBlockAlign;
            fmt.cbSize = 0;

            IntPtr hWaveOut;
            int openResult = waveOutOpen(out hWaveOut, (uint)selectedDevId, ref fmt, IntPtr.Zero, IntPtr.Zero, 0);
            if (openResult != 0) {
                Console.WriteLine(string.Format("{{\"event\":\"error\",\"code\":{0},\"message\":\"Failed to open waveOut device #{1}: {2}\"}}", openResult, selectedDevId, selectedDevName));
                return;
            }

            Console.WriteLine(string.Format("{{\"event\":\"opened\",\"deviceId\":{0},\"deviceName\":\"{1}\",\"sampleRate\":{2},\"channels\":{3}}}", selectedDevId, selectedDevName.Replace("\"", "\\\""), sampleRate, channels));

            // Setup double-buffering queue
            const int NUM_BUFFERS = 8;
            const int CHUNK_SIZE = 2048; // 1024 samples (mono 16-bit)
            byte[][] buffers = new byte[NUM_BUFFERS][];
            GCHandle[] handles = new GCHandle[NUM_BUFFERS];
            WAVEHDR[] headers = new WAVEHDR[NUM_BUFFERS];
            bool[] inUse = new bool[NUM_BUFFERS];

            for (int i = 0; i < NUM_BUFFERS; i++) {
                buffers[i] = new byte[CHUNK_SIZE * 4];
                handles[i] = GCHandle.Alloc(buffers[i], GCHandleType.Pinned);
                headers[i] = new WAVEHDR();
                headers[i].lpData = handles[i].AddrOfPinnedObject();
                headers[i].dwBufferLength = (uint)buffers[i].Length;
                headers[i].dwFlags = 0;
                inUse[i] = false;
            }

            Stream stdin = Console.OpenStandardInput();
            byte[] readBuffer = new byte[CHUNK_SIZE];
            long totalBytes = 0;
            long totalPackets = 0;
            int bufferIndex = 0;
            int underruns = 0;
            int writeErrors = 0;

            DateTime lastStatsTime = DateTime.UtcNow;

            try {
                int bytesRead;
                while ((bytesRead = stdin.Read(readBuffer, 0, readBuffer.Length)) > 0) {
                    totalBytes += bytesRead;
                    totalPackets++;

                    // Calculate peak and RMS
                    double sumSquares = 0;
                    double peak = 0;
                    int sampleCount = bytesRead / 2;
                    for (int s = 0; s < sampleCount; s++) {
                        short sample = (short)(readBuffer[s * 2] | (readBuffer[s * 2 + 1] << 8));
                        double norm = Math.Abs((double)sample / 32768.0);
                        if (norm > peak) peak = norm;
                        sumSquares += norm * norm;
                    }
                    double rms = Math.Sqrt(sumSquares / Math.Max(1, sampleCount));

                    // Wait for next buffer if in use
                    int attempts = 0;
                    while (inUse[bufferIndex] && (headers[bufferIndex].dwFlags & WHDR_DONE) == 0 && attempts < 10) {
                        Thread.Sleep(2);
                        attempts++;
                    }

                    if (inUse[bufferIndex] && (headers[bufferIndex].dwFlags & WHDR_DONE) == 0) {
                        underruns++;
                    } else if (inUse[bufferIndex]) {
                        waveOutUnprepareHeader(hWaveOut, ref headers[bufferIndex], (uint)Marshal.SizeOf(headers[bufferIndex]));
                        inUse[bufferIndex] = false;
                    }

                    Buffer.BlockCopy(readBuffer, 0, buffers[bufferIndex], 0, bytesRead);
                    headers[bufferIndex].dwBufferLength = (uint)bytesRead;
                    headers[bufferIndex].dwFlags = 0;

                    int prepRes = waveOutPrepareHeader(hWaveOut, ref headers[bufferIndex], (uint)Marshal.SizeOf(headers[bufferIndex]));
                    int writeRes = waveOutWrite(hWaveOut, ref headers[bufferIndex], (uint)Marshal.SizeOf(headers[bufferIndex]));
                    if (prepRes == 0 && writeRes == 0) {
                        inUse[bufferIndex] = true;
                    } else {
                        writeErrors++;
                    }

                    bufferIndex = (bufferIndex + 1) % NUM_BUFFERS;

                    // Periodic stats output every 1.5 seconds
                    if ((DateTime.UtcNow - lastStatsTime).TotalMilliseconds >= 1500) {
                        lastStatsTime = DateTime.UtcNow;
                        Console.WriteLine(string.Format("{{\"event\":\"stats\",\"packets\":{0},\"bytes\":{1},\"peak\":{2:F3},\"rms\":{3:F3},\"underruns\":{4},\"errors\":{5}}}", totalPackets, totalBytes, peak, rms, underruns, writeErrors));
                    }
                }
            } catch (Exception ex) {
                Console.WriteLine(string.Format("{{\"event\":\"error\",\"message\":\"{0}\"}}", ex.Message.Replace("\"", "\\\"")));
            } finally {
                // Wait for trailing audio to finish playing
                Thread.Sleep(200);
                waveOutReset(hWaveOut);
                for (int i = 0; i < NUM_BUFFERS; i++) {
                    if (inUse[i]) {
                        waveOutUnprepareHeader(hWaveOut, ref headers[i], (uint)Marshal.SizeOf(headers[i]));
                    }
                    if (handles[i].IsAllocated) {
                        handles[i].Free();
                    }
                }
                waveOutClose(hWaveOut);
                Console.WriteLine("{\"event\":\"closed\"}");
            }
        }
    }
}
