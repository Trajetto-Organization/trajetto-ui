import { describe, expect, it, vi } from "vitest";

import { parseNDJSON } from "@/lib/parse-nd-json";

/**
 * The import report, read off a stream.
 *
 * Uploading a day's spreadsheet answers with one JSON object per line: an
 * envelope first, then a row per delivery saying imported, duplicated or
 * rejected and why. It is a stream because a thousand-row file should start
 * showing results before it finishes, and that is exactly what makes it
 * fragile — the chunks a network hands over have nothing to do with where the
 * lines are.
 *
 * A dropped line here is not a crash. It is a dispatcher reading "998
 * importadas" for a file with 1000 rows, with no indication that two are
 * missing, and going looking for deliveries that the report never mentioned.
 */
function streamOf(chunks: string[]): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });

  return new Response(body);
}

const META = JSON.stringify({ meta: { total: 3 } });

const rowOf = (line: number) => JSON.stringify({ line, status: "imported" });

describe("a well-behaved stream", () => {
  it("separates the envelope from the rows", async () => {
    const result = await parseNDJSON(
      streamOf([`${META}\n${rowOf(1)}\n${rowOf(2)}\n`]),
    );

    expect(result.meta).toEqual({ total: 3 });
    expect(result.data).toHaveLength(2);
    expect(result.data.map((row) => row.line)).toEqual([1, 2]);
  });

  it("keeps the last row when the stream ends without a newline", async () => {
    // Nothing guarantees a trailing newline, and the last row of an import is
    // as real as the first.
    const result = await parseNDJSON(
      streamOf([`${META}\n${rowOf(1)}\n${rowOf(2)}`]),
    );

    expect(result.data).toHaveLength(2);
  });
});

describe("a stream chopped in the wrong places", () => {
  it("rejoins a line split across two chunks", async () => {
    /**
     * The bug this function exists to prevent.
     *
     * Chunk boundaries fall wherever the network puts them, so a row arrives
     * in halves more or less constantly on a slow connection. Parsing each
     * chunk on its own throws on both halves and drops the row — and because
     * the failure is caught and logged, the report simply comes back one row
     * short with nothing on screen to say so.
     */
    const row = rowOf(7);
    const cut = Math.floor(row.length / 2);

    const result = await parseNDJSON(
      streamOf([`${META}\n${row.slice(0, cut)}`, `${row.slice(cut)}\n`]),
    );

    expect(result.meta).toEqual({ total: 3 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].line).toBe(7);
  });

  it("survives a chunk that ends exactly on the newline", async () => {
    const result = await parseNDJSON(
      streamOf([`${META}\n`, `${rowOf(1)}\n`, `${rowOf(2)}\n`]),
    );

    expect(result.data).toHaveLength(2);
  });

  it("survives one byte at a time", async () => {
    // The pathological case, and the cheapest way to prove the buffer carries
    // correctly rather than happening to line up.
    const text = `${META}\n${rowOf(1)}\n${rowOf(2)}\n`;

    const result = await parseNDJSON(streamOf(text.split("")));

    expect(result.meta).toEqual({ total: 3 });
    expect(result.data).toHaveLength(2);
  });
});

describe("a stream with something wrong in it", () => {
  it("skips a broken line instead of losing the whole report", async () => {
    // One malformed row must not cost the dispatcher the other 999.
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await parseNDJSON(
      streamOf([`${META}\n{ nao e json\n${rowOf(2)}\n`]),
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0].line).toBe(2);
    expect(errors).toHaveBeenCalled();

    errors.mockRestore();
  });

  it("ignores blank lines", async () => {
    const result = await parseNDJSON(
      streamOf([`${META}\n\n${rowOf(1)}\n\n\n`]),
    );

    expect(result.data).toHaveLength(1);
  });

  it("answers with no envelope rather than throwing when there is none", async () => {
    // A stream that fails before the envelope is written still has to return
    // something the caller can render an error from.
    const result = await parseNDJSON(streamOf([`${rowOf(1)}\n`]));

    expect(result.meta).toBeNull();
    expect(result.data).toHaveLength(1);
  });

  it("says so when the body cannot be streamed at all", async () => {
    await expect(
      parseNDJSON({ body: null } as unknown as Response),
    ).rejects.toThrow("ReadableStream");
  });
});
