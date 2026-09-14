/**
 * How wide a bubble carrying media is — and, with it, how wide its caption
 * gets to be.
 *
 * The WhatsApp rule: in a bubble with media the media owns the width and the
 * text wraps inside it. The inverse — letting the caption size the box — is
 * what leaves a long message stretching the balloon past its own grid, with
 * the thumbnails huddled on the left and dead space on the right.
 *
 * So every element that could measure itself against its own content instead
 * declares this width: the album grid, the single photo, and the caption
 * under either of them. `max-w-full` keeps it honest on a narrow phone,
 * where the bubble's 85% cap wins.
 */
const MEDIA_BUBBLE_WIDTH_CLASS = "w-[280px] max-w-full";

export { MEDIA_BUBBLE_WIDTH_CLASS };
