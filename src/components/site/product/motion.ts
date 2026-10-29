/** True when the visitor asked for less motion (browser only; false on the server). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Design easing, cubic-bezier(.22,1,.36,1). */
const EASE = "cubic-bezier(.22,1,.36,1)";

export { EASE, prefersReducedMotion };
