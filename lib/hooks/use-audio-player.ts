"use client";

import { useState, useEffect, useRef } from "react";

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  play: (url: string) => Promise<void>;
  playBlob: (blob: Blob) => Promise<void>;
  stop: () => void;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.autoplay = false;

    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onpause = () => setIsPlaying(false);
    audioRef.current.onended = () => setIsPlaying(false);

    return () => {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.src = "";
      audioRef.current = null;
    };
  }, []);

  const play = async (url: string) => {
    if (!audioRef.current) return;

    try {
      audioRef.current.src = url;
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      setIsPlaying(false);
      // Playback errors are surfaced by the caller that requested the audio.
      throw err;
    }
  };

  const playBlob = async (blob: Blob) => {
    const objectUrl = URL.createObjectURL(blob);
    try {
      await play(objectUrl);
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return { isPlaying, play, playBlob, stop };
}
