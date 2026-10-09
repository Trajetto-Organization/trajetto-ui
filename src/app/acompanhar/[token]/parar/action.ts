"use server";

import { headers } from "next/headers";

import { apiForwardingHeaders } from "@/lib/api-forwarding";
import { logActionError } from "@/lib/log-action-error";
import { isPublicToken } from "@/lib/public-token";

/**
 * Asks the API to stop messaging this recipient.
 *
 * No cookie and no token header: this page is opened by somebody with no
 * account, and the tracking token in the URL is the whole authorisation.
 *
 * Returns whether the request REACHED the API — nothing about whether the
 * token was real. The API answers the same sentence either way, so there is no
 * oracle in reporting a network failure: it happens identically for a valid
 * link and an invented one, and the person whose request never landed is the
 * one person who genuinely needs to try again.
 */
const stopDeliveryMessages = async (token: string): Promise<boolean> => {
  // A server action takes any argument its caller sends, and URL parsing
  // resolves `..`: an unchecked token let a stranger aim this server's POST at
  // any API route (`../../user/session?`). The API would answer a malformed
  // token with a 4xx, which already reads as "reached, nothing to do".
  if (!isPublicToken(token)) return true;

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/public/track/${token}/opt-out`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Public route limited per address: say which visitor this is for.
          ...apiForwardingHeaders(headers()),
        },
        cache: "no-store",
      },
    );

    // 4xx here is a malformed token, which the person cannot fix and which the
    // API treats as "nothing to do" anyway. Only a request that never got an
    // answer is worth telling them about.
    return response.status < 500;
  } catch (error) {
    // The web losing the API is exactly what this log exists for (OBS-12);
    // the token in the URL is masked by the helper.
    logActionError("acompanhar/parar", error);
    return false;
  }
};

export { stopDeliveryMessages };
