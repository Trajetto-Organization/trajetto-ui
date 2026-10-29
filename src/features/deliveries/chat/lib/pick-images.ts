/** Images per send. Ten is a batch; past that it is a file transfer. */
const MAX_CHAT_IMAGES = 10;

/** Per file, matching the checklist ceiling the whole app already uses. */
const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_CHAT_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

interface PickedImagesResult {
  /** The files that made it in, in the order they were chosen. */
  accepted: File[];

  /**
   * One line per reason something was refused, already written for the user.
   * Empty when everything was taken.
   */
  errors: string[];
}

const MAX_MEGABYTES = Math.round(MAX_CHAT_IMAGE_BYTES / 1024 / 1024);

/**
 * Decides which of the chosen files go into the composer, and says out loud
 * what happened to the rest.
 *
 * Three refusals, three separate sentences: a file that is not an image, a
 * file that is too heavy and a file that simply did not fit under the batch
 * limit are different problems, and collapsing them into "arquivo inválido"
 * leaves the user guessing which of their fifteen photos to fix.
 *
 * Nothing is ever dropped in silence — picking fifteen images and watching
 * ten appear, with no explanation, reads as a bug every time.
 *
 * Pure on purpose: no React, no toasts, no clock. It is the one piece of
 * this feature worth reasoning about on its own.
 */
function selectChatImages(
  incoming: File[],
  alreadyPicked: number,
): PickedImagesResult {
  const errors: string[] = [];

  const wellTyped = incoming.filter((file) =>
    ALLOWED_CHAT_IMAGE_TYPES.includes(file.type),
  );

  const wrongType = incoming.length - wellTyped.length;

  if (wrongType > 0) {
    errors.push(
      wrongType === 1
        ? "1 arquivo não é uma imagem válida — aceitamos JPEG, PNG ou WebP."
        : `${wrongType} arquivos não são imagens válidas — aceitamos JPEG, PNG ou WebP.`,
    );
  }

  const wellSized = wellTyped.filter(
    (file) => file.size <= MAX_CHAT_IMAGE_BYTES,
  );

  const tooLarge = wellTyped.length - wellSized.length;

  if (tooLarge > 0) {
    errors.push(
      tooLarge === 1
        ? `1 imagem passa de ${MAX_MEGABYTES} MB e ficou de fora.`
        : `${tooLarge} imagens passam de ${MAX_MEGABYTES} MB e ficaram de fora.`,
    );
  }

  const remainingSlots = Math.max(MAX_CHAT_IMAGES - alreadyPicked, 0);
  const accepted = wellSized.slice(0, remainingSlots);

  const overflow = wellSized.length - accepted.length;

  if (overflow > 0) {
    errors.push(
      accepted.length === 0
        ? `Você já selecionou ${alreadyPicked} imagens — o limite é ${MAX_CHAT_IMAGES} por envio.`
        : `São no máximo ${MAX_CHAT_IMAGES} imagens por envio: ${accepted.length} ${
            accepted.length === 1 ? "entrou" : "entraram"
          } e ${overflow} ${overflow === 1 ? "ficou" : "ficaram"} de fora.`,
    );
  }

  return { accepted, errors };
}

export {
  selectChatImages,
  MAX_CHAT_IMAGES,
  MAX_CHAT_IMAGE_BYTES,
  ALLOWED_CHAT_IMAGE_TYPES,
};
export type { PickedImagesResult };
