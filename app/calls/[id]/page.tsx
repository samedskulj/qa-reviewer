import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { CallReview } from "@/components/call-review/call-review";
import { getCall, getCalls } from "@/lib/data";

export async function generateStaticParams() {
  return (await getCalls()).map((call) => ({ id: call.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `${id} · Summary QA reviewer` };
}

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = await getCall(id);
  if (!call) notFound();

  const ids = (await getCalls()).map((item) => item.id);
  const index = ids.indexOf(call.id);

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      <CallReview
        call={{
          id: call.id,
          callDate: call.call_date,
          duration: call.estimated_duration,
          summary: call.summary,
          turns: call.turns,
        }}
        findings={call.findings}
        checks={call.analysis?.checks ?? []}
        suggestedVerdict={call.analysis?.suggestedVerdict ?? null}
        rationale={call.analysis?.rationale ?? null}
        model={call.analysis?.model ?? null}
        analysisError={call.analysisError}
        prevId={ids[index - 1] ?? null}
        nextId={ids[index + 1] ?? null}
      />
    </div>
  );
}
