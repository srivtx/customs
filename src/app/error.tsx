"use client";

/**
 * error — the boundary. If a view ever throws, the desk stays the desk:
 * the head, an honest line (the failure is on our side, it is logged,
 * and it will become a test case — the engineering-log invariant), and
 * one primary action. No stack traces on stage.
 */
import { DeskHead } from "@/components/customs/bits";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <DeskHead size={44} className="text-ink" />
      <p className="label-caps">the desk hit a snag</p>
      <h1 className="font-display text-2xl font-medium text-ink">Something failed on our side.</h1>
      <p className="max-w-sm text-[13.5px] leading-relaxed text-inksoft">
        The error is logged and will become a test case — that is the
        house rule. Nothing was charged; nothing was lost.
      </p>
      <button
        onClick={reset}
        className="mt-2 inline-flex h-9 items-center rounded-[4px] bg-ink px-4 text-[13px] font-medium text-paper transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        try again
      </button>
    </main>
  );
}
