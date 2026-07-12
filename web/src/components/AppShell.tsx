"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { ChatPanel } from "@/components/ChatPanel";
import { Header } from "@/components/Header";
import { MERCHANT_ID, useMerchant } from "@/lib/api";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: merchant } = useMerchant(MERCHANT_ID);

  const isLanding = pathname === "/";

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header merchant={merchant} />
      <div className="relative">
        <motion.main
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8 lg:pr-[424px]"
        >
          {children}
        </motion.main>
      </div>
      <ChatPanel merchantId={MERCHANT_ID} />
    </div>
  );
}
