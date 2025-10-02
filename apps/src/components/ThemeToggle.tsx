"use client";

import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, systemTheme, setTheme } = useTheme();
  const effectiveTheme = theme === "system" ? systemTheme : theme;
  const isDark = effectiveTheme === "dark";

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      aria-label={isDark ? "ライトテーマに切り替え" : "ダークテーマに切り替え"}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={handleToggle}
    >
      <span aria-hidden>{isDark ? "☀️" : "🌙"}</span>
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
