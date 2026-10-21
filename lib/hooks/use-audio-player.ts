"use client";

import { useState, useEffect, useRef } from "react";

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  play: (url: string) => Promise<void>;
  stop: () => void;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.autoplay = false;
    audioRef.current.playsInline = true;

    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onpause = () => setIsPlaying(false);
    audioRef.current.on ended = () => setIsPlaying(false);

    return () => {
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
      console.error("Audio playback failed:", err);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return { isPlaying, play, stop };
}