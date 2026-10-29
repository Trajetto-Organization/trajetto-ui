/**
 * Moved to lib/copy-with-feedback: every table's row menu copies through it
 * now, not only the fuel ones. Kept as a re-export so existing imports keep
 * working.
 */
export {
  COPY_FAILED,
  copyWithFeedback,
  type CopyDeps,
} from "@/lib/copy-with-feedback";
