import type { Turn } from "./schema";

const TURN_LINE = /^(T\d+) \[(\d{2}:\d{2})\] ([^:]+): (.*)$/;
const NOTE_SPEAKERS = new Set(["Transcript note"]);

/** Parses "T01 [00:00] Agent: text" lines. Unparseable lines are attached to the previous turn. */
export function parseTranscript(transcript: string): Turn[] {
  const turns: Turn[] = [];
  for (const line of transcript.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = TURN_LINE.exec(line);
    if (match) {
      const [, id, time, speaker, text] = match;
      turns.push({ id, time, speaker, text, isNote: NOTE_SPEAKERS.has(speaker) });
    } else if (turns.length > 0) {
      turns[turns.length - 1].text += ` ${line.trim()}`;
    }
  }
  return turns;
}

/** Normalises quotes, dashes and whitespace so excerpts can be matched against the summary. */
export function normaliseText(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Finds an excerpt in the summary, tolerating quote/whitespace differences. Returns the exact summary span or null. */
export function locateExcerpt(summary: string, excerpt: string): { start: number; end: number } | null {
  const direct = summary.indexOf(excerpt);
  if (direct >= 0) return { start: direct, end: direct + excerpt.length };
  const target = normaliseText(excerpt);
  if (!target) return null;
  // Build the normalised summary while remembering each character's original index.
  const originalIndex: number[] = [];
  let normalised = "";
  for (let i = 0; i < summary.length; i++) {
    const char = normaliseChar(summary[i]);
    if (char === " " && (normalised === "" || normalised.endsWith(" "))) continue;
    normalised += char;
    originalIndex.push(i);
  }
  const index = normalised.indexOf(target);
  if (index < 0) return null;
  return { start: originalIndex[index], end: originalIndex[index + target.length - 1] + 1 };
}

function normaliseChar(char: string): string {
  if (/\s/.test(char)) return " ";
  if (char === "‘" || char === "’") return "'";
  if (char === "“" || char === "”") return '"';
  if (char === "–" || char === "—") return "-";
  return char.toLowerCase();
}
