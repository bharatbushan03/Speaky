"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, Edit2, Check, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpeechRecognitionService } from "@/lib/services/speech-recognition";
import { RecordingState, SpeechRecognitionError } from "@/lib/types/session";
import { getTranscriptionService, TranscriptionService } from "@/lib/services/transcription";

interface VoiceAnswerInputProps {
  initialValue?: string;
  onSubmit: (answer: string, transcriptEdited: boolean) => Promise<boolean>;
  isSubmitted: boolean;
  onEdit?: () => void;
  disabled?: boolean;
  language?: string;
  initialTranscriptEdited?: boolean;
  onRecordingChange?: (busy: boolean) => void;
}

const MAX_CHARS = 2000;
const RECOMMENDED_MIN_CHARS = 100;
const RECOGNITION_TIMEOUT_MS = 10000;

  useEffect(() => {
    setTranscript(initialValue);
    setIsEditing(!isSubmitted);
    setTranscriptEdited(initialTranscriptEdited);
  }, [initialValue, isSubmitted, initialTranscriptEdited]);

  useEffect(() => {
    onRecordingChange?.(["recording", "requesting_permission", "processing"].includes(recordingState));
  }, [recordingState, onRecordingChange]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (processingTimer.current) clearTimeout(processingTimer.current);
      if (recognitionServiceRef.current && !requestingRef.current) {
        recognitionServiceRef.current.cleanup();
      }
      // A pending microphone request is cleaned up as soon as it resolves.
      recognitionServiceRef.current = null;
      if (transcriptionServiceRef.current && !requestingRef.current) {
        transcriptionServiceRef.current.cleanup();
      }
      // A pending transcription request is cleaned up as soon as it resolves.
      transcriptionServiceRef.current = null;
      onRecordingChange?.(false);
    };
  }, [onRecordingChange]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (processingTimer.current) clearTimeout(processingTimer.current);
      if (transcriptionServiceRef.current && !requestingRef.current) {
        transcriptionServiceRef.current.cleanup();
      }
      // A pending transcription request is cleaned up as soon as it resolves.
      transcriptionServiceRef.current = null;
      onRecordingChange?.(false);
    };
  }, [onRecordingChange]);

  const handleStartRecording = async () => {
    if (disabled || submittingRef.current || requestingRef.current || recordingState !== "idle") return;

    setRecordingState("requesting_permission");
    setError(null);
    setInterimTranscript("");
    requestingRef.current = true;

    try {
      // Try browser speech recognition first
      if (SpeechRecognitionService.isSupported()) {
        recognitionServiceRef.current?.cleanup();
        const service = new SpeechRecognitionService();
        const langCode = SpeechRecognitionService.getLanguageCode(language);
        service.initialize(langCode);
        recognitionServiceRef.current = service;

        // Start listening with timeout
        const timeoutId = setTimeout(() => {
          if (!mountedRef.current || recognitionServiceRef.current !== service) return;
          setError({
            type: "network_error",
            message: "Listening timed out. Please try again with shorter speech.",
          });
          setRecordingState("error");
          service.stopListening();
          clearTimeout(timeoutId);
          requestingRef.current = false;
        }, RECOGNITION_TIMEOUT_MS);

        await service.startListening(
          (text: string, isFinal: boolean) => {
            if (!mountedRef.current || recognitionServiceRef.current !== service) return;
            clearTimeout(timeoutId);
            if (isFinal) {
              setTranscript((prev) => {
                const newText = prev ? `${prev} ${text}` : text;
                return newText.slice(0, MAX_CHARS);
              });
              setInterimTranscript("");
              setRecordingState("processing");
            } else {
              setInterimTranscript(text);
            }
          },
          (err: SpeechRecognitionError) => {
            if (!mountedRef.current || recognitionServiceRef.current !== service) return;
            setError(err);
            setRecordingState("error");
            if (err.type === "permission_denied") {
              setRecordingState("permission_denied");
            }
          }
        );
        if (mountedRef.current && recognitionServiceRef.current === service) setRecordingState("recording");
      } else {
        // Browser not supported, use backend transcription
        await handleBackendTranscription();
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      const mappedError: SpeechRecognitionError = {
        type: err.type || "unknown",
        message: err.message || "Failed to start recording. Please try again.",
      };
      setError(mappedError);
      setRecordingState("error");
      requestingRef.current = false;
    } finally {
      if (!mountedRef.current || recognitionServiceRef.current) service?.cleanup();
    }
  };

  const handleStopRecording = () => {
    if (recognitionServiceRef.current) {
      recognitionServiceRef.current.stopListening();
      setRecordingState("processing");
      
      // Show final transcript after brief processing delay
      processingTimer.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setRecordingState("idle");
        setInterimTranscript("");
      }, 500);
    }
  };

  const handleEditTranscript = () => {
    setIsEditing(true);
    setTranscriptEdited(true);
  };

  const handleTranscriptChange = (value: string) => {
    setTranscript(value);
    setTranscriptEdited(true);
  };

  const handleSubmit = async () => {
    if (disabled || submittingRef.current || !transcript.trim() || transcript.length > MAX_CHARS ||
        ["recording", "requesting_permission", "processing"].includes(recordingState)) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (await onSubmit(transcript.trim(), transcriptEdited)) setIsEditing(false);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setRecordingState("idle");
  };

  const handleBackendTranscription = async () => {
    setRecordingState("processing");
    setError(null);
    try {
      const service = getTranscriptionService();
      const audioData = /* base64 audio would come from browser capture */ "";
      // Note: Browser-based audio recording is complex; for now we rely on
      // the user typing or use the browser STT fallback. Backend transcription
      // is available when STT_PROVIDER is configured.
      const result = await service.transcribe(audioData, language);
      setTranscript(result.text);
      setRecordingState("idle");
      setInterimTranscript("");
      // Mark transcript as needing review since it came from backend
      setTranscriptEdited(true);
    } catch (err: any) {
      if (err.status_code === 501) {
        setError({
          type: "stt_not_configured",
          message: "Audio transcription is not configured. Please use browser-based speech recognition or configure an STT provider.",
        });
        setRecordingState("error");
      } else {
        setError({
          type: "transcription_error",
          message: err.detail || "Transcription failed. Please try again.",
        });
        setRecordingState("error");
      }
    }
  };

  const handleEditAnswer = () => {
    setIsEditing(true);
    onEdit?.();
  };

  const charCount = transcript.length;
  const isLongEnough = charCount >= RECOMMENDED_MIN_CHARS;
  const isOverLimit = charCount > MAX_CHARS;
  const displayText = recordingState === "recording"
    ? [transcript, interimTranscript].filter(Boolean).join(" ")
    : transcript;

  // Recording button states
  const isRecording = recordingState === "recording";
  const canRecord = recordingState === "idle" && (!isSubmitted || isEditing) && !disabled && !isSubmitting;
  const isRequestingPermission = recordingState === "requesting_permission";
  const isProcessing = recordingState === "processing";
  const showRecordingControls = !isSubmitted || isEditing;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Answer</CardTitle>
          </div>
          {isSubmitted && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditAnswer}
              disabled={disabled || isSubmitting}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        {showRecordingControls && (
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <Button
                onClick={handleStartRecording}
                disabled={!canRecord || isRequestingPermission || isProcessing}
                size="lg"
                className={cn(
                  "gap-2",
                  (isRequestingPermission || isProcessing) && "cursor-wait"
                )}
              >
                {isRequestingPermission ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Requesting Permission...
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    {transcript ? "Record More" : "Start Recording"}
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleStopRecording}
                size="lg"
                variant="destructive"
                className="gap-2 animate-pulse"
              >
                <MicOff className="h-5 w-5" />
                Stop Recording
              </Button>
            )}

            {transcript && !isRecording && !isEditing && (
              <Button
                variant="outline"
                size="lg"
                onClick={handleEditTranscript}
                className="gap-2"
                disabled={disabled || isSubmitting || isRequestingPermission || isProcessing}
              >
                <Edit2 className="h-4 w-4" />
                Edit Transcript
              </Button>
            )}
          </div>
        )}

        {/* Recording State Indicator */}
        {isRecording && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 h-3 w-3 bg-red-500 rounded-full animate-ping" />
              </div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Recording in progress... Speak clearly and at a steady pace.
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && recordingState !== "recording" && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive mb-1">
                  {error.type === "permission_denied"
                    ? "Microphone Permission Denied"
                    : error.type === "stt_not_configured"
                      ? "Transcription Not Configured"
                      : "Recording Error"}
                </p>
                <p className="text-sm text-destructive/80">{error.message}</p>
                {error.type === "permission_denied" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    To enable microphone: Click the camera/microphone icon in your browser&apos;s address bar and allow access.
                  </p>
                )}
                {error.type === "stt_not_configured" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    To use backend transcription: Configure STT_PROVIDER in the backend settings.
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={disabled || isSubmitting}
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Transcript Display/Edit */}
        <div className="relative">
          <Textarea
            value={displayText}
            onChange={(e) => handleTranscriptChange(e.target.value)}
            placeholder={
              isRecording
                ? "Listening... Your speech will appear here."
                : "Click 'Start Recording' to begin speaking, or type your answer directly."
            }
            className={cn(
              "min-h-[200px] resize-y",
              !isEditing && !isRecording && "bg-muted/50",
              isOverLimit && "border-destructive focus-visible:ring-destructive",
              interimTranscript && !transcript && "text-muted-foreground italic"
            )}
            disabled={!isEditing || isRecording || isRequestingPermission || isProcessing || disabled || isSubmitting}
            maxLength={MAX_CHARS}
          />
          {isRecording && interimTranscript && (
            <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm border rounded px-2 py-1">
              <p className="text-xs text-muted-foreground">Listening...</p>
            </div>
          )}
        </div>

        {/* Character Count and Guidelines */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                "font-medium",
                isOverLimit
                  ? "text-destructive"
                  : isLongEnough
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground"
              )}
            >
              {charCount} / {MAX_CHARS} characters
            </span>
            {!isLongEnough && charCount > 0 && (
              <span className="text-muted-foreground">
                (Recommended: {RECOMMENDED_MIN_CHARS}+ characters)
              </span>
            )}
          </div>
        </div>

        {/* Transcript Edited Notice */}
        {transcriptEdited && transcript && !isSubmitted && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Transcript has been edited. Original recording may differ from the text.
            </p>
          </div>
        )}

        {/* Submit Button */}
        {(isEditing || (!isSubmitted && transcript)) && (
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSubmit}
              disabled={transcript.trim().length === 0 || isOverLimit || disabled || isSubmitting || isRecording || isRequestingPermission || isProcessing}
              className="gap-2"
              size="lg"
            >
              {isSubmitting ? "Saving..." : isSubmitted ? (
                <>
                  <Check className="h-4 w-4" />
                  Update Answer
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Answer
                </>
              )}
            </Button>
            {!isSubmitted && (
              <p className="text-sm text-muted-foreground">
                You can edit your answer after submitting
              </p>
            )}
          </div>
        )}

        {/* Submitted State Message */}
        {isSubmitted && !isEditing && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
              <Check className="h-4 w-4" />
              Answer submitted{transcriptEdited && " (edited)"}. You can edit it or move to the next question.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
