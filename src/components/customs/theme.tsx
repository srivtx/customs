"use client";

/**
 * theme.tsx — the desk lamp. A 28px round, quiet icon button in the
 * footer's bottom-left corner — x.ai's pattern, down to the geometry:
 * sun on the night desk, moon on the day desk, the other face hidden
 * by CSS so hydration never flickers. Choice persists in localStorage
 * and is applied pre-paint by the no-flash script in layout.tsx.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";

const NIGHT_THEME_COLOR = "#050505";
const DAY_THEME_COLOR = "#faf9f7";

export function ThemeToggle({ className }: { className?: string }) {
  /** null until the visitor has toggled once — the label is neutral until
      then; the icons themselves are CSS-driven and always correct. */
  const [light, setLight] = useState<boolean | null>(null);

  const toggle = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("light");
    root.classList.toggle("light", next);
    try {
      localStorage.setItem("customs-theme", next ? "light" : "dark");
    } catch {
      /* private mode: the toggle still works, it just won't persist */
    }
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute("content", next ? DAY_THEME_COLOR : NIGHT_THEME_COLOR));
    setLight(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light === null ? "Switch color theme" : light ? "Switch to dark mode" : "Switch to light mode"}
      title={light === null ? "Switch color theme" : light ? "Switch to dark mode" : "Switch to light mode"}
      className={cn(
        "flex size-7 items-center justify-center rounded-full text-ink/40 transition-colors duration-200",
        "hover:text-ink/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        className
      )}
    >
      {/* sun — the face shown on the night desk */}
      <svg
        aria-hidden
        className="icon-sun size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      {/* moon — the face shown on the day desk */}
      <svg
        aria-hidden
        className="icon-moon size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  );
}
