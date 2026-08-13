const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

/**
 * Shrinks a photo in the browser and strips its metadata.
 *
 * Why this exists: a checklist can carry up to twenty photos, and a phone
 * camera produces 3-5 MB files. Sent untouched that is 60-100 MB, and the
 * resolution is far beyond what the app ever displays. Resized to 1600px and
 * re-encoded to WebP the same photo lands around 200-400 KB with no visible
 * loss at the sizes it is actually rendered at.
 *
 * It also does something the size numbers do not show. A camera JPEG carries
 * EXIF, and EXIF carries GPS coordinates. That used to be stripped server-side
 * by Sharp while the image was re-encoded; with direct-to-storage uploads the
 * bytes never reach the API, so this canvas round trip — which keeps only
 * pixels — is now the only thing between a photo's location data and the
 * bucket. That is why it runs for every image regardless of size, and why the
 * result is kept even when it is not smaller.
 *
 * Returns the ORIGINAL only when the file is not an image we can re-encode, or
 * when something fails along the way: compression must not be the reason an
 * upload fails.
 */
async function compressImage(file: File): Promise<File> {
  const isCompressible = /^image\/(jpeg|jpg|png|webp)$/.test(file.type);

  if (!isCompressible) return file;

  try {
    // Explicit rather than relying on the default: the bitmap must already have
    // EXIF rotation applied, because the orientation tag is about to be thrown
    // away with the rest of the metadata.
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });

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

    // Deliberately not "keep whichever is smaller". For an already-small image
    // the re-encode can come out slightly larger, and returning the original
    // there would hand back the very metadata this call exists to remove.
    if (!blob) return file;

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
