import { shouldPlaySound } from "./rules";

/**
 * One tab rings (design §6.7). With the tower open in several tabs every
 * event would play N times; the Web Locks API lets the tabs of one origin
 * agree on a single holder of a named lock, and the next in the queue takes
 * over when the holder closes (https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).
 * Without the API (an insecure context, an old browser) every tab plays: an
 * acceptable degradation, never silence.
 */

const SOUND_LOCK_NAME = "trajetto-ops-alert-sound";

interface LockManagerLike {
  request: (name: string, callback: () => Promise<void>) => Promise<unknown>;
  /** LockManager.query(): which locks the tabs of this origin hold now. */
  query?: () => Promise<{ held?: Array<{ name?: string }> }>;
}

interface SoundLeader {
  isLeader: () => boolean;
  /**
   * True while this tab waits for its first interaction AND no other tab
   * rings: nobody hears the alerts, so the balloon must ask for the click.
   */
  needsActivation: () => Promise<boolean>;
  stop: () => void;
}

/**
 * Whether the person has interacted with this tab (navigator.userActivation),
 * and a way to hear when they first do. A tab nobody touched cannot play
 * (autoplay policy), so it must not hold the lock: the tab in use would stay
 * silent while a hidden one asks "Clique para ativar o som".
 */
interface UserActivationLike {
  hasBeenActive: () => boolean;
  /** Calls back once on the first interaction; returns the unsubscribe. */
  onFirstActivation: (callback: () => void) => () => void;
}

/** The browser's: userActivation plus the first pointer/key on the page. */
function browserUserActivation(): UserActivationLike | null {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return null;

  const activation = (
    navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }
  ).userActivation;

  // Without the API there is nothing to wait for: request at once, as before.
  if (!activation) return null;

  return {
    hasBeenActive: () => activation.hasBeenActive,
    onFirstActivation: (callback) => {
      const events = ["pointerdown", "keydown"] as const;
      const handler = () => {
        unsubscribe();
        callback();
      };
      const unsubscribe = () => {
        events.forEach((name) =>
          window.removeEventListener(name, handler, true),
        );
      };

      events.forEach((name) => window.addEventListener(name, handler, true));

      return unsubscribe;
    },
  };
}

function electSoundLeader(
  locks: LockManagerLike | null | undefined,
  onChange: (isLeader: boolean) => void = () => {},
  activation: UserActivationLike | null = null,
): SoundLeader {
  if (!locks || typeof locks.request !== "function") {
    onChange(true);

    return {
      isLeader: () => true,
      needsActivation: () => Promise.resolve(false),
      stop: () => {},
    };
  }

  let leader = false;
  let stopped = false;
  let release: (() => void) | null = null;
  let unsubscribe: (() => void) | null = null;
  let requested = false;

  const request = () => {
    if (stopped || requested) return;

    requested = true;

    locks
      .request(SOUND_LOCK_NAME, () => {
        if (stopped) return Promise.resolve();

        leader = true;
        onChange(true);

        // Held until this tab stops (unmount, logout): then the next tab waiting
        // on the lock becomes the one that rings.
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      })
      .catch(() => {
        // A lock refused (aborted, unsupported in this frame): this tab simply
        // does not ring; another one will.
      });
  };

  // Only a tab someone interacted with competes for the lock.
  if (!activation || activation.hasBeenActive()) {
    request();
  } else {
    unsubscribe = activation.onFirstActivation(request);
  }

  const needsActivation = async (): Promise<boolean> => {
    if (stopped || leader || requested) return false;

    // Another tab already holds the lock: it rings, this one stays quiet.
    if (typeof locks.query === "function") {
      try {
        const snapshot = await locks.query();

        if (snapshot.held?.some((lock) => lock.name === SOUND_LOCK_NAME))
          return false;
      } catch {
        // Unknown: asking for a click is better than ringing nowhere.
      }
    }

    return !stopped && !leader && !requested;
  };

  return {
    isLeader: () => leader,
    needsActivation,
    stop: () => {
      stopped = true;
      unsubscribe?.();
      unsubscribe = null;

      if (leader) {
        leader = false;
        onChange(false);
      }

      release?.();
      release = null;
    },
  };
}

/**
 * What the balloon does with a new alert card: play it here, ask for the
 * click that lets this tab play (decision 14.6: the sound is never lost
 * silently), or nothing (sound off, another tab rings, or a burst).
 */
async function alertSoundAction(input: {
  soundEnabled: boolean;
  leader: SoundLeader | null;
  lastPlayedAt: number | null;
  now: number;
}): Promise<"play" | "ask" | "none"> {
  if (!input.soundEnabled || !input.leader) return "none";

  if (input.leader.isLeader()) {
    return shouldPlaySound({
      soundEnabled: true,
      isSoundLeader: true,
      lastPlayedAt: input.lastPlayedAt,
      now: input.now,
    })
      ? "play"
      : "none";
  }

  return (await input.leader.needsActivation()) ? "ask" : "none";
}

export {
  SOUND_LOCK_NAME,
  electSoundLeader,
  browserUserActivation,
  alertSoundAction,
};
export type { LockManagerLike, SoundLeader, UserActivationLike };
