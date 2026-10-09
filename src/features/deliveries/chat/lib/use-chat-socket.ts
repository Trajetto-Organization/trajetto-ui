"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSocket, initializeSocket } from "@/socket";

import { chatHintPulseMs } from "./chat-hints";

/**
 * Keeps this tab inside the realtime room of `businessId`.
 *
 * Everyone with a company of their own is put in that room by the server at
 * handshake time. A MASTER has no company — it works on whichever one it
 * picks — so the server cannot guess the room and waits for this explicit
 * subscription. Without it the admin view is deaf: messages, read receipts
 * and presence only ever show up on a reload.
 */
function useChatSubscription(businessId?: string): void {
  useEffect(() => {
    if (!businessId) return;

    let disposed = false;
    let boundSocket: ReturnType<typeof getSocket> = null;

    // Rooms live on the server and die with the connection that joined
    // them, while Socket.IO reconnects the transport on its own. So every
    // `connect` — the first one and each one after a network blip — has to
    // subscribe again, otherwise the panel goes quiet after any oscillation
    // and looks, from the outside, exactly like a broken chat.
    const handleConnect = () => {
      boundSocket?.emit("chatSubscribe", { businessId });
    };

    initializeSocket()
      .then((socket) => {
        // The panel can be gone before the socket answers; subscribing here
        // would leave the room joined with nobody listening.
        if (disposed) return;

        boundSocket = socket;

        socket.on("connect", handleConnect);

        // The promise settles as soon as the socket exists, connected or not.
        // Already connected: `connect` fired before the listener above, so
        // the first subscription goes by hand. Not yet (a handshake still
        // pending or refused and retrying): the listener sends it, and an
        // emit here would be buffered and sent a second time on top of it.
        if (socket.connected) {
          socket.emit("chatSubscribe", { businessId });
        }
      })
      .catch(() => {
        // No realtime at all: the panel still lists and sends over HTTP.
      });

    return () => {
      disposed = true;

      boundSocket?.off("connect", handleConnect);

      // A disconnected socket already lost the room, and the queued emit
      // would only land after a reconnection this panel no longer wants.
      if (boundSocket?.connected) {
        boundSocket.emit("chatUnsubscribe", { businessId });
      }
    };
  }, [businessId]);
}

/**
 * The "digitando..." the driver sees while the base writes.
 *
 * Throttled like the mobile side: the hint is ephemeral and the receiving
 * end keeps it on screen for a few seconds, so emitting per keystroke would
 * only flood the socket. Silent when there is nobody to notify — a driver
 * without an app account has no socket to reach.
 */
function useChatTypingEmitter(
  driverUserId: string | null | undefined,
  enabled: boolean,
): () => void {
  const lastEmitAtRef = useRef<number>(0);

  return useCallback(() => {
    if (!enabled || !driverUserId) return;

    const now = Date.now();

    if (now - lastEmitAtRef.current < chatHintPulseMs("typing")) return;

    lastEmitAtRef.current = now;

    // Best effort by design: a hint lost while the socket is down is worth
    // nothing a moment later anyway.
    getSocket()?.emit("chatTyping", { driverUserId });
  }, [driverUserId, enabled]);
}

/**
 * The "gravando áudio..." the driver sees while the base records a note.
 *
 * Its own event, mirroring the server: the two hints can be true at the
 * same instant here — a hand on the keyboard and a note recording beside it
 * — so a flag on the typing event would have the last one to arrive erase
 * the other.
 *
 * A PULSE, exactly like the typing hint, and that is the whole of the
 * design: `chatRecording { recording: true }` goes out every couple of
 * seconds for as long as the microphone is capturing, and the other side
 * puts the sentence out on its own when the pulses stop. Nothing has to
 * arrive for that to be correct — a socket that drops, a tab that closes, a
 * machine that goes to sleep mid-note all end the hint by saying nothing.
 *
 * It used to be one signal at each end of a recording, with a safety window
 * on the receiving side as long as the audio ceiling itself, and every one
 * of the ways above left a sentence standing over a dead conversation for
 * two and a half minutes.
 *
 * The state, rather than a callback that emits when called, is what makes
 * the pulse follow the capture instead of following a render. It also
 * settles the case where there is nobody to pulse AT yet: "Conversar com o
 * motorista" opens the panel with `driverUser` still null, so a recording
 * started right then had its one and only announcement dropped on the floor
 * and nothing ever re-sent it. Here the effect simply re-runs when the
 * driver's user id arrives and the pulse starts, mid-recording, on its own.
 *
 * The `false` on the way out is a courtesy — an instant ending instead of a
 * four-second one — and never the mechanism. If it goes missing, the
 * silence that follows it says the same thing.
 */
function useChatRecordingPulse(
  driverUserId: string | null | undefined,
  enabled: boolean,
): (capturing: boolean) => void {
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  useEffect(() => {
    if (!isCapturing || !enabled || !driverUserId) return;

    // Best effort, exactly like the typing hint: a pulse lost while the
    // socket is down is replaced by the next one a couple of seconds later,
    // instead of being the one signal the whole hint depended on.
    const announce = (recording: boolean) =>
      getSocket()?.emit("chatRecording", { driverUserId, recording });

    announce(true);

    // A background tab has its timers clamped, so a note recorded with the
    // window buried can pulse late and blink the hint on the driver's
    // screen. Deliberately left alone: the alternative is the long window
    // that was just removed, and a hint that blinks while the operator is
    // looking at something else costs less than one that lies for minutes.
    const pulse = setInterval(
      () => announce(true),
      chatHintPulseMs("recording"),
    );

    return () => {
      clearInterval(pulse);

      // The old id, on purpose: this closure is the recording that is
      // ending, not whatever conversation the panel moved on to.
      announce(false);
    };
  }, [driverUserId, enabled, isCapturing]);

  return setIsCapturing;
}

export { useChatSubscription, useChatTypingEmitter, useChatRecordingPulse };
