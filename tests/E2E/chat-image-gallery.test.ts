import { test, expect } from "@playwright/test";

import {
  buildImageGallery,
  canStepGallery,
  clampGalleryIndex,
  findGalleryIndex,
  formatGalleryCounter,
  galleryKeyOf,
  galleryWindowIndices,
  stepGalleryKey,
} from "../../src/features/deliveries/chat/lib/image-gallery";

import type { ClientChatMessage } from "../../src/features/deliveries/chat/lib/types";

const BASE = "2026-09-08T12:00:00.000Z";

/** A message as the conversation holds it, with only what matters here. */
const message = (
  overrides: Partial<ClientChatMessage> & { id: string },
): ClientChatMessage => ({
  kind: "IMAGE",
  body: null,
  attachment_url: `https://signed.example/${overrides.id}.jpg`,
  duration_ms: null,
  deliveryId: null,
  broadcast_id: null,
  client_submission_id: null,
  threadId: "thread-1",
  senderId: "driver-1",
  sender: { id: "driver-1", name: "João da Silva" },
  delivery: null,
  created_at: BASE,
  ...overrides,
});

test.describe("buildImageGallery", () => {
  test("keeps only photos, in the order the screen renders them", () => {
    const photos = buildImageGallery([
      message({ id: "a" }),
      message({ id: "t1", kind: "TEXT", attachment_url: null, body: "oi" }),
      message({ id: "b" }),
      message({ id: "v1", kind: "AUDIO", duration_ms: 4_000 }),
      message({ id: "c" }),
    ]);

    expect(photos.map((photo) => photo.key)).toEqual(["a", "b", "c"]);
  });

  test("drops an image message that has no attachment", () => {
    const photos = buildImageGallery([
      message({ id: "a" }),
      message({ id: "broken", attachment_url: null }),
    ]);

    expect(photos.map((photo) => photo.key)).toEqual(["a"]);
  });

  test("carries each photo's own caption, sender and clock", () => {
    const [first, second] = buildImageGallery([
      message({ id: "a" }),
      message({
        id: "b",
        body: "chegou tudo certo",
        created_at: "2026-09-08T12:00:30.000Z",
        sender: { id: "agent-1", name: "Ana" },
      }),
    ]);

    // The composer puts the caption on the last message of a batch, so the
    // earlier photos of an album really do have none. That is the honest
    // answer per photo, and it is not the album's caption.
    expect(first.caption).toBeNull();
    expect(second.caption).toBe("chegou tudo certo");

    expect(second.senderName).toBe("Ana");
    expect(second.createdAt).toBe("2026-09-08T12:00:30.000Z");
  });

  test("lets a photo still going out — or one that failed — into the gallery", () => {
    const photos = buildImageGallery([
      message({
        id: "local-1",
        client_submission_id: "sub-1",
        attachment_url: "blob:https://app.example/abc",
        pending: true,
      }),
      message({
        id: "local-2",
        client_submission_id: "sub-2",
        attachment_url: "blob:https://app.example/def",
        failed: true,
      }),
    ]);

    expect(photos.map((photo) => photo.key)).toEqual(["sub-1", "sub-2"]);

    expect(photos[0].pending).toBe(true);
    expect(photos[0].failed).toBe(false);

    expect(photos[1].pending).toBe(false);
    expect(photos[1].failed).toBe(true);
  });
});

test.describe("galleryKeyOf", () => {
  test("prefers the submission id, which survives the send confirming", () => {
    const optimistic = message({
      id: "local-9d2f",
      client_submission_id: "sub-9d2f",
      attachment_url: "blob:https://app.example/abc",
      pending: true,
    });

    // The server replaces the message in place: the id changes, the URL goes
    // from a blob to a signed link — and only this field is the same one.
    const confirmed = message({
      id: "srv-77",
      client_submission_id: "sub-9d2f",
      attachment_url: "https://signed.example/srv-77.jpg",
    });

    expect(galleryKeyOf(optimistic)).toBe(galleryKeyOf(confirmed));
  });

  test("falls back to the id when there is no submission id", () => {
    expect(galleryKeyOf(message({ id: "srv-1" }))).toBe("srv-1");
  });

  test("holds a viewer's place across the optimistic → confirmed swap", () => {
    const before = buildImageGallery([
      message({ id: "srv-1" }),
      message({
        id: "local-9d2f",
        client_submission_id: "sub-9d2f",
        attachment_url: "blob:https://app.example/abc",
        pending: true,
      }),
    ]);

    const after = buildImageGallery([
      message({ id: "srv-1" }),
      message({ id: "srv-2", client_submission_id: "sub-9d2f" }),
    ]);

    const key = before[1].key;

    expect(findGalleryIndex(after, key)).toBe(1);
    expect(after[1].url).toBe("https://signed.example/srv-2.jpg");
  });
});

test.describe("findGalleryIndex", () => {
  const photos = buildImageGallery([
    message({ id: "a" }),
    message({ id: "b" }),
    message({ id: "c" }),
  ]);

  test("answers the position of a photo that is still there", () => {
    expect(findGalleryIndex(photos, "b")).toBe(1);
  });

  test("answers -1 for nothing and for a photo that has gone", () => {
    expect(findGalleryIndex(photos, null)).toBe(-1);
    expect(findGalleryIndex(photos, "z")).toBe(-1);
    expect(findGalleryIndex([], "a")).toBe(-1);
  });

  test("survives a page of older messages landing in front", () => {
    const older = buildImageGallery([
      message({ id: "old-1" }),
      message({ id: "old-2" }),
      message({ id: "a" }),
      message({ id: "b" }),
      message({ id: "c" }),
    ]);

    // The index moved by two; the identity did not move at all.
    expect(findGalleryIndex(photos, "b")).toBe(1);
    expect(findGalleryIndex(older, "b")).toBe(3);
  });
});

test.describe("clampGalleryIndex", () => {
  test("pulls anything into the list", () => {
    expect(clampGalleryIndex(-4, 3)).toBe(0);
    expect(clampGalleryIndex(1, 3)).toBe(1);
    expect(clampGalleryIndex(9, 3)).toBe(2);
  });

  test("answers -1 for an empty gallery", () => {
    expect(clampGalleryIndex(0, 0)).toBe(-1);
    expect(clampGalleryIndex(2, -1)).toBe(-1);
  });

  test("does not trip over a number that is not one", () => {
    expect(clampGalleryIndex(Number.NaN, 3)).toBe(0);
    expect(clampGalleryIndex(Number.POSITIVE_INFINITY, 3)).toBe(0);
  });
});

test.describe("canStepGallery", () => {
  test("knows both ends of the gallery", () => {
    expect(canStepGallery(0, 3, -1)).toBe(false);
    expect(canStepGallery(0, 3, 1)).toBe(true);

    expect(canStepGallery(2, 3, 1)).toBe(false);
    expect(canStepGallery(2, 3, -1)).toBe(true);
  });

  test("a single photo has nowhere to go, either way", () => {
    expect(canStepGallery(0, 1, -1)).toBe(false);
    expect(canStepGallery(0, 1, 1)).toBe(false);
  });

  test("says no when there is no gallery, or no place in it", () => {
    expect(canStepGallery(0, 0, 1)).toBe(false);
    expect(canStepGallery(-1, 3, 1)).toBe(false);
    expect(canStepGallery(3, 3, -1)).toBe(false);
  });
});

test.describe("stepGalleryKey", () => {
  const photos = buildImageGallery([
    message({ id: "a" }),
    message({ id: "b" }),
    message({ id: "c" }),
  ]);

  test("walks the gallery one photo at a time", () => {
    expect(stepGalleryKey(photos, "a", 1)).toBe("b");
    expect(stepGalleryKey(photos, "b", 1)).toBe("c");
    expect(stepGalleryKey(photos, "c", -1)).toBe("b");
  });

  test("never wraps around: an end is an end", () => {
    expect(stepGalleryKey(photos, "a", -1)).toBe("a");
    expect(stepGalleryKey(photos, "c", 1)).toBe("c");
  });

  test("holds still under a burst of clicks on the arrow at an end", () => {
    let key: string | null = "b";

    // Ten clicks on "next" from the middle of a gallery of three: the reader
    // ends on the last photo, and not two photos past the end of the list.
    for (let click = 0; click < 10; click += 1) {
      key = stepGalleryKey(photos, key, 1);
    }

    expect(key).toBe("c");
    expect(findGalleryIndex(photos, key)).toBe(2);
  });

  test("a burst that changes direction lands where it should", () => {
    const keys = [1, 1, 1, 1, -1, -1, -1, -1].reduce<string | null>(
      (key, delta) => stepGalleryKey(photos, key, delta),
      "a",
    );

    expect(keys).toBe("a");
  });

  test("answers nothing for a photo that is no longer in the list", () => {
    expect(stepGalleryKey(photos, "gone", 1)).toBeNull();
    expect(stepGalleryKey(photos, null, 1)).toBeNull();
    expect(stepGalleryKey([], "a", 1)).toBeNull();
  });
});

test.describe("galleryWindowIndices", () => {
  test("mounts the current photo and its two neighbours", () => {
    expect(galleryWindowIndices(5, 300)).toEqual([4, 5, 6]);
  });

  test("clips at the ends instead of padding", () => {
    expect(galleryWindowIndices(0, 3)).toEqual([0, 1]);
    expect(galleryWindowIndices(2, 3)).toEqual([1, 2]);
  });

  test("never grows with the gallery", () => {
    for (const index of [0, 1, 150, 298, 299]) {
      expect(galleryWindowIndices(index, 300).length).toBeLessThanOrEqual(3);
    }
  });

  test("a single photo mounts alone", () => {
    expect(galleryWindowIndices(0, 1)).toEqual([0]);
  });

  test("answers nothing when there is nothing to show", () => {
    expect(galleryWindowIndices(0, 0)).toEqual([]);
    expect(galleryWindowIndices(-1, 3)).toEqual([]);
    expect(galleryWindowIndices(3, 3)).toEqual([]);
  });
});

test.describe("formatGalleryCounter", () => {
  test("counts from one, the way a reader does", () => {
    expect(formatGalleryCounter(0, 12)).toBe("1 / 12");
    expect(formatGalleryCounter(2, 12)).toBe("3 / 12");
    expect(formatGalleryCounter(11, 12)).toBe("12 / 12");
  });

  test("says nothing when there is nothing to count", () => {
    expect(formatGalleryCounter(-1, 12)).toBe("");
    expect(formatGalleryCounter(0, 0)).toBe("");
    expect(formatGalleryCounter(12, 12)).toBe("");
  });
});
