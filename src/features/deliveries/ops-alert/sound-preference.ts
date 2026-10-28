import { relayUrl } from "@/lib/api-relay-paths";
import { relayJson } from "@/lib/relay-read";

/**
 * The person's alert sound switch (decision 14.6), read from the browser
 * through the relay (lib/relay-read).
 *
 * The balloon asks for it on every protected page. As a Server Action it
 * took its turn in Next's one-at-a-time action queue on every mount, in
 * front of (or behind) the page's own reads. Saving it stays an action
 * (`updateOpsAlertSound`). Never saved means on.
 */
async function fetchOpsAlertSound({
  signal,
}: { signal?: AbortSignal } = {}): Promise<boolean> {
  const preferences = await relayJson<{ opsAlert?: { sound?: boolean } }>(
    relayUrl("/notification/preferences"),
    {
      signal,
      errorMessage: "Houve um erro ao carregar a preferência de som.",
    },
  );

  return preferences?.opsAlert?.sound ?? true;
}

export { fetchOpsAlertSound };
