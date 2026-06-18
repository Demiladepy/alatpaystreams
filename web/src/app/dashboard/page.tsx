import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="animate-pulse text-muted-foreground">Loading dashboard…</div>}>
      <DashboardClient />
    </Suspense>
  );
}
