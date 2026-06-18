"use client";

import { useEffect, useRef, useCallback } from "react";
import type { StreamTransaction } from "@/lib/splitFlow";
import { STREAM_EVENT } from "@/lib/splitFlow";
import { getApiBaseUrl } from "@/lib/api";

export function useTransactionStream(
  merchantId: string,
  onTransaction: (tx: StreamTransaction) => void,
) {
  const handlerRef = useRef(onTransaction);
  handlerRef.current = onTransaction;

  const handlePayload = useCallback((data: StreamTransaction) => {
    handlerRef.current(data);
  }, []);

  useEffect(() => {
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<StreamTransaction>).detail;
      if (detail) handlePayload(detail);
    };
    window.addEventListener(STREAM_EVENT, onCustom);

    const base = getApiBaseUrl();
    let source: EventSource | null = null;

    if (base) {
      source = new EventSource(`${base}/api/merchants/${merchantId}/stream`);
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StreamTransaction;
          handlePayload(data);
        } catch {
          /* ignore malformed */
        }
      };
      source.onerror = () => {
        /* EventSource auto-reconnects */
      };
    }

    return () => {
      window.removeEventListener(STREAM_EVENT, onCustom);
      source?.close();
    };
  }, [merchantId, handlePayload]);
}

export function emitStreamTransaction(tx: StreamTransaction): void {
  window.dispatchEvent(new CustomEvent(STREAM_EVENT, { detail: tx }));
}
