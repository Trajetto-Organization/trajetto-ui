const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

/**
 * Shrinks a photo in the browser before it is added to a FormData.
 *
 * Why this exists: a checklist can carry up to twenty photos, and a phone
 * camera produces 3-5 MB files. Sent untouched that is a 60-100 MB request,
 * which nothing in the chain is prepared for — and the resolution is far
 * beyond what the app ever displays. Resized to 1600px and re-encoded to WebP
 * the same photo lands around 200-400 KB with no visible loss at the sizes it
 * is actually rendered at.
 *
 * Returns the ORIGINAL file whenever the result would not be an improvement:
 * a file that is already small, a format that should not be re-encoded, or any
 * failure along the way. Compression is an optimisation, never a gate — it
 * must not be the reason an upload fails.
 */
async function compressImage(file: File): Promise<File> {
  const isCompressible = /^image\/(jpeg|jpg|png|webp)$/.test(file.type);

  // Below this the re-encode usually costs more than it saves.
  if (!isCompressible || file.size < 300 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);

    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", QUALITY);
    });

    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

export { compressImage };
