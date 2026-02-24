"use client";

import { useState, useEffect, useCallback } from "react";

export type ThemeName = "ember" | "mono" | "paper" | "pixel" | "vista";

export const THEMES: { id: ThemeName; label: string }[] = [
  { id: "ember", label: "Ember" },
  { id: "mono", label: "Mono" },
  { id: "paper", label: "Paper" },
  { id: "pixel", label: "Pixel" },
  { id: "vista", label: "Vista" },
];

const STORAGE_KEY = "glassdb-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeName>("mono");

  // Load persisted theme on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      setThemeState(stored);
      document.documentElement.setAttribute("data-theme", stored);
    }
  }, []);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  return { theme, setTheme };
}
