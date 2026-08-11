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

// Initialize the socket with authentication
async function initializeSocket(): Promise<Socket> {
  // If it is already initializing, returns the existing promise
  if (connectionPromise) return connectionPromise;

  // If already connected, return the existing instance
  if (socketInstance && socketInstance.connected) return socketInstance;

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
        auth: {
          token,
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
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
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
  if (socketInstance) {
    try {
      // Emit a logout event before disconnecting
      // so the server knows it is an intentional disconnection
      socketInstance.emit("client_logout");

      // Wait a short period to ensure the event is processed
      setTimeout(() => {
        if (socketInstance) {
          socketInstance.disconnect();
          socketInstance = null;
        }
      }, 100);
    } catch (error) {
      // In case of error, force disconnection immediately
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
    }
  }

  connectionPromise = null;

  connectionStatus.isConnected = false;
  connectionStatus.isConnecting = false;
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
