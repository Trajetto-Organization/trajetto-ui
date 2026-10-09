import path from "node:path";

import { chromium, type Browser, type Page } from "@playwright/test";
// Already on disk as Vite's (and so Vitest's) own compiler; used here to hand
// the browser the real hook and player, not a copy of them.
import { build } from "esbuild";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SERVER_AUDIO_MIME_TYPES } from "@/features/deliveries/chat/lib/audio-recording";

import {
  BROWSER_STEP_TIMEOUT_MS,
  hasChromium,
} from "./helpers/measure-in-chromium";

/**
 * A voice note recorded and played back by the web chat, in a real browser
 * (CRIT-21).
 *
 * The recorder and the player were only ever checked through their pure
 * rules: the format negotiation, the ceiling, the scrub math. Nothing proved
 * that the hook, given a microphone, produces a file the API accepts, or that
 * the player plays it. Chromium's fake capture device stands in for the
 * microphone; the code is the real `useVoiceRecorder` and `ChatAudioPlayer`,
 * bundled as the app would ship them.
 *
 * The unit job in CI installs no browser, so the suite says it was skipped
 * rather than passing without recording anything.
 */
const UI = path.resolve(__dirname, "../..");

const HARNESS = `
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";

import { useVoiceRecorder } from "@/features/deliveries/chat/lib/use-voice-recorder";
import { ChatAudioPlayer } from "@/features/deliveries/chat/audio-player";

function Harness() {
  const recorder = useVoiceRecorder();
  const [note, setNote] = useState(null);

  useEffect(() => {
    window.__recorder = recorder;
  });

  useEffect(() => {
    window.__play = setNote;
  }, []);

  return note
    ? <ChatAudioPlayer src={note.url} durationMs={note.durationMs} isOwnSide />
    : null;
}

createRoot(document.getElementById("root")).render(<Harness />);
`;

interface CapturedSummary {
  type: string;
  name: string;
  size: number;
  durationMs: number;
}

declare global {
  interface Window {
    __recorder?: {
      support: { canRecord: boolean; reason: string };
      status: string;
      elapsedMs: number;
      error: string;
      start: () => Promise<boolean>;
      finish: () => Promise<{ file: File; durationMs: number } | null>;
    };
    __captured?: { file: File; durationMs: number };
    __streams?: MediaStream[];
    __play?: (note: { url: string; durationMs: number }) => void;
  }
}

describe.skipIf(!hasChromium)(
  "voice note in the web chat (Chromium, fake microphone; skipped without a browser)",
  () => {
    let browser: Browser;
    let page: Page;

    beforeAll(async () => {
      const bundle = await build({
        stdin: { contents: HARNESS, loader: "tsx", resolveDir: UI },
        bundle: true,
        write: false,
        format: "iife",
        platform: "browser",
        jsx: "automatic",
        tsconfig: path.join(UI, "tsconfig.json"),
        define: { "process.env.NODE_ENV": '"development"' },
        logLevel: "silent",
      });

      browser = await chromium.launch({
        args: [
          "--use-fake-device-for-media-stream",
          "--use-fake-ui-for-media-stream",
          "--autoplay-policy=no-user-gesture-required",
        ],
      });

      page = await browser.newPage();

      // Keeps every stream the page opens, to check the microphone is let go.
      await page.addInitScript(() => {
        const open = navigator.mediaDevices.getUserMedia.bind(
          navigator.mediaDevices,
        );

        window.__streams = [];
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          const stream = await open(constraints);
          window.__streams!.push(stream);
          return stream;
        };
      });

      // localhost is a secure context: the recorder refuses anything else.
      await page.route("http://localhost/harness.js", (route) =>
        route.fulfill({
          contentType: "text/javascript",
          body: bundle.outputFiles[0].text,
        }),
      );
      await page.route("http://localhost/chat-audio.html", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: '<!doctype html><html><body><div id="root"></div><script src="/harness.js"></script></body></html>',
        }),
      );

      await page.goto("http://localhost/chat-audio.html");
    }, 60_000);

    // Closing Chromium is a browser step too: under the full run it has
    // outlasted the 10 s hook default after the test itself had passed.
    afterAll(async () => {
      await browser?.close();
    }, BROWSER_STEP_TIMEOUT_MS);

    it("records a note the API accepts and plays it back", async () => {
      await page.waitForFunction(
        () =>
          window.__recorder?.support.reason !==
          "Verificando se este navegador pode gravar áudio...",
      );

      const support = await page.evaluate(() => window.__recorder!.support);

      expect(support, support.reason).toMatchObject({ canRecord: true });

      expect(await page.evaluate(() => window.__recorder!.start())).toBe(true);

      // Past the one-second floor, so the note is sendable.
      await page.waitForFunction(
        () => (window.__recorder?.elapsedMs ?? 0) >= 1_400,
        undefined,
        {
          timeout: 10_000,
        },
      );

      const captured = await page.evaluate(
        async (): Promise<CapturedSummary | string> => {
          const note = await window.__recorder!.finish();

          if (!note) return window.__recorder!.error || "nada gravado";

          window.__captured = note;

          return {
            type: note.file.type,
            name: note.file.name,
            size: note.file.size,
            durationMs: note.durationMs,
          };
        },
      );

      expect(typeof captured, String(captured)).toBe("object");

      const note = captured as CapturedSummary;

      // Signed with a type on the API's list, whatever the browser named it.
      expect(SERVER_AUDIO_MIME_TYPES as readonly string[]).toContain(note.type);
      expect(note.name).toBe("voice-note.m4a");
      expect(note.size).toBeGreaterThan(1_000);
      expect(note.durationMs).toBeGreaterThanOrEqual(1_000);
      expect(note.durationMs).toBeLessThan(10_000);

      // Parked on the send button, with the microphone let go: every track
      // it opened has ended (the light next to the camera is off).
      await page.waitForFunction(
        () => window.__recorder?.status === "captured",
      );

      expect(
        await page.evaluate(() =>
          window.__streams!.flatMap((stream) =>
            stream.getTracks().map((track) => track.readyState),
          ),
        ),
      ).toEqual(["ended"]);

      await page.evaluate(() =>
        window.__play!({
          url: URL.createObjectURL(window.__captured!.file),
          durationMs: window.__captured!.durationMs,
        }),
      );

      await page.getByRole("button", { name: "Reproduzir áudio" }).click();

      // It actually plays: the element moves, and ends by itself.
      await page.waitForFunction(
        () => (document.querySelector("audio")?.currentTime ?? 0) > 0.3,
        undefined,
        { timeout: 10_000 },
      );

      await page.getByRole("button", { name: "Reproduzir áudio" }).waitFor({
        timeout: 10_000,
      });

      const player = await page.evaluate(() => ({
        broken:
          document.body.textContent?.includes(
            "Não foi possível carregar o áudio.",
          ) ?? false,
        duration: document.querySelector("audio")?.duration ?? 0,
        max: Number(
          document
            .querySelector('[role="slider"]')
            ?.getAttribute("aria-valuemax") ?? "0",
        ),
      }));

      expect(player.broken).toBe(false);

      // The file's own length agrees with what was declared to the server.
      expect(Math.abs(player.duration * 1000 - note.durationMs)).toBeLessThan(
        750,
      );
      expect(player.max).toBeGreaterThanOrEqual(1);
    }, 60_000);
  },
);
