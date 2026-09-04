"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GhostButton, LogoMark } from "./bits";

const VIDEO_ID = "GHGQnR_5lyM";

/**
 * The pitch: a play button in the hero that opens the video in a modal and
 * plays it in place. One hairline, no shadows, motion is opacity/transform
 * only; Escape and the scrim both close it. The frame is a small desk
 * artifact: mark + label on top, the film, one mono line beneath.
 */
export function PitchVideo() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <GhostButton onClick={() => setOpen(true)} ariaLabel="watch the pitch video" variant="ink" className="h-11 gap-2.5 px-5">
        <svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-hidden="true">
          <path d="M1.5 1.6v8.8c0 .5.55.8.98.54l7.06-4.4a.64.64 0 0 0 0-1.08L2.48.66A.64.64 0 0 0 1.5 1.2Z" fill="currentColor" />
        </svg>
        Watch the pitch
      </GhostButton>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-[10px] sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.3, ease: "easeOut" }}
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="the pitch video"
          >
            <motion.div
              className="w-full max-w-[62rem] overflow-hidden rounded-[4px] border border-line bg-card"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.96 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.985 }}
              transition={
                reduce
                  ? { duration: 0.01 }
                  : { type: "spring", stiffness: 300, damping: 32, mass: 0.9, opacity: { duration: 0.2, ease: "easeOut" } }
              }
              onClick={(e) => e.stopPropagation()}
            >
              {/* the lintel — mark, label, and the lamp-geometry close */}
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <LogoMark size={16} />
                  <p className="label-caps">customs — the pitch, one take</p>
                </div>
                <button
                  ref={closeRef}
                  onClick={() => setOpen(false)}
                  aria-label="close the video"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-[13px] leading-none text-inksoft transition-colors hover:text-ink focus:outline-none focus-visible:border-ink/40"
                >
                  ✕
                </button>
              </div>

              <div className="aspect-video w-full bg-ink">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
                  title="Customs — the pitch"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
