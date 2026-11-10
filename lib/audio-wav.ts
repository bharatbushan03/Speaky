const TARGET_RATE = 16_000;

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

export async function blobToWavBase64(blob: Blob): Promise<{ audioBase64: string; durationMs: number }> {
  const audioCtx = new AudioContext();
  try {
    const decoded = await audioCtx.decodeAudioData(await blob.arrayBuffer());
    const durationMs = Math.round(decoded.duration * 1000);
    if (durationMs < 200) throw new Error("The recording was too short. Speak a little longer and try again.");
    if (durationMs > 30_000) throw new Error("Recordings must be 30 seconds or shorter.");
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * TARGET_RATE)), TARGET_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    return {
      audioBase64: bytesToBase64(new Uint8Array(encodeWav(rendered.getChannelData(0), TARGET_RATE))),
      durationMs,
    };
  } finally {
    await audioCtx.close().catch(() => undefined);
  }
}

export interface ClipRecorder {
  stop: () => Promise<{ audioBase64: string; durationMs: number }>;
}

export function startClipRecorder(stream: MediaStream, onAutoStop: () => void, maxMs = 30_000): ClipRecorder {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("This browser cannot record audio. Type your answer instead.");
  }
  const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((item) => MediaRecorder.isTypeSupported(item));
  const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.start();
  let settled = false;
  const timer = window.setTimeout(onAutoStop, maxMs);
  const stop = () =>
    new Promise<{ audioBase64: string; durationMs: number }>((resolve, reject) => {
      if (settled) {
        reject(new Error("Recording already stopped"));
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      recorder.onerror = () => reject(new Error("Recording failed. Try again or type your answer."));
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        blobToWavBase64(blob).then(resolve, reject);
      };
      if (recorder.state === "inactive") {
        reject(new Error("Recording already stopped"));
        return;
      }
      recorder.stop();
    });
  return { stop };
}
