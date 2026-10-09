import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The provider removes its own socket listeners, and only those.
 *
 * The socket is a module singleton shared by the whole app. `socket.off(event)`
 * without the handler removes EVERY listener of that event — so the provider's
 * cleanup used to take the socket module's own status listener and the room
 * rejoin of every operations and chat subscription with it (for `connect`),
 * and would do the same to anything else that ever listens to a security,
 * notification or module event. Each `off` has to name what it removes.
 */
const source = readFileSync(
  resolve(
    process.cwd(),
    "src/app/(protected)/_components/layout/protected-provider/notifications-provider/index.tsx",
  ),
  "utf8",
);

describe("the notifications provider's socket cleanup", () => {
  it("never removes every listener of an event", () => {
    const bare = source.match(/\.off\(\s*"[^"]+"\s*\)/g) ?? [];

    expect(bare).toEqual([]);
  });

  it.each([
    "pushNotification",
    "securityAction",
    "aiVerification",
    "entitlementsChanged",
    "connect",
    "disconnect",
  ])("removes %s by its handler", (event) => {
    expect(source).toMatch(new RegExp(`\\.off\\(\\s*"${event}",\\s*\\w+`));
  });
});
