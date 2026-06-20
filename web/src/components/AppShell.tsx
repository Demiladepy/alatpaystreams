"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { ChatPanel } from "@/components/ChatPanel";
import { useMerchant } from "@/lib/api";
import { MOCK_MERCHANT_ID } from "@/lib/mocks";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: merchant } = useMerchant(MOCK_MERCHANT_ID);
  const showChat = pathname.startsWith("/dashboard") || pathname === "/offers";

  return (
    <div className="min-h-screen bg-surface">
      <Header merchant={merchant} />
      <div className="relative">
        <motion.main
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className={`mx-auto max-w-[1200px] px-4 py-8 sm:px-8 ${showChat ? "lg:pr-[432px]" : ""}`}
        >
          {children}
        </motion.main>
        {showChat && <ChatPanel merchantId={MOCK_MERCHANT_ID} />}
      </div>
    </div>
  );
}
