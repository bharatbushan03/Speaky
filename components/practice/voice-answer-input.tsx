"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Edit2, Loader2, Mic, MicOff, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SpeechRecognitionService } from "@/lib/services/speech-recognition";
import { RecordingState, SpeechRecognitionError } from "@/lib/types/session";

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

const MAX_CHARS = 20_000;
const RECOMMENDED_MIN_CHARS = 100;

/**
 * Voice mode intentionally uses the browser SpeechRecognition API. It does not
 * pretend to have an audio upload fallback: browsers without SpeechRecognition
 * receive a clear message and can switch to text mode instead.
 */
export function VoiceAnswerInput({
  initialValue = "",
  onSubmit,
  isSubmitted,
  onEdit,
  disabled = false,
  language = "english",
  initialTranscriptEdited = false,
  onRecordingChange,
}: VoiceAnswerInputProps) {
  const [transcript, setTranscript] = useState(initialValue);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [error, setError] = useState<SpeechRecognitionError | null>(null);
  const [isEditing, setIsEditing] = useState(!isSubmitted);
  const [transcriptEdited, setTranscriptEdited] = useState(initialTranscriptEdited);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionService | null>(null);
  const mountedRef = useRef(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    setTranscript(initialValue);
    setIsEditing(!isSubmitted);
    setTranscriptEdited(initialTranscriptEdited);
  }, [initialValue, initialTranscriptEdited, isSubmitted]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recognitionRef.current?.cleanup();
      recognitionRef.current = null;
      onRecordingChange?.(false);
    };
  }, [onRecordingChange]);

  useEffect(() => {
    onRecordingChange?.(["recording", "requesting_permission", "processing"].includes(recordingState));
  }, [onRecordingChange, recordingState]);

  const handleStartRecording = async () => {
    if (disabled || isSubmitting || recordingState !== "idle") return;
    setError(null);
    setInterimTranscript("");

    if (!SpeechRecognitionService.isSupported()) {
      setRecordingState("error");
      setError({
        type: "not_supported",
        message: "Voice input is not supported by this browser. Switch to text mode or use a supported browser.",
      });
      return;
    }

    setRecordingState("requesting_permission");
    const service = new SpeechRecognitionService();
    recognitionRef.current?.cleanup();
    recognitionRef.current = service;

    try {
      service.initialize(SpeechRecognitionService.getLanguageCode(language));
      await service.startListening(
        (text, isFinal) => {
          if (!mountedRef.current || recognitionRef.current !== service) return;
          if (isFinal) {
            setTranscript((current) => `${current} ${text}`.trim().slice(0, MAX_CHARS));
            setInterimTranscript("");
            setTranscriptEdited(false);
          } else {
            setInterimTranscript(text);
          }
        },
        (recognitionError) => {
          if (!mountedRef.current || recognitionRef.current !== service) return;
          setError(recognitionError);
          setRecordingState(recognitionError.type === "permission_denied" ? "permission_denied" : "error");
        },
      );
      if (mountedRef.current && recognitionRef.current === service) setRecordingState("recording");
    } catch (caught) {
      if (!mountedRef.current) return;
      const message = caught instanceof Error ? caught.message : "Unable to start voice input.";
      setError({ type: "unknown", message });
      setRecordingState("error");
      service.cleanup();
      recognitionRef.current = null;
    }
  };

  const handleStopRecording = () => {
    const service = recognitionRef.current;
    if (!service) return;
    service.stopListening();
    service.cleanup();
    recognitionRef.current = null;
    setInterimTranscript("");
    setRecordingState("idle");
  };

  const handleSubmit = async () => {
    const answer = transcript.trim();
    if (disabled || submittingRef.current || !answer || answer.length > MAX_CHARS || recordingState !== "idle") return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (await onSubmit(answer, transcriptEdited)) setIsEditing(false);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setTranscriptEdited(true);
    onEdit?.();
  };

  const isRecording = recordingState === "recording";
  const isBusy = ["recording", "requesting_permission", "processing"].includes(recordingState);
  const isOverLimit = transcript.length > MAX_CHARS;
  const isLongEnough = transcript.length >= RECOMMENDED_MIN_CHARS;
  const displayText = isRecording && interimTranscript
    ? `${transcript} ${interimTranscript}`.trim()
    : transcript;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mic className="h-5 w-5 text-primary" /> Your Answer
          </CardTitle>
          {isSubmitted && !isEditing && (
            <Button variant="outline" size="sm" onClick={handleEdit} disabled={disabled || isSubmitting} className="gap-2">
              <Edit2 className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!isSubmitted || isEditing) && (
          <div className="flex flex-wrap items-center gap-3">
            {isRecording ? (
              <Button onClick={handleStopRecording} size="lg" variant="destructive" className="gap-2">
                <MicOff className="h-5 w-5" /> Stop Recording
              </Button>
            ) : (
              <Button onClick={handleStartRecording} size="lg" disabled={disabled || isSubmitting || isBusy} className="gap-2">
                {recordingState === "requesting_permission" || recordingState === "processing" ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> {recordingState === "processing" ? "Processing..." : "Requesting Permission..."}</>
                ) : (
                  <><Mic className="h-5 w-5" /> {transcript ? "Record More" : "Start Recording"}</>
                )}
              </Button>
            )}
            {transcript && !isRecording && !isEditing && (
              <Button variant="outline" size="lg" onClick={handleEdit} disabled={disabled || isSubmitting} className="gap-2">
                <Edit2 className="h-4 w-4" /> Edit Transcript
              </Button>
            )}
          </div>
        )}

        {isRecording && (
          <p role="status" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-200">
            Recording in progress. Speak clearly and at a steady pace.
          </p>
        )}

        {error && !isRecording && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Voice input unavailable</p>
                <p className="text-sm text-destructive/80">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        <Textarea
          value={displayText}
          onChange={(event) => {
            setTranscript(event.target.value);
            setTranscriptEdited(true);
          }}
          placeholder={isRecording ? "Listening..." : "Start recording or type your answer directly."}
          className={cn("min-h-[200px] resize-y", !isEditing && !isRecording && "bg-muted/50", isOverLimit && "border-destructive")}
          disabled={!isEditing || isBusy || disabled || isSubmitting}
          maxLength={MAX_CHARS}
          aria-label="Your voice answer transcript"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className={cn("font-medium", isOverLimit ? "text-destructive" : isLongEnough ? "text-green-600" : "text-muted-foreground")}>
            {transcript.length} / {MAX_CHARS} characters
          </span>
          {!isLongEnough && transcript.length > 0 && <span className="text-muted-foreground">Recommended: {RECOMMENDED_MIN_CHARS}+ characters</span>}
        </div>

        {transcriptEdited && transcript && !isSubmitted && (
          <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-200">
            Transcript has been edited. The saved answer is the text shown above.
          </p>
        )}

        {(isEditing || (!isSubmitted && transcript)) && (
          <Button onClick={handleSubmit} disabled={!transcript.trim() || isOverLimit || disabled || isSubmitting || isBusy} size="lg" className="gap-2">
            {isSubmitting ? "Saving..." : isSubmitted ? <><Check className="h-4 w-4" /> Update Answer</> : <><Send className="h-4 w-4" /> Submit Answer</>}
          </Button>
        )}

        {isSubmitted && !isEditing && (
          <p className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/20 dark:text-green-200">
            <Check className="h-4 w-4" /> Answer submitted{transcriptEdited ? " (edited)" : ""}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
