import type { ReversalResult } from "@/actions/import/reverse-import";
import { relayJson } from "@/lib/relay-read";
import { relayUrl } from "@/lib/api-relay-paths";

/**
 * Following an undo the API runs in the background.
 *
 * With more than 500 deliveries to remove the API answers 202 and removes
 * them in batches; the import record carries `reversal` with its state:
 * RUNNING while batches go, DONE when the record became REVERSED (the numbers
 * are then the result), INTERRUPTED when it stopped halfway (asking for the
 * undo again resumes it).
 */
interface ReversalView extends ReversalResult {
  state: "RUNNING" | "INTERRUPTED" | "DONE";
}

type ReversalOutcome =
  | { kind: "done"; result: ReversalResult }
  | { kind: "interrupted"; removedDeliveries: number }
  | { kind: "gave-up" };

interface FollowOptions {
  businessId: string;
  importId: string;
  onProgress?: (removedDeliveries: number) => void;
  signal?: AbortSignal;
  intervalMs?: number;
  /** How long to follow before handing the operator back the screen. */
  timeoutMs?: number;
  read?: (url: string, signal?: AbortSignal) => Promise<unknown>;
  sleep?: (ms: number) => Promise<void>;
}

const readReversal = (url: string, signal?: AbortSignal) =>
  relayJson<unknown>(url, {
    signal,
    errorMessage: "Não foi possível acompanhar o estorno.",
  });

function reversalOf(body: unknown): ReversalView | null {
  const record =
    body && typeof body === "object" && "data" in body
      ? (body as { data?: unknown }).data
      : body;
  const reversal =
    record && typeof record === "object"
      ? (record as { reversal?: unknown }).reversal
      : null;

  if (!reversal || typeof reversal !== "object") return null;

  const view = reversal as Partial<ReversalView>;

  if (
    view.state !== "RUNNING" &&
    view.state !== "INTERRUPTED" &&
    view.state !== "DONE"
  ) {
    return null;
  }

  return {
    state: view.state,
    removedDeliveries: view.removedDeliveries ?? 0,
    removedRoutes: view.removedRoutes ?? 0,
    keptDeliveries: view.keptDeliveries ?? [],
    keptRoutes: view.keptRoutes ?? [],
  };
}

async function followReversal({
  businessId,
  importId,
  onProgress,
  signal,
  intervalMs = 2_000,
  timeoutMs = 10 * 60_000,
  read = readReversal,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: FollowOptions): Promise<ReversalOutcome> {
  const url = relayUrl(
    `/import/get-import/${encodeURIComponent(importId)}/business/${encodeURIComponent(businessId)}`,
  );
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline && !signal?.aborted) {
    await sleep(intervalMs);

    let view: ReversalView | null = null;

    try {
      view = reversalOf(await read(url, signal));
    } catch {
      // One failed read says nothing about the undo: keep following.
      continue;
    }

    if (!view) continue;

    onProgress?.(view.removedDeliveries);

    if (view.state === "DONE") {
      const { state: _state, ...result } = view;

      return { kind: "done", result };
    }

    if (view.state === "INTERRUPTED") {
      return { kind: "interrupted", removedDeliveries: view.removedDeliveries };
    }
  }

  return { kind: "gave-up" };
}

export { followReversal };
export type { ReversalOutcome };
