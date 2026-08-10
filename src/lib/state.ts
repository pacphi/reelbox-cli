import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { State, Reel } from "../types.js";

export function loadState(path: string): State {
  if (!existsSync(path)) {
    return { version: 1, generatedAt: new Date().toISOString(), reels: {} };
  }
  const data = JSON.parse(readFileSync(path, "utf8")) as State;
  if (!data.reels) throw new Error(`${path} is not a reelbox state file`);
  return data;
}

export function saveState(path: string, state: State): void {
  state.generatedAt = new Date().toISOString();
  mkdirSync(dirname(path) || ".", { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2), "utf8");
}

/** Merge a parsed reel into state, keeping the richest fields. */
export function upsert(state: State, r: Reel): void {
  const existing = state.reels[r.key];
  if (!existing) {
    state.reels[r.key] = r;
    return;
  }
  existing.author ||= r.author;
  existing.authorName ||= r.authorName;
  existing.caption ||= r.caption;
  existing.posted ||= r.posted;
  existing.saved ||= r.saved;
  existing.collection ||= r.collection;
  if (existing.tags.length === 0) existing.tags = r.tags;
}
