"use client";

import { SWRConfig } from "swr";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 2000,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
