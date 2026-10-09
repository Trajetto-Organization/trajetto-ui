"use client";

import dynamic from "next/dynamic";

/**
 * The delivery detail (timeline, proof viewer, chat links: ~15 KB gzipped)
 * as its own chunk. Every caller mounts it only while it is open, so the
 * tables and the chat load it on the first click instead of on page load.
 */
const DeliveryDetailDialog = dynamic(
  () => import("./index").then((module) => module.DeliveryDetailDialog),
  { ssr: false },
);

export { DeliveryDetailDialog };
