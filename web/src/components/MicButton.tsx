"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const MAX_RECORDING_MS = 30_000;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/mp4")) {
    return "audio/mp4";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) {
    return "audio/webm";
  }
  return undefined;
}

export function isVoiceSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined" &&
    pickMimeType() !== undefined
  );
}

function formatTimer(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

interface MicButtonProps {
  disabled?: boolean;
  processing?: boolean;
  compact?: boolean;
  onRecordingChange?: (recording: boolean) => void;
  onBlobReady: (blob: Blob, durationMs: number) => void;
  onCancel?: () => void;
  className?: string;
}

export type MicButtonState = "idle" | "recording" | "processing" | "error";

export function MicButton({
  disabled,
  processing = false,
  compact = false,
  onRecordingChange,
  onBlobReady,
  onCancel,
  className,
}: MicButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [state, setState] = useState<MicButtonState>("idle");
  const displayState: MicButtonState = processing ? "processing" : state;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const stopRecording = useCallback(
    (cancel = false) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
        maxTimeoutRef.current = null;
      }

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        setState("idle");
        onRecordingChange?.(false);
        cleanupStream();
        return;
      }

      if (cancel) {
        recorder.onstop = () => {
          cleanupStream();
          chunksRef.current = [];
          setState("idle");
          onRecordingChange?.(false);
          onCancel?.();
        };
        recorder.stop();
        return;
      }

      recorder.onstop = () => {
        const durationMs = Date.now() - startedAtRef.current;
        cleanupStream();
        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        if (blob.size > 0) {
          onBlobReady(blob, durationMs);
        }
        setState("idle");
        onRecordingChange?.(false);
      };
      recorder.stop();
    },
    [cleanupStream, onBlobReady, onCancel, onRecordingChange],
  );

  const startRecording = useCallback(async () => {
    if (disabled || state === "processing") return;

    setErrorMsg(null);
    try {
      const mimeType = pickMimeType();
      if (!mimeType) {
        setState("error");
        setErrorMsg("Recording not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      recorder.start();
      setState("recording");
      onRecordingChange?.(true);

      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 200);

      maxTimeoutRef.current = setTimeout(() => stopRecording(false), MAX_RECORDING_MS);
    } catch {
      setState("error");
      setErrorMsg("Microphone access denied: check browser settings.");
      cleanupStream();
    }
  }, [cleanupStream, disabled, onRecordingChange, state, stopRecording]);

  useEffect(() => {
    setVoiceSupported(isVoiceSupported());
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state === "recording") {
        stopRecording(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, stopRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
      cleanupStream();
    };
  }, [cleanupStream]);

  // Placeholder matches server + first client paint — avoids hydration mismatch
  if (!mounted) {
    return (
      <div
        className={cn("relative h-8 w-8 shrink-0", className)}
        aria-hidden
      />
    );
  }

  if (!voiceSupported) {
    return (
      <div
        className={cn("h-8 w-8 shrink-0", className)}
        title="Voice not supported in this browser"
        aria-hidden
      />
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled || displayState === "processing"}
        onClick={() => {
          if (state === "recording") stopRecording(false);
          else if (state === "idle" || state === "error") void startRecording();
        }}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
          state === "recording"
            ? "border-danger/30 bg-danger-subtle text-danger"
            : state === "error"
              ? "border-danger/40 bg-white text-ink-secondary"
              : "border-transparent bg-transparent text-ink-tertiary hover:bg-surface hover:text-ink-secondary",
          displayState === "processing" && "opacity-60",
        )}
        title={errorMsg ?? undefined}
      >
        {displayState === "processing" ? (
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
        ) : state === "recording" ? (
          <Square className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
      {state === "recording" && !compact && (
        <span className="absolute -bottom-5 right-0 whitespace-nowrap text-micro text-ink-tertiary">
          {formatTimer(elapsedMs)} / 0:30
        </span>
      )}
      {state === "error" && errorMsg && !compact && (
        <p className="absolute right-0 top-full mt-1 w-48 text-micro text-danger">
          {errorMsg}
        </p>
      )}
    </div>
  );
}

export function RecordingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-accent"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}
