"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MessageCircle, Mic, Send, Square } from "lucide-react";
import { getApiBaseUrl, MERCHANT_ID } from "@/lib/api";
import type { AssistantResponse, ChatApiResult, ChatMessage } from "@/types/chat";
import { Button } from "@/components/ui/button";

const MAX_RECORDING_MS = 30_000;

function messageId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function AssistantContent({
  response,
  onAction,
  disabled,
}: {
  response: AssistantResponse;
  onAction: (text: string) => void;
  disabled: boolean;
}) {
  if (response.type === "buttons") {
    return (
      <div className="space-y-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{response.body}</p>
        <div className="flex flex-wrap gap-2">
          {response.buttons.map((btn) => (
            <Button
              key={btn.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="border-forest/20 bg-white text-forest hover:bg-forest/5"
              onClick={() => onAction(`[${btn.id}] ${btn.title}`)}
            >
              {btn.title}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (response.type === "list") {
    return (
      <div className="space-y-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{response.body}</p>
        <div className="rounded-xl border border-forest/10 bg-white/80 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {response.buttonText}
          </p>
          <div className="space-y-2">
            {response.sections.flatMap((section) =>
              section.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onAction(`Selected: ${row.title}`)}
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-forest/5 disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-forest">{row.title}</span>
                  {row.description && (
                    <span className="text-xs text-muted-foreground">{row.description}</span>
                  )}
                </button>
              )),
            )}
          </div>
        </div>
      </div>
    );
  }

  return <p className="whitespace-pre-wrap text-sm leading-relaxed">{response.body}</p>;
}

function RecordingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-red-500"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

export function ChatPanel({ merchantId = MERCHANT_ID }: { merchantId?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi Funke — I'm your Streams co-pilot. Ask about sales, buckets, or working capital.",
      response: {
        type: "text",
        body: "Hi Funke — I'm your Streams co-pilot. Ask about sales, buckets, or working capital.",
      },
    },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendVoice = useCallback(
    async (blob: Blob) => {
      const base = getApiBaseUrl();
      if (!base) {
        setError("Connect NEXT_PUBLIC_API_URL to use Streams Voice.");
        return;
      }

      setError(null);
      setLoading(true);

      try {
        const form = new FormData();
        form.append("audio", blob, "voice.webm");
        form.append("merchantId", merchantId);
        form.append("channel", "DASHBOARD");
        if (conversationId) form.append("conversationId", conversationId);

        const res = await fetch(`${base}/api/chat/voice`, {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || `Voice error ${res.status}`);
        }

        const data = (await res.json()) as ChatApiResult;
        setConversationId(data.conversationId);

        setMessages((prev) => [
          ...prev,
          {
            id: messageId(),
            role: "user",
            content: data.transcript ?? "Voice message",
            transcript: data.transcript,
          },
          {
            id: messageId(),
            role: "assistant",
            content: data.assistantMessage,
            response: data.response,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Voice failed");
      } finally {
        setLoading(false);
        requestAnimationFrame(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        });
      }
    },
    [conversationId, merchantId],
  );

  const stopRecording = useCallback(() => {
    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current);
      recordTimeoutRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (loading || recording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) void sendVoice(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      recordTimeoutRef.current = setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch {
      setError("Microphone access denied — allow mic to use Streams Voice.");
    }
  }, [loading, recording, sendVoice, stopRecording]);

  useEffect(() => {
    return () => {
      if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const base = getApiBaseUrl();
      if (!base) {
        setError("Connect NEXT_PUBLIC_API_URL to chat with the co-pilot.");
        return;
      }

      setError(null);
      setLoading(true);
      setInput("");

      const userMsg: ChatMessage = {
        id: messageId(),
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const res = await fetch(`${base}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchantId,
            conversationId,
            message: trimmed,
            channel: "DASHBOARD",
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || `Chat error ${res.status}`);
        }

        const data = (await res.json()) as ChatApiResult;
        setConversationId(data.conversationId);

        setMessages((prev) => [
          ...prev,
          {
            id: messageId(),
            role: "assistant",
            content: data.assistantMessage,
            response: data.response,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
        requestAnimationFrame(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        });
      }
    },
    [conversationId, loading, merchantId],
  );

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-forest/10 bg-cream/50 shadow-card">
      <div className="flex items-center gap-2 border-b border-forest/10 bg-white px-4 py-3">
        <MessageCircle className="h-4 w-4 text-forest" />
        <h2 className="font-display text-sm font-semibold text-forest">Co-pilot chat</h2>
        <span className="ml-auto text-xs text-muted-foreground">Streams Voice · WhatsApp</span>
      </div>

      <div ref={listRef} className="flex max-h-80 min-h-64 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[90%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "ml-auto bg-forest text-white"
                : "mr-auto bg-white text-forest shadow-sm"
            }`}
          >
            {msg.role === "user" && msg.transcript && (
              <p className="mb-2 text-xs italic opacity-90">
                🎙 You said: &ldquo;{msg.transcript}&rdquo;
              </p>
            )}
            {msg.role === "assistant" && msg.response ? (
              <AssistantContent
                response={msg.response}
                onAction={sendMessage}
                disabled={loading}
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
            )}
          </div>
        ))}
        {recording && (
          <div className="mr-auto flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <RecordingDots />
            Recording… tap mic to stop
          </div>
        )}
        {loading && !recording && (
          <div className="mr-auto flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking…
          </div>
        )}
      </div>

      {error && <p className="px-4 pb-2 text-xs text-red-600">{error}</p>}

      <form
        className="flex gap-2 border-t border-forest/10 bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about buckets, loans, or today's sales…"
          disabled={loading || recording}
          className="flex-1 rounded-xl border border-forest/15 bg-cream/30 px-3 py-2 text-sm outline-none ring-forest/30 focus:ring-2"
        />
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => (recording ? stopRecording() : void startRecording())}
          className={`shrink-0 ${recording ? "border-red-300 bg-red-50 text-red-600 animate-pulse" : ""}`}
        >
          {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button type="submit" disabled={loading || recording || !input.trim()} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
      <p className="border-t border-forest/5 bg-white px-4 pb-3 text-center text-xs italic text-muted-foreground">
        Streams Voice — speak naturally, the co-pilot understands.
      </p>
    </section>
  );
}
