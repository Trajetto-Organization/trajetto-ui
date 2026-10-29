/**
 * The images one row of the Ocorrências feed shows, in reading order.
 *
 * A DELIVERED row (decision 14.3) is a proof: the receipt ("canhoto") and
 * the on-screen signature come first, because they are what proves it; the
 * extra photos follow. A problem row, or an API older than the fields, has
 * only its photos. The URLs are the API's short-lived signed links.
 */
interface OccurrenceImage {
  url: string;
  label: string;

  /** A signature is a drawing on white: shown whole, not cropped. */
  contain: boolean;
}

function occurrenceImages(row: {
  photos: string[];
  receipt_photo?: string | null;
  signature?: string | null;
}): OccurrenceImage[] {
  const images: OccurrenceImage[] = [];

  if (row.receipt_photo) {
    images.push({ url: row.receipt_photo, label: "Canhoto", contain: false });
  }

  if (row.signature) {
    images.push({ url: row.signature, label: "Assinatura", contain: true });
  }

  row.photos.forEach((url, index) => {
    images.push({ url, label: `Foto ${index + 1}`, contain: false });
  });

  return images;
}

export { occurrenceImages };
export type { OccurrenceImage };
