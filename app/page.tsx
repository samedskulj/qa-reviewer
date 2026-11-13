import { getCalls } from "@/lib/data";

export default async function Home() {
  const calls = await getCalls();
  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-xl font-semibold tracking-tight">Summary QA reviewer</h1>
      <ul className="mt-4 divide-y border text-sm">
        {calls.map((call) => (
          <li key={call.id} className="flex items-center justify-between gap-3 p-3">
            <span className="font-mono">{call.id}</span>
            <span className="text-muted-foreground">
              {call.turns.length} turns · {call.findings.length} findings
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
