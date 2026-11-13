import { AppHeader } from "@/components/app-header";
import { ExportButton } from "@/components/export-button";
import { QueueTable } from "@/components/queue-table";
import { getCalls } from "@/lib/data";
import type { QueueItem } from "@/lib/queue";

export default async function QueuePage() {
  const calls = await getCalls();
  const items: QueueItem[] = calls.map((call) => ({
    id: call.id,
    summary: call.summary,
    suggestedVerdict: call.analysis?.suggestedVerdict ?? null,
    findings: call.findings,
    analysisError: call.analysisError,
  }));

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader>
        <ExportButton calls={items} />
      </AppHeader>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Call summary review</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Check each AI-generated summary against its transcript. Suggested issues come from an AI review and
            rule checks; you confirm or dismiss each one and decide whether the summary could mislead a colleague.
          </p>
        </div>
        <QueueTable calls={items} />
      </main>
    </div>
  );
}
