import Link from "next/link";
import { DeskHead } from "@/components/customs/bits";

/**
 * not-found — even a dead URL gets the desk: the head, one hairline of
 * prose, one way back. Nothing here is an error report; it is the
 * product's voice at its calmest.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <DeskHead size={44} className="text-ink" />
      <p className="label-caps">404 · nothing to declare</p>
      <h1 className="font-display text-2xl font-medium text-ink">Lost at the desk.</h1>
      <p className="max-w-sm text-[13.5px] leading-relaxed text-inksoft">
        This page never cleared the gate — and nothing without a mandate
        gets through. The counter itself is open.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-9 items-center rounded-[4px] border border-line2 px-4 text-[13px] font-medium text-ink transition-colors hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        back to the counter
      </Link>
    </main>
  );
}
