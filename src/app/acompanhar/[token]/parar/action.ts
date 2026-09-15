"use server";

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
  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/public/track/${token}/opt-out`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      },
    );

    // 4xx here is a malformed token, which the person cannot fix and which the
    // API treats as "nothing to do" anyway. Only a request that never got an
    // answer is worth telling them about.
    return response.status < 500;
  } catch (error) {
    return false;
  }
};

export { stopDeliveryMessages };
