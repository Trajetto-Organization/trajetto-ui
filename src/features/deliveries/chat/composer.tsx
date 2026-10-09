"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";

import {
  AlertCircle,
  ImagePlus,
  Mic,
  MicOff,
  Package,
  Pause,
  Play,
  SendHorizontal,
  Trash2,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

import { MAX_CHAT_IMAGES, selectChatImages } from "./lib/pick-images";
import type { ChatDeliveryChip } from "./lib/types";

import { formatSecondsClock } from "./lib/format";

import {
  AUDIO_LIMIT_LABEL,
  recordingCountdownSeconds,
  whyRecordingIsNotSendable,
} from "./lib/audio-recording";

import { useVoiceRecorder } from "./lib/use-voice-recorder";
import { truncateText } from "@/lib/truncate-text";
import { CHAT_MESSAGE_MAX, composerLengthNotice } from "./lib/composer-length";

/**
 * The ceiling the API signs into a voice note's upload.
 *
 * Mirrored from `uploadConfig.getSizeLimit("chatAttachments", "audio/...")`
 * on the server, which is where it is actually enforced: this copy exists to
 * turn a refusal that would arrive from storage into one the operator can
 * read before the bytes leave the machine.
 */
const MAX_VOICE_NOTE_BYTES = 2 * 1024 * 1024;

const MAX_MESSAGE_LENGTH = CHAT_MESSAGE_MAX;

/**
 * Why a recording stopped when the conversation was left in a narrow
 * viewport. Written here because the composer is the only thing that knows
 * it went off screen.
 */
const OFF_SCREEN_REASON = "A gravação foi encerrada ao sair da conversa.";

/** A picked image with its own preview URL, revoked when it leaves. */
interface PickedImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface ComposerSubmission {
  body: string;

  /** Empty for a plain text message; one message per file otherwise. */
  imageFiles: File[];

  /**
   * A voice note goes out on its own — no caption, no images, the way it
   * does on the driver's side. Null on every other kind of send.
   */
  audio?: { file: File; durationMs: number } | null;
}

interface ChatComposerProps {
  canWrite: boolean;
  onSend: (submission: ComposerSubmission) => void;

  /** Fired on every keystroke; the throttle lives behind the callback. */
  onTyping: () => void;

  /**
   * Whether the microphone is CAPTURING right now — not whether a recording
   * exists, and not what the bar is showing.
   *
   * A pause is a stop by that measure, and so is the ceiling, the pane
   * going off screen and the device being taken away. Everything about
   * repeating it, and about when the sentence on the driver's screen goes
   * out, lives behind this callback.
   */
  onCapturingChange: (capturing: boolean) => void;

  /** Pre-linked delivery ("Conversar" from the detail dialog). */
  deliveryChip: ChatDeliveryChip | null;
  onClearDeliveryChip: () => void;
}

/**
 * Enter sends, Shift+Enter breaks the line — the messenger convention. The
 * field clears immediately: the message itself renders above as pending,
 * so a slow network never blocks the next thought.
 *
 * Up to ten images ride along per send. What the batch refused is written
 * out below the strip, the way the checklist forms do it — never a silent
 * drop, and never one vague line for three different problems.
 */
const ChatComposer = ({
  canWrite,
  onSend,
  onTyping,
  onCapturingChange,
  deliveryChip,
  onClearDeliveryChip,
}: ChatComposerProps): JSX.Element => {
  const [text, setText] = useState<string>("");

  // The count as the limit nears; the field cuts at it (composer-length).
  const lengthNotice = composerLengthNotice(text.length);
  // Per instance: two composers on one screen must not share the id.
  const lengthId = `${useId()}-length`;

  const [images, setImages] = useState<PickedImage[]>([]);
  const [pickErrors, setPickErrors] = useState<string[]>([]);

  const recorder = useVoiceRecorder();

  /**
   * The send of a voice note, while it is happening.
   *
   * A ref AND a state: the ref is the lock, because two clicks inside one
   * tick both read a state that has not committed, and the state is what
   * draws the button disabled. Without the lock a double click sent the SAME
   * audio twice — `finish` is idempotent and hands both clicks the very same
   * recording, so the second click produced a second message rather than a
   * second failure.
   */
  const isSendingRecordingRef = useRef<boolean>(false);
  const [isSendingRecording, setIsSendingRecording] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /** The recording bar, so it can notice being taken off screen. */
  const recordingBarRef = useRef<HTMLDivElement>(null);

  // Unmounting mid-compose (switching conversations) still has to give the
  // object URLs back; the ref is what the cleanup can safely read.
  const imagesRef = useRef<PickedImage[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(
    () => () => {
      imagesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl),
      );
    },
    [],
  );

  const isRecording = recorder.status === "recording";
  const isPaused = recorder.status === "paused";
  const isCaptured = recorder.status === "captured";

  /**
   * The microphone is OPEN — capturing or merely paused holding the device.
   *
   * Which is a different question from whether sound is being captured, and
   * the two have different answers during a pause: this one is what the
   * off-screen guard below exists for, because a paused recorder still owns
   * the microphone and still has to be stopped when the pane goes away.
   */
  const isLive = isRecording || isPaused;

  // The observer is bound once per recording and must always reach the
  // current recorder, whatever re-rendered in between.
  const interruptRef = useRef(recorder.interrupt);

  useEffect(() => {
    interruptRef.current = recorder.interrupt;
  }, [recorder.interrupt]);

  // Same reason as the interrupt above: the report below has to reach the
  // current callback, and must not be re-run just because a re-render
  // handed one down — this effect is keyed on the microphone, and nothing
  // else may be allowed to key it.
  const reportCapturingRef = useRef(onCapturingChange);

  useEffect(() => {
    reportCapturingRef.current = onCapturingChange;
  }, [onCapturingChange]);

  /**
   * "Gravando áudio..." on the driver's screen, for exactly as long as this
   * microphone is capturing.
   *
   * Keyed on `recording` alone — a pause is NOT live here, though it is
   * live for everything below. The two answers differ because the questions
   * do: the microphone being open is what may not be left running off
   * screen, while what the driver is told about is sound actually being
   * captured. Paused, nothing is being said, and the hint that claims
   * otherwise is the one the reader waits on for nothing.
   *
   * One effect for both ends of it, and the cleanup is what makes every way
   * out the same way out: sent, discarded, paused, stopped by the ceiling,
   * interrupted by the pane going off screen, or the composer unmounting
   * with the microphone still open. Whatever it is, capture stopped, and
   * the sentence on the other screen goes with it.
   */
  useEffect(() => {
    if (!isRecording) return;

    reportCapturingRef.current(true);

    return () => reportCapturingRef.current(false);
  }, [isRecording]);

  /**
   * A recording may not outlive the composer being taken off screen.
   *
   * "Voltar para as conversas" in a narrow viewport hides this pane with
   * `display:none` instead of unmounting it — the very same element is what
   * the desktop layout keeps on screen, so it cannot simply be unmounted —
   * and a recorder left running behind it holds the microphone open, hits
   * the two-minute ceiling out of sight and offers nobody a way to stop it.
   *
   * Watched as a collapsed box rather than taken as a prop, because that is
   * true however the pane came to be hidden, and because the composer would
   * otherwise have to be told about a layout it knows nothing about.
   *
   * Stopped and PARKED, never discarded: whatever was already said is on the
   * send button when the reader comes back, exactly as the ceiling leaves it.
   */
  useEffect(() => {
    if (!isLive) return;

    const node = recordingBarRef.current;

    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.contentRect;

      if (!box || box.width > 0 || box.height > 0) return;

      interruptRef.current(OFF_SCREEN_REASON);
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, [isLive]);

  const clearImages = () => {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));

    setImages([]);
    setPickErrors([]);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const target = current.find((image) => image.id === id);

      if (target) URL.revokeObjectURL(target.previewUrl);

      return current.filter((image) => image.id !== id);
    });
  };

  const handlePickImages = (files: FileList | null) => {
    const incoming = Array.from(files ?? []);

    if (incoming.length === 0) return;

    const { accepted, errors } = selectChatImages(incoming, images.length);

    setPickErrors(errors);

    if (accepted.length > 0) {
      setImages((current) => [
        ...current,
        ...accepted.map((file) => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ]);
    }

    // Picking the very same file twice in a row has to fire `change` again.
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = () => {
    const body = text.trim();

    if (!body && images.length === 0) return;

    onSend({ body, imageFiles: images.map((image) => image.file) });

    setText("");
    clearImages();
  };

  const handleStartRecording = () => {
    void recorder.start();
  };

  const handleSendRecording = async () => {
    if (isSendingRecordingRef.current) return;

    isSendingRecordingRef.current = true;
    setIsSendingRecording(true);

    try {
      await sendRecording();
    } finally {
      isSendingRecordingRef.current = false;
      setIsSendingRecording(false);
    }
  };

  const sendRecording = async () => {
    const finished = await recorder.finish();

    if (!finished) {
      // `finish` already wrote the reason into `recorder.error`, which the
      // bar below is rendering; a toast on top of it would say it twice.
      recorder.reset();
      return;
    }

    /**
     * The last gate before the upload. The recorder stops itself at the
     * ceiling, so getting here with an oversized note means the timer was
     * starved by the tab being backgrounded — rare, and still better caught
     * here than by an API refusal after the bytes went up.
     */
    // Bytes, not just seconds. The duration is clamped at the ceiling, so a
    // recording that ran long while the tab was frozen arrives declaring two
    // minutes with more than two minutes of audio inside it — and the API
    // signs a ContentLength for voice notes, so storage refuses the PUT and
    // the operator is left with a failure that explains nothing. Checking
    // here turns that into a sentence, before anything is uploaded.
    if (finished.file.size > MAX_VOICE_NOTE_BYTES) {
      toast.error(
        "O áudio ficou maior que o limite de 2 MB. Grave um recado mais curto.",
      );

      recorder.reset();
      return;
    }

    const rejection = whyRecordingIsNotSendable(finished.durationMs);

    if (rejection) {
      recorder.reset();

      toast.error(
        rejection === "too-short"
          ? "Áudio muito curto — segure um instante a mais."
          : `O limite é de ${AUDIO_LIMIT_LABEL}. Grave um recado mais curto.`,
        { id: "chat-audio-rejected" },
      );

      return;
    }

    onSend({
      body: "",
      imageFiles: [],
      audio: { file: finished.file, durationMs: finished.durationMs },
    });

    recorder.reset();

    // A note that was interrupted and then sent has nothing left to explain;
    // the reason would otherwise stand above an empty composer and read as a
    // send that failed.
    recorder.clearError();

    onClearDeliveryChip();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const sendDisabled = !canWrite || (!text.trim() && images.length === 0);

  const micTooltip = !canWrite
    ? "Você precisa da permissão de escrita em Gerenciar Entregas"
    : !recorder.support.canRecord
      ? recorder.support.reason
      : "Gravar mensagem de voz";

  // ------------------------------------------------------ recording bar
  if (isRecording || isPaused || isCaptured) {
    // Only in the last stretch, so the sentence being spoken can be landed
    // instead of cut off in the middle of it.
    const countdown = isCaptured
      ? null
      : recordingCountdownSeconds(recorder.elapsedMs);

    return (
      <div ref={recordingBarRef} className="border-t bg-card p-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 text-muted-foreground"
            onClick={recorder.cancel}
            aria-label="Descartar gravação"
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  isRecording
                    ? "animate-pulse bg-destructive"
                    : "bg-muted-foreground",
                )}
              />
              <span className="truncate text-sm font-medium tabular-nums">
                {isCaptured
                  ? `Gravação de ${formatSecondsClock(
                      recorder.elapsedMs / 1000,
                    )}`
                  : isPaused
                    ? `Pausado em ${formatSecondsClock(
                        recorder.elapsedMs / 1000,
                      )}`
                    : `Gravando... ${formatSecondsClock(
                        recorder.elapsedMs / 1000,
                      )}`}
              </span>
            </div>

            {isCaptured ? (
              <p className="mt-0.5 text-xs text-muted-foreground" role="status">
                {/* The ceiling is no longer the only thing that parks a
                    recording, so it may no longer be the only explanation:
                    "limite atingido" over a note the microphone dropped at
                    eleven seconds blames the user for the hardware. */}
                {recorder.captureReason === "limit"
                  ? `Limite de ${AUDIO_LIMIT_LABEL} atingido. Envie ou descarte.`
                  : "Gravação encerrada. Envie o que já foi gravado ou descarte."}
              </p>
            ) : countdown !== null ? (
              <p
                className="mt-0.5 text-xs font-medium text-amber-600"
                role="status"
              >
                Faltam {countdown}s — conclua a frase.
              </p>
            ) : null}

            {recorder.error && (
              <p className="mt-0.5 text-xs text-destructive" role="alert">
                {recorder.error}
              </p>
            )}
          </div>

          {/* Pausar e continuar: at a desk a recording gets interrupted by a
              phone call, not abandoned. Gone once the ceiling closed it —
              there is nothing left to carry on with. */}
          {!isCaptured && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={isPaused ? recorder.resume : recorder.pause}
              aria-label={isPaused ? "Continuar gravação" : "Pausar gravação"}
            >
              {isPaused ? (
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              ) : (
                <Pause className="h-5 w-5 fill-current" />
              )}
            </Button>
          )}

          <Button
            type="button"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={isSendingRecording}
            onClick={() => void handleSendRecording()}
            aria-label="Enviar mensagem de voz"
          >
            <SendHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t bg-card p-3">
      {deliveryChip && (
        <div
          className="mb-2 flex w-fit max-w-full items-center gap-1.5
          rounded-full border bg-muted px-3 py-1 text-xs"
        >
          <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">
            Sobre a entrega: <strong>{deliveryChip.recipient_name}</strong>
          </span>
          <button
            type="button"
            onClick={onClearDeliveryChip}
            className="ml-1 rounded-full p-0.5 hover:bg-background"
            aria-label="Remover referência da entrega"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {images.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {images.length}/{MAX_CHAT_IMAGES}{" "}
              {images.length === 1 ? "imagem" : "imagens"}
            </span>

            <button
              type="button"
              onClick={clearImages}
              className="text-xs font-medium text-muted-foreground
              hover:text-foreground hover:underline"
            >
              Remover todas
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image) => (
              <div key={image.id} className="relative shrink-0">
                <Image
                  src={image.previewUrl}
                  alt="Pré-visualização da imagem"
                  width={80}
                  height={80}
                  unoptimized
                  className="h-20 w-20 rounded-lg border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  className="absolute -right-1.5 -top-1.5 rounded-full border
                  bg-background p-1 shadow-sm hover:bg-muted"
                  aria-label="Remover imagem"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {recorder.error && (
        <div
          className="mb-2 flex items-start gap-1.5 text-xs text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="min-w-0">{recorder.error}</p>
        </div>
      )}

      {pickErrors.length > 0 && (
        <div
          className="mb-2 flex items-start gap-1.5 text-xs text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0 space-y-0.5">
            {pickErrors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(event) => handlePickImages(event.target.files)}
        />

        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-muted-foreground"
                  disabled={!canWrite || images.length >= MAX_CHAT_IMAGES}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Anexar imagens"
                >
                  <ImagePlus className="h-5 w-5" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {!canWrite
                ? "Você precisa da permissão de escrita em Gerenciar Entregas"
                : images.length >= MAX_CHAT_IMAGES
                  ? `Limite de ${MAX_CHAT_IMAGES} imagens por envio`
                  : "Anexar imagens"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-muted-foreground"
                  disabled={
                    !canWrite ||
                    !recorder.support.canRecord ||
                    recorder.isStarting
                  }
                  onClick={handleStartRecording}
                  aria-label={
                    recorder.support.canRecord
                      ? "Gravar mensagem de voz"
                      : "Gravação de voz indisponível neste navegador"
                  }
                >
                  {/* A crossed-out microphone rather than a greyed-out one:
                      the button being off is the message, and the tooltip is
                      where the reason lives. */}
                  {recorder.support.canRecord ? (
                    <Mic className="h-5 w-5" />
                  ) : (
                    <MicOff className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{micTooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Textarea
          value={text}
          onChange={(event) => {
            setText(truncateText(event.target.value, MAX_MESSAGE_LENGTH));
            onTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            canWrite
              ? images.length > 0
                ? "Legenda (opcional)..."
                : "Escreva uma mensagem..."
              : "Sem permissão para enviar mensagens"
          }
          disabled={!canWrite}
          rows={1}
          className="max-h-28 min-h-[40px] w-full min-w-0 flex-1 resize-none"
          aria-label="Mensagem"
          aria-describedby={lengthNotice ? lengthId : undefined}
        />

        <Button
          type="button"
          size="icon"
          className={cn("h-10 w-10 shrink-0", sendDisabled && "opacity-60")}
          disabled={sendDisabled}
          onClick={handleSend}
          aria-label="Enviar mensagem"
        >
          <SendHorizontal className="h-5 w-5" />
        </Button>
      </div>

      {lengthNotice && (
        <p
          id={lengthId}
          className={cn(
            "mt-1 text-right text-xs tabular-nums",
            lengthNotice.limitMessage
              ? "text-red-600 dark:text-red-500"
              : "text-muted-foreground",
          )}
        >
          {/* Only the limit sentence is announced: a live count would be
              read out on every keystroke from 90% on. The region exists
              before the sentence arrives, so the arrival is announced. */}
          <span aria-live="polite">
            {lengthNotice.limitMessage ? `${lengthNotice.limitMessage} ` : ""}
          </span>
          {lengthNotice.count}
        </p>
      )}
    </div>
  );
};

export { ChatComposer };
export type { ComposerSubmission };
