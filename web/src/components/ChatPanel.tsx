"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import { getApiBaseUrl, MERCHANT_ID } from "@/lib/api";
import type { AssistantResponse, ChatApiResult, ChatMessage } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { MicButton, RecordingDots } from "@/components/MicButton";

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
        <p className="whitespace-pre-wrap">{response.body}</p>
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
        <p className="whitespace-pre-wrap">{response.body}</p>
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

  return <p className="whitespace-pre-wrap">{response.body}</p>;
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

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

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
    <aside className="fixed bottom-0 right-0 top-14 z-30 hidden w-[400px] flex-col border-l border-border bg-white lg:flex">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <h2 className="text-small font-medium text-ink-primary">
          ALATPay Streams co-pilot
        </h2>
        <Mic className="h-4 w-4 text-ink-tertiary" aria-hidden />
      </div>

      <div ref={listRef} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {messages.map((msg) =>
          msg.role === "user" ? (
            <div
              key={msg.id}
              className="ml-6 border-r-2 border-accent pr-3 text-right text-small text-ink-primary"
            >
              {msg.transcript ? (
                <span>
                  <span className="mr-1 text-ink-tertiary" aria-label="Voice message">
                    🎙
                  </span>
                  {msg.transcript}
                </span>
              ) : (
                msg.content
              )}
            </div>
          ) : (
            <div key={msg.id} className="mr-6 text-small leading-relaxed text-ink-secondary">
              <span className="mr-1.5 text-accent">✦</span>
              {msg.response ? (
                <AssistantContent
                  response={msg.response}
                  onAction={sendMessage}
                  disabled={loading || voiceProcessing}
                />
              ) : (
                msg.content
              )}
            </div>
          ),
        )}

        {recording && (
          <div className="flex items-center gap-2 text-mini text-ink-tertiary">
            <RecordingDots />
            Recording…
          </div>
        )}

        {(loading || voiceProcessing) && !recording && (
          <div className="flex items-center gap-2 text-mini text-ink-tertiary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {voiceProcessing ? "Transcribing…" : "Thinking…"}
          </div>
        )}
      </div>

      {error && (
        <p className="px-4 pb-2 text-mini text-danger">{error}</p>
      )}

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-end gap-2">
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
            placeholder={recording ? "" : "Ask about buckets, loans, or sales…"}
            disabled={loading || recording || voiceProcessing}
            rows={1}
            className="h-9 min-h-[36px] max-h-24 flex-1 resize-none rounded-md border border-border bg-white px-3 py-2 text-small text-ink-primary outline-none focus:border-border-strong"
          />
          <MicButton
            disabled={loading}
            processing={voiceProcessing}
            onRecordingChange={setRecording}
            onBlobReady={(blob, ms) => void sendVoice(blob, ms)}
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            disabled={loading || recording || voiceProcessing || !input.trim()}
            onClick={() => void sendMessage(input)}
          >
            ↵
          </Button>
        </div>
        {recording && (
          <div className="mt-2 flex items-center gap-2">
            <RecordingDots />
          </div>
        )}
        <p className="mt-2 text-micro text-ink-quaternary">↵ to send</p>
      </div>
    </aside>
  );
}
