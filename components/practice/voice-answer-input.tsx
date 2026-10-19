"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, Edit2, Check, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpeechRecognitionService } from "@/lib/services/speech-recognition";
import { RecordingState, SpeechRecognitionError } from "@/lib/types/session";

interface VoiceAnswerInputProps {
  initialValue?: string;
  onSubmit: (answer: string, transcriptEdited: boolean) => void;
  isSubmitted: boolean;
  onEdit?: () => void;
  disabled?: boolean;
  language?: string;
}

const MAX_CHARS = 2000;
const RECOMMENDED_MIN_CHARS = 100;

export function VoiceAnswerInput({
  initialValue = "",
  onSubmit,
  isSubmitted,
  onEdit,
  disabled = false,
  language = "english",
}: VoiceAnswerInputProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState(initialValue);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<SpeechRecognitionError | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [transcriptEdited, setTranscriptEdited] = useState(false);

  const recognitionServiceRef = useRef<SpeechRecognitionService | null>(null);

  useEffect(() => {
    setTranscript(initialValue);
    setIsEditing(false);
    setTranscriptEdited(false);
  }, [initialValue, isSubmitted]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (recognitionServiceRef.current) {
        recognitionServiceRef.current.cleanup();
      }
    };
  }, []);

  const handleStartRecording = async () => {
    // Check if speech recognition is supported
    if (!SpeechRecognitionService.isSupported()) {
      setError({
        type: "not_supported",
        message: "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.",
      });
      setRecordingState("error");
      return;
    }

    setRecordingState("requesting_permission");
    setError(null);
    setInterimTranscript("");

    try {
      // Initialize service
      const service = new SpeechRecognitionService();
      const langCode = SpeechRecognitionService.getLanguageCode(language);
      service.initialize(langCode);
      recognitionServiceRef.current = service;

      // Start listening
      setRecordingState("recording");
      await service.startListening(
        (text: string, isFinal: boolean) => {
          if (isFinal) {
            setTranscript((prev) => {
              const newText = prev ? `${prev} ${text}` : text;
              return newText.slice(0, MAX_CHARS); // Enforce max length
            });
            setInterimTranscript("");
          } else {
            setInterimTranscript(text);
          }
        },
        (err: SpeechRecognitionError) => {
          setError(err);
          setRecordingState("error");
          if (err.type === "permission_denied") {
            setRecordingState("permission_denied");
          }
        }
      );
    } catch (err: any) {
      const mappedError: SpeechRecognitionError = {
        type: err.type || "unknown",
        message: err.message || "Failed to start recording. Please try again.",
      };
      setError(mappedError);
      setRecordingState("error");
    }
  };

  const handleStopRecording = () => {
    if (recognitionServiceRef.current) {
      recognitionServiceRef.current.stopListening();
      setRecordingState("processing");
      
      // Show final transcript after brief processing delay
      setTimeout(() => {
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

  const handleSubmit = () => {
    if (transcript.trim().length > 0) {
      onSubmit(transcript.trim(), transcriptEdited);
      setIsEditing(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setRecordingState("idle");
  };

  const handleEditAnswer = () => {
    setIsEditing(true);
    onEdit?.();
  };

  const charCount = transcript.length;
  const isLongEnough = charCount >= RECOMMENDED_MIN_CHARS;
  const isOverLimit = charCount > MAX_CHARS;
  const displayText = isEditing ? transcript : transcript || interimTranscript;

  // Recording button states
  const isRecording = recordingState === "recording";
  const canRecord = recordingState === "idle" && !isSubmitted && !disabled;
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
              disabled={disabled}
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
                disabled={disabled}
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
                  {error.type === "permission_denied" ? "Microphone Permission Denied" : "Recording Error"}
                </p>
                <p className="text-sm text-destructive/80">{error.message}</p>
                {error.type === "permission_denied" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    To enable microphone: Click the camera/microphone icon in your browser&apos;s address bar and allow access.
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
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
            disabled={(!isEditing && !isRecording) || disabled}
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
              disabled={transcript.trim().length === 0 || isOverLimit || disabled}
              className="gap-2"
              size="lg"
            >
              {isSubmitted ? (
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
