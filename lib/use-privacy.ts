"use client";

import { useSyncExternalStore } from "react";
import { getPrivacyStats, subscribePrivacy } from "./privacy";
import type { PrivacyStats } from "./types";

export function usePrivacy(): PrivacyStats {
  return useSyncExternalStore(subscribePrivacy, getPrivacyStats, getPrivacyStats);
}
