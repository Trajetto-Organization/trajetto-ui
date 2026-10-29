"use client";

import { Mic } from "lucide-react";

import { cn } from "@/lib/utils";

import { HintBubble } from "./hint-bubble";

/**
 * The bars of the little waveform, written out rather than generated.
 *
 * Each one keeps a height of its own AND a delay of its own. The heights
 * are what make it a waveform instead of an equalizer of identical sticks,
 * and they are also what survives `prefers-reduced-motion`: with the
 * animation dropped, the shape still reads as sound rather than collapsing
 * into five equal marks.
 *
 * The classes are whole literals on purpose — Tailwind reads this file as
 * text, and a class assembled from a variable is a class that never gets
 * generated.
 */
const WAVE_BAR_CLASSES = [
  "h-2",
  "h-3.5 [animation-delay:120ms]",
  "h-5 [animation-delay:240ms]",
  "h-3.5 [animation-delay:360ms]",
  "h-2 [animation-delay:480ms]",
];

interface RecordingBubbleProps {
  /** Drives the whole thing: the element stays mounted so it can fade out. */
  isRecording: boolean;
}

/**
 * The bubble at the foot of the conversation while the driver records a
 * voice note.
 *
 * Deliberately NOT the three dots with another label. The reader is being
 * told two different things — words are coming, or a voice is coming — and
 * the second one carries a wait of up to two minutes; a shape that has to
 * be read twice to tell which one it is would be worth less than nothing. A
 * breathing microphone over a moving waveform says "voz" before any label
 * is read, which is the whole job.
 *
 * The red is the same `destructive` the composer's own recording bar uses:
 * recording is one colour in this product, whichever end of the line it is
 * happening on.
 */
const RecordingBubble = ({
  isRecording,
}: RecordingBubbleProps): JSX.Element => (
  <HintBubble isOpen={isRecording} label="O motorista está gravando um áudio">
    <Mic
      className="mr-0.5 h-4 w-4 shrink-0 text-destructive
      animate-pulse-scale motion-reduce:animate-none"
    />

    {/* The bars carry a gap of their own, tighter than the one the shell
        puts between the microphone and them: a waveform is a shape, and
        bars spaced as far apart as the typing dots read as an equalizer. */}
    <span className="flex items-center gap-[3px]">
      {WAVE_BAR_CLASSES.map((barClass) => (
        <span
          key={barClass}
          className={cn(
            `w-1 shrink-0 origin-center rounded-full bg-destructive/70
            animate-recording-wave [animation-fill-mode:both]
            motion-reduce:animate-none`,
            barClass,
          )}
        />
      ))}
    </span>
  </HintBubble>
);

export { RecordingBubble };
