/**
 * Speech Recognition Service
 * Abstraction layer for browser speech recognition API
 * Can be replaced with hosted transcription API in the future
 */

import { SpeechRecognitionError } from "../types/session";

// Browser speech recognition types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening = false;

  /**
   * Check if speech recognition is supported in the browser
   */
  static isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }

  /**
   * Initialize the speech recognition service
   */
  initialize(language: string = "en-US"): void {
    if (!SpeechRecognitionService.isSupported()) {
      throw new Error("Speech recognition is not supported in this browser");
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = language;
    this.recognition.maxAlternatives = 1;
  }

  /**
   * Start listening for speech
   */
  async startListening(
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onError: (error: SpeechRecognitionError) => void
  ): Promise<void> {
    if (!this.recognition) {
      throw new Error("Speech recognition not initialized");
    }

    if (this.isListening) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.recognition.onstart = () => {
        this.isListening = true;
        resolve();
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          onTranscript(finalTranscript.trim(), true);
        } else if (interimTranscript) {
          onTranscript(interimTranscript, false);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.isListening = false;
        const error = this.mapError(event.error);
        onError(error);
        reject(error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      try {
        this.recognition.start();
      } catch (error: any) {
        this.isListening = false;
        const mappedError = this.mapError(error.message || "unknown");
        onError(mappedError);
        reject(mappedError);
      }
    });
  }

  /**
   * Stop listening for speech
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.recognition) {
      this.stopListening();
      this.recognition = null;
    }
  }

  /**
   * Map browser error codes to our error types
   */
  private mapError(errorCode: string): SpeechRecognitionError {
    switch (errorCode) {
      case "not-allowed":
      case "permission-denied":
        return {
          type: "permission_denied",
          message: "Microphone permission was denied. Please enable it in your browser settings.",
        };
      case "no-speech":
        return {
          type: "no_speech",
          message: "No speech was detected. Please try speaking again.",
        };
      case "network":
        return {
          type: "network_error",
          message: "Network error occurred. Please check your connection.",
        };
      case "not-supported":
        return {
          type: "not_supported",
          message: "Speech recognition is not supported in this browser.",
        };
      default:
        return {
          type: "unknown",
          message: "An unexpected error occurred. Please try again.",
        };
    }
  }

  /**
   * Get appropriate language code for speech recognition
   */
  static getLanguageCode(language: string): string {
    const languageMap: Record<string, string> = {
      english: "en-US",
      hindi: "hi-IN",
      tamil: "ta-IN",
      telugu: "te-IN",
      bengali: "bn-IN",
      kannada: "kn-IN",
    };

    return languageMap[language] || "en-US";
  }
}
