"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Edit2, Loader2, Mic, MicOff, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SpeechRecognitionService } from "@/lib/services/speech-recognition";
import { feedbackAPI, SpeechMeta } from "@/lib/api/feedback";
import { getAPIErrorMessage } from "@/lib/api-client";
import { startClipRecorder, ClipRecorder } from "@/lib/audio-wav";
import { RecordingState, SpeechRecognitionError } from "@/lib/types/session";

interface VoiceAnswerInputProps {
  initialValue?: string;
  onSubmit: (answer: string, transcriptEdited: boolean, speech?: SpeechMeta) => Promise<boolean>;
  isSubmitted: boolean;
  onEdit?: () => void;
  disabled?: boolean;
  language?: string;
  initialTranscriptEdited?: boolean;
  onRecordingChange?: (busy: boolean) => void;
}

const MAX_CHARS = 20_000;
const RECOMMENDED_MIN_CHARS = 100;

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
  const recorderRef = useRef<ClipRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRef = useRef<SpeechMeta | null>(null);
  const interimRef = useRef("");
  const liveWordsRef = useRef(false);
  const [speechLabel, setSpeechLabel] = useState("Record an answer. Gnani Prisma transcribes it for you to review.");
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
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      onRecordingChange?.(false);
    };
  }, [onRecordingChange]);

  useEffect(() => {
    onRecordingChange?.(["recording", "requesting_permission", "processing"].includes(recordingState));
  }, [onRecordingChange, recordingState]);

  const stopRecordingRef = useRef<() => Promise<void>>(async () => undefined);

  const handleStartRecording = async () => {
    if (disabled || isSubmitting || recordingState !== "idle") return;
    setError(null);
    setInterimTranscript("");
    if (SpeechRecognitionService.isSupported()) {
      await handleBrowserSpeech();
      setSpeechLabel("Each word appears as you speak. Stop when you finish, then edit the text if needed.");
      return;
    }
    setRecordingState("requesting_permission");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser cannot use the microphone. Type your answer instead.");
      }
      const stream = streamRef.current || await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      recorderRef.current = startClipRecorder(stream, () => {
        void stopRecordingRef.current();
      });
      if (mountedRef.current) {
        setRecordingState("recording");
        setSpeechLabel("This browser cannot show words live. Stop to transcribe the recording.");
      }
    } catch (caught) {
      if (!mountedRef.current) return;
      const message = caught instanceof Error ? caught.message : "Unable to start recording.";
      setError({ type: "unknown", message });
      setRecordingState("error");
    }
  };

  const handleStopRecording = async () => {
    if (recognitionRef.current || liveWordsRef.current) {
      liveWordsRef.current = false;
      recognitionRef.current?.stopListening();
      recognitionRef.current?.cleanup();
      recognitionRef.current = null;
      const pending = interimRef.current.trim();
      interimRef.current = "";
      setInterimTranscript("");
      if (pending) setTranscript((current) => `${current} ${pending}`.trim().slice(0, MAX_CHARS));
      setRecordingState("idle");
      return;
    }
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (!recorder) return;
    setRecordingState("processing");
    setSpeechLabel("Transcribing with Gnani Prisma...");
    try {
      const clip = await recorder.stop();
      const result = await feedbackAPI.transcribeAudio({ audio_data: clip.audioBase64, language });
      if (!mountedRef.current) return;
      setTranscript((current) => `${current} ${result.text}`.trim().slice(0, MAX_CHARS));
      setTranscriptEdited(false);
      const provider = result.provider === "openai" ? "openai" : "gnani";
      speechRef.current = {
        transcription_provider: provider,
        transcription_model: result.model,
        detected_language: result.language_detected,
        audio_duration_ms: clip.durationMs,
      };
      setSpeechLabel(provider === "gnani"
        ? `Transcribed by Gnani ${result.model || "Prisma"}. Edit the text if it is wrong.`
        : `Transcribed by ${result.provider}. This is not Gnani Prisma.`);
      setRecordingState("idle");
    } catch (caught) {
      if (!mountedRef.current) return;
      setError({ type: "unknown", message: getAPIErrorMessage(caught) });
      setSpeechLabel("Prisma did not return a transcript. You can type the answer or use browser speech.");
      setRecordingState("error");
    }
  };

  const handleBrowserSpeech = async () => {
    if (!SpeechRecognitionService.isSupported()) {
      setError({ type: "not_supported", message: "Browser speech recognition is unavailable. Type your answer." });
      return;
    }
    setError(null);
    liveWordsRef.current = true;
    const service = new SpeechRecognitionService();
    const previous = recognitionRef.current;
    recognitionRef.current = service;
    previous?.cleanup();
    setRecordingState("requesting_permission");
    try {
      service.initialize(SpeechRecognitionService.getLanguageCode(language));
      await service.startListening(
        (text, isFinal) => {
          if (!mountedRef.current) return;
          if (!isFinal) {
            interimRef.current = text;
            setInterimTranscript(text);
            return;
          }
          interimRef.current = "";
          setInterimTranscript("");
          setTranscript((current) => `${current} ${text}`.trim().slice(0, MAX_CHARS));
          speechRef.current = { transcription_provider: "browser" };
          setSpeechLabel("Each word appears as you speak. Stop when you finish, then edit the text if needed.");
          setTranscriptEdited(false);
        },
        (recognitionError) => {
          if (!mountedRef.current || recognitionError.type === "no_speech") return;
          setError(recognitionError);
          setRecordingState("error");
        },
        () => {
          if (!mountedRef.current || recognitionRef.current !== service || !liveWordsRef.current) return;
          void handleBrowserSpeech();
        },
      );
      if (mountedRef.current) setRecordingState("recording");
    } catch (caught) {
      service.cleanup();
      setError({ type: "unknown", message: caught instanceof Error ? caught.message : "Unable to start browser speech." });
      setRecordingState("error");
    }
  };

  stopRecordingRef.current = handleStopRecording;

  const handleSubmit = async () => {
    const answer = transcript.trim();
    if (disabled || submittingRef.current || !answer || answer.length > MAX_CHARS || recordingState !== "idle") return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const speech = speechRef.current || { transcription_provider: "typed" as const };
      if (await onSubmit(answer, transcriptEdited, speech)) setIsEditing(false);
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

        <p className="text-sm text-muted-foreground">{speechLabel}</p>
        {recordingState === "error" && (
          <Button type="button" variant="outline" onClick={() => void handleBrowserSpeech()} disabled={disabled || isSubmitting}>
            Use browser speech
          </Button>
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
