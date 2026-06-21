"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Mic, Sparkles } from "lucide-react";
import { getApiBaseUrl, MERCHANT_ID } from "@/lib/api";
import type { AssistantResponse, ChatApiResult, ChatMessage } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { MicButton, RecordingDots } from "@/components/MicButton";
import { StatusDot } from "@/components/ui/StatusDot";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "How are my sales this week?",
  "Set aside 7.5% for VAT",
  "Am I eligible for a loan?",
];

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
        <p className="whitespace-pre-wrap text-small leading-relaxed">{response.body}</p>
        <div className="flex flex-wrap gap-2">
          {response.buttons.map((btn) => (
            <Button
              key={btn.id}
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
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
        <p className="whitespace-pre-wrap text-small leading-relaxed">{response.body}</p>
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="mb-2 text-micro font-medium uppercase tracking-wider text-ink-tertiary">
            {response.buttonText}
          </p>
          <div className="space-y-1">
            {response.sections.flatMap((section) =>
              section.rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onAction(`Selected: ${row.title}`)}
                  className="flex w-full flex-col rounded-md px-2 py-2 text-left transition-colors hover:bg-white disabled:opacity-50"
                >
                  <span className="text-small font-medium text-ink-primary">{row.title}</span>
                  {row.description && (
                    <span className="text-mini text-ink-tertiary">{row.description}</span>
                  )}
                </button>
              )),
            )}
          </div>
        </div>
      </div>
    );
  }

  return <p className="whitespace-pre-wrap text-small leading-relaxed">{response.body}</p>;
}

function UserMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] border-r-2 border-accent py-0.5 pr-3 text-right">
        {msg.transcript && (
          <span
            className="mb-1 inline-flex items-center gap-1 text-micro text-ink-tertiary"
            aria-label="Voice message"
          >
            <Mic className="h-3 w-3" />
            Voice
          </span>
        )}
        <p className="text-small leading-relaxed text-ink-primary">
          {msg.transcript ?? msg.content}
        </p>
      </div>
    </div>
  );
}

function AssistantMessage({
  msg,
  onAction,
  disabled,
}: {
  msg: ChatMessage;
  onAction: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-subtle">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        {msg.response ? (
          <AssistantContent
            response={msg.response}
            onAction={onAction}
            disabled={disabled}
          />
        ) : (
          <p className="whitespace-pre-wrap text-small leading-relaxed text-ink-secondary">
            {msg.content}
          </p>
        )}
      </div>
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
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const busy = loading || voiceProcessing || recording;
  const showSuggestions = messages.length === 1 && messages[0]?.id === "welcome";
  const apiConnected = Boolean(getApiBaseUrl());

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const sendVoice = useCallback(
    async (blob: Blob, durationMs: number) => {
      const base = getApiBaseUrl();
      if (!base) {
        setError("Connect NEXT_PUBLIC_API_URL to use Streams Voice.");
        return;
      }

      setError(null);
      setVoiceProcessing(true);

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

        const data = (await res.json()) as ChatApiResult & {
          error?: { message?: string };
        };

        if (!res.ok) {
          throw new Error(data.error?.message ?? `Voice error ${res.status}`);
        }

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
        void durationMs;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Voice failed");
      } finally {
        setVoiceProcessing(false);
        scrollToBottom();
      }
    },
    [conversationId, merchantId, scrollToBottom],
  );

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

      setMessages((prev) => [
        ...prev,
        { id: messageId(), role: "user", content: trimmed },
      ]);

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
        scrollToBottom();
      }
    },
    [conversationId, loading, merchantId, scrollToBottom],
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return (
    <aside className="fixed bottom-0 right-0 top-14 z-30 hidden w-[400px] flex-col border-l border-border bg-surface lg:flex">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-subtle">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h2 className="text-small font-medium text-ink-primary">Co-pilot</h2>
            <p className="text-micro text-ink-tertiary">Text · Streams Voice (YarnGPT)</p>
          </div>
        </div>
        <StatusDot
          label={apiConnected ? "Connected" : "Offline"}
          variant={apiConnected ? "success" : "neutral"}
        />
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5"
      >
        {messages.map((msg) =>
          msg.role === "user" ? (
            <UserMessage key={msg.id} msg={msg} />
          ) : (
            <AssistantMessage
              key={msg.id}
              msg={msg}
              onAction={sendMessage}
              disabled={busy}
            />
          ),
        )}

        {showSuggestions && (
          <div className="space-y-2 pt-1">
            <p className="text-micro font-medium uppercase tracking-wider text-ink-quaternary">
              Try asking
            </p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={busy}
                  onClick={() => void sendMessage(prompt)}
                  className="rounded-md border border-border bg-white px-3 py-2.5 text-left text-small text-ink-secondary transition-colors hover:border-border-strong hover:bg-surface disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {recording && (
          <div className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger-subtle px-3 py-2 text-mini text-danger">
            <RecordingDots />
            <span>Listening… tap mic to stop · Esc to cancel</span>
          </div>
        )}

        {(loading || voiceProcessing) && !recording && (
          <div className="flex items-center gap-2 text-mini text-ink-tertiary">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
            {voiceProcessing ? "Transcribing with YarnGPT…" : "Thinking…"}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border bg-white p-3">
        {error && (
          <div className="mb-2 rounded-md border border-danger/20 bg-danger-subtle px-3 py-2 text-mini text-danger">
            {error}
          </div>
        )}

        <div
          className={cn(
            "rounded-lg border bg-white transition-colors",
            recording ? "border-danger/30 ring-1 ring-danger/10" : "border-border focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/10",
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder={
              recording
                ? "Recording voice…"
                : "Ask about buckets, loans, or today's sales…"
            }
            disabled={busy}
            rows={1}
            className="block w-full resize-none overflow-hidden bg-transparent px-3.5 pb-1 pt-3 text-small leading-relaxed text-ink-primary placeholder:text-ink-quaternary focus:outline-none disabled:opacity-60"
            style={{ maxHeight: 120 }}
          />

          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <span className="pl-1.5 text-micro text-ink-quaternary">
              {recording ? "Release mic to send" : "Enter · Shift+Enter for new line"}
            </span>

            <div className="flex items-center gap-1">
              <MicButton
                compact
                disabled={loading}
                processing={voiceProcessing}
                onRecordingChange={setRecording}
                onBlobReady={(blob, ms) => void sendVoice(blob, ms)}
              />
              <button
                type="button"
                disabled={busy || !input.trim()}
                onClick={() => void sendMessage(input)}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  input.trim() && !busy
                    ? "bg-accent text-white hover:bg-accent-hover"
                    : "bg-surface text-ink-quaternary",
                )}
                aria-label="Send message"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
