"use client";

import { useCallback, useSyncExternalStore } from "react";
import { reviewStoreSchema, type CallReview, type ReviewStore } from "./schema";

const STORAGE_KEY = "qa-reviewer:reviews:v1";
const EMPTY: ReviewStore = {};
const listeners = new Set<() => void>();
let cached: ReviewStore | null = null;

function readStore(): ReviewStore {
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = reviewStoreSchema.safeParse(raw ? JSON.parse(raw) : {});
    cached = parsed.success ? parsed.data : {};
  } catch {
    cached = {};
  }
  return cached;
}

function writeStore(next: ReviewStore) {
  cached = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); decisions still work for this session.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cached = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function emptyReview(): CallReview {
  return { decisions: {}, manualFindings: [], verdict: null, note: "", updatedAt: new Date().toISOString() };
}

/** All reviewer decisions in this browser, kept in localStorage. */
export function useReviews() {
  const reviews = useSyncExternalStore(subscribe, readStore, () => EMPTY);
  const updateReview = useCallback((callId: string, change: (review: CallReview) => CallReview) => {
    const current = readStore();
    const updated = change(current[callId] ?? emptyReview());
    writeStore({ ...current, [callId]: { ...updated, updatedAt: new Date().toISOString() } });
  }, []);
  const resetAll = useCallback(() => writeStore({}), []);
  return { reviews, updateReview, resetAll };
}

export type ReviewStatus = "not_started" | "in_progress" | "reviewed";

export function reviewStatus(review: CallReview | undefined): ReviewStatus {
  if (!review) return "not_started";
  if (review.verdict) return "reviewed";
  const touched = Object.keys(review.decisions).length > 0 || review.manualFindings.length > 0 || review.note !== "";
  return touched ? "in_progress" : "not_started";
}
