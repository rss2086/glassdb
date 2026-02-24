"use client";

import type { PrivacyEvent, PrivacyStats } from "./types";

const initialStats: PrivacyStats = {
  totalRowsLocal: 0,
  totalTokensSent: 0,
  totalQueryRowsSent: 0,
  events: [],
};

let state: PrivacyStats = { ...initialStats };
const listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((l) => l());
}

export function getPrivacyStats(): PrivacyStats {
  return state;
}

export function addPrivacyEvent(event: Omit<PrivacyEvent, "timestamp">) {
  state = {
    ...state,
    totalTokensSent: state.totalTokensSent + (event.tokensSent ?? 0),
    totalQueryRowsSent: state.totalQueryRowsSent + (event.rowsProcessed ?? 0),
    totalRowsLocal: state.totalRowsLocal + (event.rowsKeptLocal ?? 0),
    events: [...state.events, { ...event, timestamp: Date.now() }],
  };
  notify();
}

export function addLocalRows(count: number) {
  state = {
    ...state,
    totalRowsLocal: state.totalRowsLocal + count,
  };
  notify();
}

export function resetPrivacy() {
  state = { ...initialStats, events: [] };
  notify();
}

export function subscribePrivacy(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
