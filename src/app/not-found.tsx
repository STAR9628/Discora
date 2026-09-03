import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center space-y-4">
      <div className="rounded-full bg-amber-500/10 p-4 border border-amber-500/20">
        <FileQuestion className="h-10 w-10 text-amber-400" />
      </div>
      <h1 className="text-2xl font-black text-foreground">Resource Not Found</h1>
      <p className="text-xs md:text-sm text-muted-foreground max-w-md">
        The requested inquiry, debate, discussion, or resource does not exist or may have been removed.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md transition-all hover:opacity-90 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Home</span>
      </Link>
    </div>
  );
}
