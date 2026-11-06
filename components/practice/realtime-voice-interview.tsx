"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Sparkles,
  Check,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Radio,
  Keyboard,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SessionDetail, SessionQuestion } from "@/lib/types/session-api";
import { getDisplayMode, getModeTitle } from "@/lib/types/practice";
import { SpeechRecognitionService } from "@/lib/services/speech-recognition";
import { cn } from "@/lib/utils";

interface RealtimeVoiceInterviewProps {
  session: SessionDetail;
  onAnswerSubmit: (questionId: string, answer: string, transcriptEdited?: boolean) => Promise<boolean>;
  onNextQuestion: () => Promise<boolean | void>;
  onCompleteSession: () => Promise<boolean>;
  isSaving: boolean;
  saveError: string | null;
  onExit: () => void;
}

type CallState =
  | "connecting"
  | "ai_speaking"
  | "user_listening"
  | "user_paused"
  | "submitting"
  | "ai_acknowledging"
  | "completed";

export function RealtimeVoiceInterview({
  session,
  onAnswerSubmit,
  onNextQuestion,
  onCompleteSession,
  isSaving,
  saveError,
  onExit,
}: RealtimeVoiceInterviewProps) {
  const displayMode = getDisplayMode(session);
  const modeTitle = getModeTitle(displayMode);
  const currentQuestion = session.questions[session.current_question_index];
  const isLastQuestion = session.current_question_index === session.question_count - 1;

  // Real-time call state
  const [callState, setCallState] = useState<CallState>("connecting");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [showQuestionText, setShowQuestionText] = useState(true);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [micAudioLevel, setMicAudioLevel] = useState(0);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Connecting with AI Interviewer...");
  const [callDuration, setCallDuration] = useState(0);

  // References
  const speechServiceRef = useRef<SpeechRecognitionService | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const lastSpokenQuestionIdRef = useRef<string | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSafetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Safe SpeechSynthesis that avoids Chromium GC and pause bugs
  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onEnd?.();
      return;
    }

    if (speechSafetyTimerRef.current) {
      clearTimeout(speechSafetyTimerRef.current);
      speechSafetyTimerRef.current = null;
    }

    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cancel error
    }

    const utterance = new SpeechSynthesisUtterance(text);
    activeUtteranceRef.current = utterance;
    // Retain global reference to protect against Chromium V8 garbage collection
    (window as any).__speakReadyActiveUtterance = utterance;

    utterance.rate = 0.93;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Google") ||
            v.name.includes("Natural") ||
            v.name.includes("Samantha") ||
            v.name.includes("David") ||
            v.name.includes("Daniel") ||
            v.name.includes("Jenny"))
      ) || voices.find((v) => v.lang.startsWith("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    let hasFinished = false;
    const finish = () => {
      if (hasFinished) return;
      hasFinished = true;
      if (speechSafetyTimerRef.current) {
        clearTimeout(speechSafetyTimerRef.current);
        speechSafetyTimerRef.current = null;
      }
      activeUtteranceRef.current = null;
      (window as any).__speakReadyActiveUtterance = null;
      if (mountedRef.current) {
        onEnd?.();
      }
    };

    utterance.onend = finish;
    utterance.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") {
        console.warn("Speech synthesis notice:", e.error);
      }
      finish();
    };

    // Fallback safety timeout based on word count
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const maxDurationMs = Math.max(3000, Math.ceil((wordCount / 2.0) * 1000) + 2500);
    speechSafetyTimerRef.current = setTimeout(() => {
      if (!hasFinished) {
        finish();
      }
    }, maxDurationMs);

    try {
      window.speechSynthesis.speak(utterance);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (err) {
      console.warn("Failed to invoke speech synthesis:", err);
      finish();
    }
  }, []);

  // Web Audio API analyser to measure real microphone levels for visualizer
  const setupAudioAnalyser = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.7;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!mountedRef.current || !analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicAudioLevel(normalized);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err: any) {
      console.warn("Audio analyser setup warning:", err);
    }
  };

  const cleanupAudio = () => {
    if (speechSafetyTimerRef.current) {
      clearTimeout(speechSafetyTimerRef.current);
      speechSafetyTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (speechServiceRef.current) {
      speechServiceRef.current.cleanup();
      speechServiceRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Start real-time speech recognition
  const startListening = useCallback(async () => {
    if (!SpeechRecognitionService.isSupported()) {
      setMicPermissionError("Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge, or type your response.");
      return;
    }

    try {
      if (speechServiceRef.current) {
        speechServiceRef.current.cleanup();
      }

      const service = new SpeechRecognitionService();
      speechServiceRef.current = service;
      service.initialize(SpeechRecognitionService.getLanguageCode(session.explanation_language));

      await service.startListening(
        (text, isFinal) => {
          if (!mountedRef.current) return;
          if (isFinal) {
            setTranscript((prev) => (prev ? `${prev} ${text}`.trim() : text.trim()));
            setInterimTranscript("");
          } else {
            setInterimTranscript(text);
          }
        },
        (error) => {
          if (!mountedRef.current) return;
          // no_speech occurs naturally when the speaker takes a pause
          if (error.type === "no_speech") {
            return;
          }
          setMicPermissionError(error.message);
        },
        () => {
          if (!mountedRef.current) return;
          setCallState("user_paused");
          setStatusMessage("Paused. You can finish your answer or click microphone to resume.");
        },
      );

      setCallState("user_listening");
      setStatusMessage("Listening to your answer... Speak naturally.");
      setMicPermissionError(null);
    } catch (err: any) {
      if (mountedRef.current) {
        setMicPermissionError("Unable to access microphone. Please ensure microphone permissions are granted.");
      }
    }
  }, [session.explanation_language]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (speechServiceRef.current) {
      speechServiceRef.current.stopListening();
    }
    setInterimTranscript("");
  }, []);

  // AI speaks the question in real-time
  const askCurrentQuestion = useCallback(
    (questionToAsk?: SessionQuestion, index?: number) => {
      const targetQuestion = questionToAsk || currentQuestion;
      const targetIndex = index !== undefined ? index : session.current_question_index;
      if (!targetQuestion) return;

      stopListening();
      setTranscript("");
      setInterimTranscript("");
      setCallState("ai_speaking");
      setStatusMessage(`AI Interviewer is speaking question ${targetIndex + 1}...`);

      let spokenPrompt = "";
      if (targetIndex > 0) {
        const acknowledgments = [
          "Thank you for sharing that. Building on what you described,",
          "Got it, thank you. Following up on that experience,",
          "Understood. Moving forward from what you just explained,",
          "Thank you. Expanding further on that topic,",
        ];
        const ack = acknowledgments[(targetIndex - 1) % acknowledgments.length];
        spokenPrompt = `${ack} Question ${targetIndex + 1}. ${targetQuestion.text}`;
      } else {
        spokenPrompt = `Question 1. ${targetQuestion.text}`;
      }

      speakText(spokenPrompt, () => {
        if (!mountedRef.current) return;
        void startListening();
      });
    },
    [currentQuestion, session.current_question_index, speakText, startListening, stopListening]
  );

  // Initial connection and mount effect
  useEffect(() => {
    mountedRef.current = true;
    void setupAudioAnalyser();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    return () => {
      mountedRef.current = false;
      cleanupAudio();
    };
  }, []);

  // Watch for question changes and speak
  useEffect(() => {
    if (!currentQuestion) return;
    if (lastSpokenQuestionIdRef.current === currentQuestion.id) return;

    lastSpokenQuestionIdRef.current = currentQuestion.id;
    // Small delay for initial connection polish
    const delay = session.current_question_index === 0 ? 800 : 300;
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        askCurrentQuestion(currentQuestion, session.current_question_index);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [currentQuestion, session.current_question_index, askCurrentQuestion]);

  // Finish answer & submit
  const handleFinishAnswer = async () => {
    stopListening();
    const finalAnswer = (transcript + " " + interimTranscript).trim();

    if (!finalAnswer) {
      setStatusMessage("Please say or type an answer before proceeding.");
      return;
    }

    setCallState("submitting");
    setStatusMessage("Saving and evaluating your response...");

    try {
      const success = await onAnswerSubmit(currentQuestion.id, finalAnswer, false);
      if (!success) {
        setCallState("user_paused");
        setStatusMessage("Could not save answer. Please click Submit again.");
        return;
      }

      if (isLastQuestion) {
        setCallState("ai_acknowledging");
        setStatusMessage("Completing interview session...");
        speakText(
          displayMode === "english"
            ? "Thank you for the wonderful conversation! That concludes our English practice session. Generating your fluency and communication evaluation now."
            : "Thank you for your detailed answers. That concludes our interview! Generating your performance and communication evaluation now.",
          async () => {
            await onCompleteSession();
          }
        );
      } else {
        setStatusMessage("Analyzing your answer & formulating next question...");
        const advanced = await onNextQuestion();
        if (advanced === false) {
          setCallState("user_paused");
          setStatusMessage("Next question ready. Click Next Question to continue.");
        }
      }
    } catch (err) {
      setCallState("user_paused");
      setStatusMessage("An error occurred while submitting. Please retry.");
    }
  };

  // Re-listen / Repeat Question
  const handleRepeatQuestion = () => {
    stopListening();
    if (currentQuestion) {
      askCurrentQuestion(currentQuestion, session.current_question_index);
    }
  };

  const hasAnswerText = Boolean(transcript.trim() || interimTranscript.trim());

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Real-time Call Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {displayMode === "english" ? "Live English Practice Session" : "Real-time Voice Interview"}
              </span>
              <Badge variant="secondary" className="text-xs font-medium">
                {modeTitle}
              </Badge>
              {displayMode !== "english" && session.job_role && (
                <Badge variant="outline" className="text-xs">
                  {session.job_role}
                </Badge>
              )}
              {displayMode === "viva" && session.subject && (
                <Badge variant="outline" className="text-xs">
                  {session.subject}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {session.topic_focus || session.subject || (displayMode === "english"
                ? "Speaking with AI English Language Coach"
                : "Connected with AI Voice Interviewer")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm font-mono">
          <span className="text-muted-foreground">{formatTimer(callDuration)}</span>
          <div className="h-4 w-px bg-border" />
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
            Question {session.current_question_index + 1} of {session.question_count}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
          >
            <PhoneOff className="h-4 w-4 mr-1" />
            End Call
          </Button>
        </div>
      </div>

      {/* Main Interactive Call Stage */}
      <Card className="border-2 shadow-xl overflow-hidden bg-gradient-to-b from-card via-card/90 to-muted/20">
        <CardContent className="p-6 md:p-10 flex flex-col items-center justify-center min-h-[460px] text-center space-y-6">
          {/* AI INTERVIEWER AVATAR & SOUNDWAVE VISUALIZER */}
          <div className="relative flex items-center justify-center my-4">
            {/* Outer pulsating audio wave rings */}
            {callState === "ai_speaking" && (
              <>
                <div className="absolute w-44 h-44 rounded-full bg-blue-500/10 animate-ping" />
                <div className="absolute w-36 h-36 rounded-full bg-blue-500/20 animate-pulse" />
              </>
            )}

            {callState === "user_listening" && (
              <div
                className="absolute rounded-full bg-emerald-500/20 transition-all duration-75"
                style={{
                  width: `${120 + micAudioLevel * 0.8}px`,
                  height: `${120 + micAudioLevel * 0.8}px`,
                }}
              />
            )}

            {/* Core Interviewer Orb */}
            <div
              className={cn(
                "relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-300",
                callState === "ai_speaking" && "bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-blue-500/30 scale-105",
                callState === "user_listening" && "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/30",
                (callState === "connecting" || callState === "user_paused") && "bg-muted text-muted-foreground",
                (callState === "submitting" || callState === "ai_acknowledging") && "bg-gradient-to-tr from-purple-600 to-violet-500 text-white"
              )}
            >
              {callState === "ai_speaking" && <Volume2 className="h-10 w-10 animate-bounce" />}
              {callState === "user_listening" && <Mic className="h-10 w-10 animate-pulse" />}
              {callState === "user_paused" && <MicOff className="h-10 w-10" />}
              {callState === "connecting" && <Radio className="h-10 w-10 animate-spin" />}
              {(callState === "submitting" || callState === "ai_acknowledging") && <Sparkles className="h-10 w-10 animate-spin" />}

              <span className="text-[10px] uppercase font-semibold mt-1 tracking-wider">
                {callState === "ai_speaking" && "Speaking"}
                {callState === "user_listening" && "Listening"}
                {callState === "user_paused" && "Paused"}
                {callState === "connecting" && "Connecting"}
                {callState === "submitting" && "Analyzing"}
                {callState === "ai_acknowledging" && "Evaluating"}
              </span>
            </div>
          </div>

          {/* Dynamic Status Title */}
          <div className="space-y-2 max-w-lg">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              {callState === "connecting" && "Connecting to AI Interviewer..."}
              {callState === "ai_speaking" && "Listen carefully — AI is asking the question"}
              {callState === "user_listening" && "Your turn to answer — speak into your microphone"}
              {callState === "user_paused" && "Microphone paused — check answer or resume"}
              {callState === "submitting" && "Saving response & preparing next question..."}
              {callState === "ai_acknowledging" && "Response received. Preparing next step..."}
            </h2>
            <p className="text-sm text-muted-foreground">{statusMessage}</p>
          </div>

          {/* REALTIME AUDIO LEVEL EQUALIZER (when user is listening) */}
          {callState === "user_listening" && (
            <div className="flex items-center gap-1.5 h-10 py-2">
              {[12, 28, 45, 70, 95, 60, 35, 80, 50, 20].map((baseHeight, idx) => {
                const dynamicHeight = Math.max(8, Math.min(40, (micAudioLevel / 100) * baseHeight * 1.4));
                return (
                  <div
                    key={idx}
                    className="w-1.5 rounded-full bg-emerald-500 transition-all duration-75"
                    style={{ height: `${dynamicHeight}px` }}
                  />
                );
              })}
            </div>
          )}

          {/* QUESTION TEXT ACCESSIBILITY TOGGLE */}
          <div className="w-full max-w-xl">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuestionText(!showQuestionText)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showQuestionText ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                  Hide Question Text
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Show Question Subtitles / Text
                </>
              )}
            </Button>

            {showQuestionText && currentQuestion && (
              <div className="mt-3 p-4 rounded-xl border bg-card text-left shadow-sm animate-in fade-in zoom-in-95 duration-200">
                <span className="text-xs font-semibold text-primary uppercase">Spoken Question:</span>
                <p className="text-sm font-medium mt-1 leading-relaxed">{currentQuestion.text}</p>
              </div>
            )}
          </div>

          {/* REALTIME USER SPEECH TRANSCRIPTION DISPLAY */}
          <div className="w-full max-w-2xl bg-muted/30 border rounded-2xl p-5 min-h-[120px] text-left relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5 text-emerald-600" />
                  Real-time Candidate Answer
                </span>
                {callState === "user_listening" && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Recording
                  </span>
                )}
                {callState === "user_paused" && hasAnswerText && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Answer Captured
                  </span>
                )}
              </div>

              {!showTextFallback ? (
                <div className="text-sm leading-relaxed min-h-[50px]">
                  {transcript || interimTranscript ? (
                    <p>
                      <span className="text-foreground">{transcript}</span>{" "}
                      <span className="text-muted-foreground italic">{interimTranscript}</span>
                      {callState === "user_listening" && (
                        <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
                      )}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      {callState === "user_listening"
                        ? "Start speaking your answer... What you say will appear here in real-time."
                        : "Waiting for interviewer..."}
                    </p>
                  )}
                </div>
              ) : (
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Type your answer here..."
                  className="min-h-[80px] text-sm"
                />
              )}
            </div>

            {/* Sub-toolbar inside answer card */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowTextFallback(!showTextFallback)}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Keyboard className="h-3.5 w-3.5" />
                  {showTextFallback ? "Switch to Voice" : "Edit / Type Manually"}
                </button>
                {transcript && (
                  <button
                    type="button"
                    onClick={() => {
                      setTranscript("");
                      setInterimTranscript("");
                    }}
                    className="flex items-center gap-1 hover:text-destructive transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Clear Answer
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleRepeatQuestion}
                disabled={callState === "submitting" || callState === "ai_speaking"}
                className="flex items-center gap-1 hover:text-primary transition-colors disabled:opacity-50"
              >
                <Volume2 className="h-3.5 w-3.5" />
                Repeat Question
              </button>
            </div>
          </div>

          {/* Permission error warning */}
          {micPermissionError && (
            <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm max-w-lg text-left">
              <p className="font-semibold text-xs">Microphone Notice:</p>
              <p className="text-xs mt-0.5">{micPermissionError}</p>
            </div>
          )}

          {/* PRIMARY CALL ACTION CONTROLS */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {callState === "ai_speaking" && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  if (typeof window !== "undefined" && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                  }
                  void startListening();
                }}
                className="gap-2"
              >
                <span>Skip to Answer</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {(callState === "user_listening" || callState === "user_paused") && hasAnswerText && (
              <Button
                size="lg"
                onClick={handleFinishAnswer}
                disabled={isSaving}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-6 text-base shadow-lg shadow-emerald-600/20"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Saving Answer...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    <span>
                      {isLastQuestion ? "Finish Answer & Complete Interview" : "Finish Answer & Next Question"}
                    </span>
                  </>
                )}
              </Button>
            )}

            {callState === "user_paused" && (
              <Button
                variant={hasAnswerText ? "outline" : "default"}
                size="lg"
                onClick={() => void startListening()}
                className="gap-2 px-6 py-6"
              >
                <Mic className="h-5 w-5" />
                <span>{hasAnswerText ? "Add More to Answer" : "Start Speaking Answer"}</span>
              </Button>
            )}

            {(callState === "submitting" || callState === "ai_acknowledging") && (
              <Button size="lg" disabled className="gap-2 px-8 py-6 text-base">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Analyzing & Preparing Next Question...</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
