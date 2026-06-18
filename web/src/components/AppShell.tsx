"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { useMerchant } from "@/lib/api";
import { MOCK_MERCHANT_ID } from "@/lib/mocks";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: merchant } = useMerchant(MOCK_MERCHANT_ID);

  return (
    <div className="min-h-screen bg-cream">
      <Header merchant={merchant} />
      <motion.main
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8"
      >
        {children}
      </motion.main>
    </div>
  );
}
