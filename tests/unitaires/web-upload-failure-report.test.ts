import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * OBS-12: a browser upload goes straight to the bucket, so when the bucket
 * refused it (a rotated credential, a CORS rule gone) only the person at the
 * screen knew: neither the web server nor the API saw a thing. A failed PUT
 * is now reported — status and storage host, never the signed URL — through a
 * server action to the API's /diagnostics/client, fire-and-forget: the report
 * never delays or changes the error the form shows.
 */
const report = vi.fn(async (_input: unknown) => undefined);

vi.mock("@/actions/diagnostics/report-client-diagnostics", () => ({
  handleReportClientDiagnostics: (input: unknown) => report(input),
}));

const SIGNED_URL =
  "https://acc.r2.cloudflarestorage.com/trajetto/checklistPhotos/b/1.jpg?X-Amz-Signature=segredo";

vi.mock("@/actions/upload/create-presigned-uploads", () => ({
  handleCreatePresignedUploads: async ({ files }: { files: unknown[] }) => ({
    uploads: files.map((_file, index) => ({
      key: `checklistPhotos/b/${index + 1}.jpg`,
      uploadUrl: SIGNED_URL,
      expiresIn: 300,
    })),
  }),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  report.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function upload() {
  const { uploadToStorage } = await import("@/lib/upload-to-storage");

  return uploadToStorage({
    entries: [{ file: new File(["x"], "1.jpg", { type: "image/jpeg" }) }],
    uploadType: "checklistPhotos",
    businessId: "b",
  });
}

describe("a browser upload the bucket refused", () => {
  it("is reported with its status and host, and still fails as before", async () => {
    fetchMock.mockResolvedValue(
      new Response("SignatureDoesNotMatch", { status: 403 }),
    );

    await expect(upload()).rejects.toThrow(/Falha ao enviar a imagem "1.jpg"/);

    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith({
      errors: [
        expect.objectContaining({
          kind: "upload",
          status: 403,
          host: "acc.r2.cloudflarestorage.com",
        }),
      ],
    });
    expect(JSON.stringify(report.mock.calls)).not.toContain("segredo");
  });

  it("is reported as a network failure when the PUT never got an answer", async () => {
    // What a CORS refusal or a dropped connection looks like from fetch.
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(upload()).rejects.toThrow();

    expect(report).toHaveBeenCalledWith({
      errors: [
        expect.objectContaining({
          kind: "network",
          host: "acc.r2.cloudflarestorage.com",
        }),
      ],
    });
  });

  it("is not reported when the upload works", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(upload()).resolves.toEqual([
      { key: "checklistPhotos/b/1.jpg" },
    ]);

    expect(report).not.toHaveBeenCalled();
  });

  it("is reported once per upload, not once per photo that failed with it", async () => {
    // A bucket that refuses one photo refuses all of them. Each report is an
    // API call from a budget of 30 an hour per user: one checklist must not
    // spend it.
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));

    const { uploadToStorage } = await import("@/lib/upload-to-storage");

    await expect(
      uploadToStorage({
        entries: Array.from({ length: 6 }, (_, index) => ({
          file: new File(["x"], `${index + 1}.jpg`, { type: "image/jpeg" }),
        })),
        uploadType: "checklistPhotos",
        businessId: "b",
      }),
    ).rejects.toThrow(/Falha ao enviar a imagem/);

    expect(report).toHaveBeenCalledTimes(1);
  });

  it("never lets a failing report change the upload's error", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    report.mockRejectedValueOnce(new Error("report failed"));

    await expect(upload()).rejects.toThrow(/Falha ao enviar a imagem/);
  });
});
