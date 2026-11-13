import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
      <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
        <ClipboardCheck className="size-4 text-primary" aria-hidden />
        Summary QA
      </Link>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}
