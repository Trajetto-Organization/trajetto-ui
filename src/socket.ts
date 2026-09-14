import { io, Socket } from "socket.io-client";
import { getCookies } from "@/actions/cookies";

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

const socketErrorCode = (error: Error): string | undefined =>
  (error as Error & { data?: { code?: string } }).data?.code;

const SESSION_RECOVERY_KEY = "socket_session_recovery_at";
const SESSION_RECOVERY_COOLDOWN_MS = 30_000;

/**
 * Gets a fresh credential the only way this app has one.
 *
 * The access token lives ~15 minutes and is renewed in exactly one place:
 * `middleware.ts`, server-side, on navigation. A dispatcher who leaves the
 * panel open without navigating therefore holds an expired `tkey`, and until
 * now the socket would retry against it forever — the panel went quiet, with
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

      // Get the authentication token
      const token = await getCookies("tkey");
      if (!token) {
        throw new Error("Token de autenticação não disponível");
      }

      // Socket URL do environment
      const socketUrl = process.env.NEXT_PUBLIC_HTTP_REQUEST;
      if (!socketUrl) {
        throw new Error("URL do socket não definida");
      }

      // Create new socket instance with authentication
      const socket = io(socketUrl, {
        /**
         * A callback, not an object.
         *
         * socket.io-client evaluates this on every `onopen` — so every
         * reconnection, not just the first connection. As a static object the
         * token was read once, at page load, and frozen there: after a deploy,
         * a tunnel change or any drop past the token's 15-minute life, the
         * client reconnected forever with a credential the server had already
         * rejected. Reading the cookie here means each attempt carries
         * whatever the middleware last wrote.
         */
        auth: (cb: (data: object) => void) => {
          getCookies("tkey")
            .then((fresh) => cb({ token: fresh ?? token }))
            // A failed server action must not stall the handshake — send what
            // we have and let connect_error decide.
            .catch(() => cb({ token }));
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

      // Configure basic listeners
      socket.on("connect", () => {
        connectionStatus.isConnected = true;
        connectionStatus.isConnecting = false;
        connectionStatus.hasConnectionError = false;
        connectionStatus.errorMessage = "";
      });

      socket.on("disconnect", () => {
        connectionStatus.isConnected = false;
      });

      socket.on("connect_error", (error) => {
        connectionStatus.isConnected = false;
        connectionStatus.hasConnectionError = true;
        connectionStatus.errorMessage = error.message;

        // The API already tells us which refusals are about the credential;
        // the client simply never looked. Without this the reconnection loop
        // is the failure: it retries a dead token every ten seconds, forever,
        // and the panel looks connected-ish while receiving nothing.
        if (AUTH_REFUSALS.has(socketErrorCode(error) ?? "")) {
          recoverExpiredSession();
        }
      });

      // Connect the socket
      socket.connect();

      // Store the instance
      socketInstance = socket;

      // Wait for connection or error
      socket.on("connect", () => resolve(socket));
      socket.on("connect_error", (error) => reject(error));

      // Security timeout
      setTimeout(() => {
        if (!socket.connected) {
          reject(new Error("Timeout ao conectar ao socket"));
        }
      }, 10000);
    } catch (error) {
      connectionStatus.isConnecting = false;
      connectionStatus.hasConnectionError = true;

      connectionStatus.errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";

      reject(error);
    }
  });

  // Clean up promise after completion
  connectionPromise
    .catch(() => {})
    .finally(() => {
      connectionStatus.isConnecting = false;
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
};
