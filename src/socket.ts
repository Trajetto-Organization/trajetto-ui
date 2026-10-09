import { io, Socket } from "socket.io-client";
import { mintSocketTicket } from "@/actions/session";
import { loadPublicConfig } from "@/env/client";
import { refusalRetryDelay } from "@/lib/socket-refusal";
import { queryClientProps } from "@/lib/query-client-props";
import {
  CATALOG_CHANGED_EVENT,
  applyCatalogChange,
  isCatalogChangedEvent,
} from "@/lib/catalog-sync";

// Singleton instance
let socketInstance: Socket | null = null;
let connectionPromise: Promise<Socket> | null = null;

// Connection status
const connectionStatus = {
  isConnected: false,
  isConnecting: false,
  hasConnectionError: false,
  errorMessage: "",
};

/**
 * The refusals that mean "your credential is the problem", as the API sends
 * them (websocket.ts wraps them in `error.data.code`). Anything else here is
 * the network, and the built-in reconnection already handles that.
 */
const AUTH_REFUSALS = new Set([
  "AUTH_TOKEN_INVALID",
  "AUTH_SESSION_INVALIDATED",
]);

// SOCKET_TICKET_INVALID (a ticket that expired or was already spent) is not
// on that list on purpose: it says nothing about the session, and the next
// attempt mints a fresh ticket.

const socketErrorCode = (error: Error): string | undefined =>
  (error as Error & { data?: { code?: string } }).data?.code;

/** The pending retry after a refused handshake, and how many came before it. */
let refusalRetry: ReturnType<typeof setTimeout> | null = null;
let refusalAttempts = 0;

function cancelRefusalRetry(): void {
  if (refusalRetry) clearTimeout(refusalRetry);
  refusalRetry = null;
}

/**
 * Reconciliation after a reconnection.
 *
 * The API does not replay: its emits are fire-and-forget through the Redis
 * adapter, with no connection-state recovery. Socket.IO brings the transport
 * back on its own and the subscription hooks rejoin their rooms, but whatever
 * was emitted in between — a route released during a deploy, a driver's
 * message during a Wi-Fi blink — never reaches this tab. Each screen used to
 * listen only to its own events, so it stayed wrong until somebody pressed
 * Atualizar.
 *
 * Every connection after the first one of a socket (and a first one that
 * only came after failed attempts) is therefore announced here, and each
 * screen refetches what it shows. The event stays a hint; the
 * database stays the truth.
 *
 * Spread over a couple of seconds: a deploy reconnects every open tab of the
 * product at the same moment, and without the jitter each of them would fire
 * its refetches at the API in the same instant.
 */
const RESYNC_JITTER_MS = 2_000;

const resyncListeners = new Set<() => void>();
let pendingResync: ReturnType<typeof setTimeout> | null = null;

function cancelResync(): void {
  if (pendingResync) clearTimeout(pendingResync);
  pendingResync = null;
}

function scheduleResync(): void {
  // A flapping connection reconnects several times in a few seconds; every
  // screen refetches everything anyway, so one pending resync covers them.
  if (pendingResync) return;

  pendingResync = setTimeout(() => {
    pendingResync = null;

    [...resyncListeners].forEach((listener) => {
      try {
        listener();
      } catch {
        // One broken screen must not keep the others stale.
      }
    });
  }, Math.random() * RESYNC_JITTER_MS);
}

/**
 * Runs `listener` after every reconnection. Not on a session's first
 * connection, since the page was just rendered from the server, unless that
 * connection only came after failed attempts. Returns the unsubscribe, so it
 * fits straight into a `useEffect`.
 *
 * Independent of the socket instance on purpose: a screen can subscribe before
 * the socket exists, and a logout followed by a login keeps the subscription.
 */
function onRealtimeResync(listener: () => void): () => void {
  resyncListeners.add(listener);

  return () => {
    resyncListeners.delete(listener);
  };
}

const SESSION_RECOVERY_KEY = "socket_session_recovery_at";
const SESSION_RECOVERY_COOLDOWN_MS = 30_000;

/**
 * Gets a fresh credential the only way this app has one.
 *
 * The access token lives ~15 minutes and is renewed in exactly one place:
 * `middleware.ts`, server-side, on navigation. A dispatcher who leaves the
 * panel open without navigating therefore has an expired `tkey` cookie, and
 * until now the socket would retry against it forever — the panel went quiet, with
 * no error shown, until somebody pressed F5.
 *
 * The fix does NOT add a second refresher. It cannot: the API rotates refresh
 * tokens and treats a reused one as replay, revoking the whole family and
 * every session on the account. Two racing refreshers would log the user out
 * of everything and raise a security event. So this reloads, which routes the
 * renewal back through the middleware — one refresher, no race. If the
 * session really is gone, the middleware redirects to /login, which is also
 * the right outcome.
 *
 * Once per cooldown, so a credential the server keeps refusing costs one
 * reload rather than a loop.
 */
function recoverExpiredSession(): void {
  if (typeof window === "undefined") return;

  try {
    const lastAttempt = Number(
      window.sessionStorage.getItem(SESSION_RECOVERY_KEY) ?? 0,
    );

    if (Date.now() - lastAttempt < SESSION_RECOVERY_COOLDOWN_MS) return;

    window.sessionStorage.setItem(SESSION_RECOVERY_KEY, String(Date.now()));
  } catch {
    // Private mode or blocked storage: recovering once is still better than
    // a permanently mute panel, so fall through without the guard.
  }

  socketInstance?.disconnect();
  window.location.reload();
}

// Initialize the socket with authentication
async function initializeSocket(): Promise<Socket> {
  // If it is already initializing, returns the existing promise
  if (connectionPromise) return connectionPromise;

  /**
   * Any live instance wins, connected or not.
   *
   * The old check was `socketInstance && socketInstance.connected`, which
   * meant a caller arriving while the socket was RECONNECTING built a second
   * `io()` and overwrote the singleton. The first socket stayed alive with
   * every listener still attached to it, so features ended up split across
   * two connections — one emitting, the other listening — and the symptom
   * was simply "nothing arrives", with no error anywhere. Socket.IO already
   * reconnects on its own, so handing back the existing instance is both
   * simpler and correct.
   */
  if (socketInstance) return socketInstance;

  // Creates a new connection promise
  connectionPromise = new Promise<Socket>(async (resolve, reject) => {
    try {
      connectionStatus.isConnecting = true;

      // A ticket now, before the socket exists: a session that is already
      // over is said here, where the caller can still see the rejection.
      const first = await mintSocketTicket();

      if (!first.ok && first.status === 401) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      // Read at run time (src/env): the image is promoted between
      // environments, so a build-time value would be staging's.
      const { socketUrl } = await loadPublicConfig();

      // The first attempt spends the ticket minted above; every later one
      // (reconnection, refusal retry) mints its own.
      let pendingTicket: string | null = first.ok ? first.ticket : null;

      // Create new socket instance with authentication
      const socket = io(socketUrl, {
        /**
         * A one-use ticket, never the access token.
         *
         * The page does not hold the token any more (it is HttpOnly and no
         * Server Action returns it). The web server mints a ticket with it
         * (POST /user/socket-ticket): one connection, once, within 30 s.
         *
         * A callback, not an object: socket.io-client evaluates it on every
         * `onopen`, so each reconnection carries a fresh ticket. A session
         * that ended answers 401 at the mint and goes through the same
         * recovery as a refused token (a reload, so the middleware decides).
         */
        auth: (cb: (data: object) => void) => {
          const ready = pendingTicket;

          pendingTicket = null;

          if (ready) {
            cb({ ticket: ready });
            return;
          }

          mintSocketTicket()
            .then((minted) => {
              if (minted.ok) {
                cb({ ticket: minted.ticket });
                return;
              }

              if (minted.status === 401) recoverExpiredSession();

              // No ticket: the handshake is refused and the refusal retry
              // below asks again with its back-off.
              cb({});
            })
            // A failed server action must not stall the handshake either.
            .catch(() => cb({}));
        },

        // WebSocket only, no HTTP long-polling fallback.
        //
        // Socket.IO defaults to ["polling", "websocket"]: it opens with
        // long-polling and upgrades afterwards. The polling handshake creates a
        // session id that lives IN MEMORY on the replica that answered it, and
        // every following poll must reach that same replica. With more than one
        // API replica the next poll is load balanced to the other one, which
        // does not know the id and answers 400 {"code":1,"message":"Session ID
        // unknown"} — the client retries forever and the notification service
        // never connects.
        //
        // The Redis adapter does NOT solve this: it propagates emits between
        // replicas, it does not give the polling handshake any affinity.
        //
        // Traefik does set a sticky cookie, but the browser never sends it: the
        // app runs on a different domain than the API, and a cross-site cookie
        // requires both `withCredentials` here and `SameSite=None` on the
        // cookie. A single WebSocket connection sidesteps the whole problem —
        // it stays on one replica by nature, with no session to look up.
        transports: ["websocket"],
        reconnection: true,

        // Never stop trying. The previous cap of 5 attempts meant a laptop
        // closed over lunch, or any outage longer than a few seconds, left
        // the tab permanently mute until someone reloaded the page — and a
        // dispatcher keeps this panel open all day. The growing delay is
        // what protects the server, not a hard stop.
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
        randomizationFactor: 0.5,
      });

      // Per instance: a new login builds a new socket, and its first
      // connection is not a reconnection.
      let connectedBefore = false;

      // Unless it only came after failed attempts. A tab opened during a
      // deploy is refused and retried for seconds, up to a minute with the
      // refusal backoff, and what the API emitted meanwhile is as lost as on
      // a reconnection. (The auth refusals reload the page, which is its own
      // resync.)
      let failedBefore = false;

      // Configure basic listeners
      socket.on("connect", () => {
        cancelRefusalRetry();
        refusalAttempts = 0;
        connectionStatus.isConnected = true;
        connectionStatus.isConnecting = false;
        connectionStatus.hasConnectionError = false;
        connectionStatus.errorMessage = "";

        // `connect`, not the manager's `reconnect`: the latter misses the
        // retry after a refused handshake, which is a `socket.connect()`.
        if ((connectedBefore || failedBefore) && socketInstance === socket) {
          scheduleResync();
        }

        connectedBefore = true;
      });

      socket.on("disconnect", () => {
        connectionStatus.isConnected = false;
      });

      // Bound here, once per socket, rather than by a screen: the pickers it
      // refreshes live in dialogs all over the app, and the cache it touches
      // is this module-level client, not a component's.
      socket.on(CATALOG_CHANGED_EVENT, (payload: unknown) => {
        if (!isCatalogChangedEvent(payload)) return;

        void applyCatalogChange(queryClientProps, payload);
      });

      socket.on("connect_error", (error) => {
        failedBefore = true;
        connectionStatus.isConnected = false;
        // This attempt is over. The promise used to clear the flag by
        // settling on it; it now settles before the first attempt ends.
        connectionStatus.isConnecting = false;
        connectionStatus.hasConnectionError = true;
        connectionStatus.errorMessage = error.message;

        // The API already tells us which refusals are about the credential;
        // the client simply never looked. Without this the reconnection loop
        // is the failure: it retries a dead token every ten seconds, forever,
        // and the panel looks connected-ish while receiving nothing.
        if (AUTH_REFUSALS.has(socketErrorCode(error) ?? "")) {
          recoverExpiredSession();
          return;
        }

        // Any other refusal from the server ended this socket: the built-in
        // reconnection only covers a dropped transport (`active` stays true
        // for that). Without this, a handshake refused during a deploy or a
        // database blink left the panel mute until a reload.
        if (socket.active) return;

        cancelRefusalRetry();
        refusalRetry = setTimeout(() => {
          refusalRetry = null;

          // A logout in the meantime owns the socket's fate.
          if (socketInstance !== socket) return;
          if (socket.connected || socket.active) return;

          socket.connect();
        }, refusalRetryDelay(refusalAttempts++));
      });

      // Connect the socket
      socket.connect();

      // Store the instance
      socketInstance = socket;

      /**
       * Handed over as soon as it exists, not once it connects.
       *
       * This used to resolve on `connect` and REJECT on the first
       * `connect_error` (or after 10 s). Every screen that listens — the
       * bell with the forced logout, the Rotas board, the chat — does
       * `initializeSocket().then(bind).catch(nothing)`, so a tab opened
       * during a deploy or a database blink fell into the `.catch` and never
       * bound a listener. The refusal retry above connected a second later
       * and the tab stayed deaf until a reload. Listeners on a socket that
       * is not connected yet are simply waiting; whether and when it
       * connects is told by its own events (`connect`, `connect_error`,
       * `disconnect`) and by `getConnectionStatus()`. Same contract as the
       * driver app's socket.
       */
      resolve(socket);
    } catch (error) {
      connectionStatus.isConnecting = false;
      connectionStatus.hasConnectionError = true;

      connectionStatus.errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";

      reject(error);
    }
  });

  // Clean up promise after completion. `isConnecting` is not touched here: a
  // resolved promise means the socket exists, not that it connected, and the
  // socket's own `connect`/`connect_error` settle the flag (the failure path
  // above settles it before rejecting).
  connectionPromise
    .catch(() => {})
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
}

// Method to terminate the connection
function disconnectSocket(): void {
  /**
   * The singleton is dropped synchronously, before anything async.
   *
   * It used to be cleared only inside the 100 ms timeout below, which left a
   * window where `initializeSocket` still handed back the socket of the
   * session that was ending — and the logout/login pair on this app is a soft
   * navigation, so a new login lands well inside those 100 ms. The delay
   * exists so `client_logout` reaches the server; the local reference is what
   * keeps it working after the singleton is gone.
   */
  const socket = socketInstance;

  socketInstance = null;
  connectionPromise = null;

  cancelRefusalRetry();
  refusalAttempts = 0;

  // A resync pending for the session that is ending would refetch as the
  // next one, or as nobody.
  cancelResync();

  connectionStatus.isConnected = false;
  connectionStatus.isConnecting = false;

  if (!socket) return;

  try {
    // Tells the server the disconnection is intentional, not a drop.
    socket.emit("client_logout");
    setTimeout(() => socket.disconnect(), 100);
  } catch {
    socket.disconnect();
  }
}

// Method to check if socket is connected
function isSocketConnected(): boolean {
  return socketInstance?.connected || false;
}

// Method to get connection status
function getConnectionStatus() {
  return { ...connectionStatus };
}

// Method to get socket instance (can be null if not initialized)
function getSocket(): Socket | null {
  return socketInstance;
}

export {
  initializeSocket,
  disconnectSocket,
  isSocketConnected,
  getConnectionStatus,
  getSocket,
  onRealtimeResync,
  RESYNC_JITTER_MS,
};
