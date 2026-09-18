import { Suspense } from "react";
import { AttestAgePageContent } from "./attest-age-content";

export const dynamic = "force-dynamic";

export default function AttestAgePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-4"><div className="w-full max-w-md"><div className="animate-pulse space-y-4"><div className="h-6 w-1/2 bg-muted rounded"></div><div className="h-4 w-full bg-muted rounded"></div><div className="h-4 w-3/4 bg-muted rounded"></div><div className="h-10 bg-muted rounded"></div><div className="h-10 bg-muted rounded"></div><div className="h-10 bg-muted rounded"></div></div></div></div>}>
      <AttestAgePageContent />
    </Suspense>
  );
}