"use client";

import { useCallback, useState } from "react";
import { Mic, Sparkles } from "lucide-react";
import type { OnboardingBucket } from "@/lib/onboarding";
import { parseRuleFromText } from "@/lib/onboarding";
import { getBucketConfig } from "@/lib/buckets";
import { getApiBaseUrl } from "@/lib/api";
import { MicButton } from "@/components/MicButton";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";

interface StepSetRulesProps {
  buckets: OnboardingBucket[];
  onUpdate: (type: OnboardingBucket["type"], patch: Partial<OnboardingBucket>) => void;
}

export function StepSetRules({ buckets = [], onUpdate }: StepSetRulesProps) {
  const [activeVoiceType, setActiveVoiceType] = useState<string | null>(null);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const totalPct = buckets.reduce((s, b) => s + b.percentage, 0);

  const transcribeVoice = useCallback(
    async (bucketType: OnboardingBucket["type"], blob: Blob) => {
      const base = getApiBaseUrl();
      if (!base) {
        setVoiceError("Connect NEXT_PUBLIC_API_URL to use YarnGPT voice.");
        return;
      }

      setVoiceError(null);
      setVoiceProcessing(true);

      try {
        const form = new FormData();
        form.append("audio", blob, "voice.webm");

        const res = await fetch(`${base}/api/voice/transcribe`, {
          method: "POST",
          body: form,
        });

        const data = (await res.json()) as {
          transcript?: string;
          error?: { message?: string };
        };

        if (!res.ok) {
          throw new Error(data.error?.message ?? `Voice error ${res.status}`);
        }

        const transcript = data.transcript?.trim();
        if (!transcript) {
          throw new Error("Could not transcribe — try again or type your rule.");
        }

        const bucket = buckets.find((b) => b.type === bucketType);
        const merged = bucket?.naturalLanguage
          ? `${bucket.naturalLanguage} ${transcript}`.trim()
          : transcript;
        const parsed = parseRuleFromText(transcript);

        onUpdate(bucketType, {
          naturalLanguage: merged,
          ...(parsed !== null ? { percentage: parsed } : {}),
        });
      } catch (err) {
        setVoiceError(err instanceof Error ? err.message : "Voice transcription failed");
      } finally {
        setVoiceProcessing(false);
        setActiveVoiceType(null);
      }
    },
    [buckets, onUpdate],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-white p-5 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-medium text-ink-primary">Set your rules</h2>
            <p className="mt-2 text-small text-ink-tertiary">
              Type or speak naturally — English, Pidgin, or Yoruba. Local LLM voice
              (YarnGPT) will parse rules for you.
            </p>
          </div>
          <Pill variant="accent" className="shrink-0 gap-1 self-start">
            <Sparkles className="h-3 w-3" />
            Voice · YarnGPT ready
          </Pill>
        </div>

        <div className="mt-4 rounded-md border border-accent/25 bg-accent-subtle/40 px-3 py-2 text-mini text-ink-secondary">
          Try: &ldquo;Set aside seven and a half percent for VAT&rdquo; or &ldquo;Keep 15%
          for savings&rdquo;
        </div>
      </div>

      {buckets.map((bucket) => {
        const config = getBucketConfig(bucket.type);
        const Icon = config.icon;

        return (
          <div
            key={bucket.type}
            className="rounded-md border border-border bg-white p-4 sm:p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-accent/25 bg-accent-subtle">
                <Icon className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={bucket.name}
                  onChange={(e) => onUpdate(bucket.type, { name: e.target.value })}
                  className="w-full bg-transparent text-small font-medium text-ink-primary outline-none"
                />
                <p className="text-micro text-ink-tertiary">{config.label} bucket</p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={bucket.percentage || ""}
                  onChange={(e) =>
                    onUpdate(bucket.type, {
                      percentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-16 rounded-md border border-border bg-surface px-2 py-1.5 text-right text-small tabular text-ink-primary outline-none focus:border-accent/40"
                />
                <span className="text-small text-ink-tertiary">%</span>
              </div>
            </div>

            <div
              className={cn(
                "mt-4 rounded-md border transition-colors",
                activeVoiceType === bucket.type
                  ? "border-accent/40 ring-1 ring-accent/10"
                  : "border-border",
              )}
            >
              <textarea
                value={bucket.naturalLanguage}
                onChange={(e) => {
                  const text = e.target.value;
                  const parsed = parseRuleFromText(text);
                  onUpdate(bucket.type, {
                    naturalLanguage: text,
                    ...(parsed !== null ? { percentage: parsed } : {}),
                  });
                }}
                placeholder="Describe this rule in your words…"
                rows={2}
                className="block w-full resize-none bg-transparent px-3 py-2.5 text-small text-ink-primary placeholder:text-ink-quaternary focus:outline-none"
              />
              <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
                <span className="pl-1 text-micro text-ink-quaternary">
                  <Mic className="mr-1 inline h-3 w-3" />
                  Or use voice
                </span>
                <MicButton
                  compact
                  processing={voiceProcessing && activeVoiceType === bucket.type}
                  disabled={voiceProcessing}
                  onRecordingChange={(rec) =>
                    setActiveVoiceType(rec ? bucket.type : null)
                  }
                  onBlobReady={(blob) => void transcribeVoice(bucket.type, blob)}
                />
              </div>
            </div>
          </div>
        );
      })}

      <div
        className={cn(
          "rounded-md border px-4 py-3 text-small",
          totalPct > 100
            ? "border-danger/30 bg-danger-subtle text-danger"
            : "border-border bg-surface text-ink-secondary",
        )}
      >
        Total allocation: <span className="tabular font-medium">{totalPct.toFixed(1)}%</span>
        {totalPct > 100 && " — must be 100% or less"}
        {totalPct <= 100 && totalPct > 0 && " — remainder stays in operating balance"}
      </div>

      {voiceError && (
        <p className="text-small text-danger">{voiceError}</p>
      )}
    </div>
  );
}
