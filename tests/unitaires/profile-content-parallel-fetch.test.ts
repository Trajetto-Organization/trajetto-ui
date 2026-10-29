// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { React } from "./helpers/render-html";

void React;

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

// The client forms under the tabs are not what is measured here.
vi.mock("@/app/(protected)/_components/profile/account/avatar-upload", () => ({
  AvatarUpload: () => null,
}));
vi.mock("@/app/(protected)/_components/profile/account/user-name-form", () => ({
  UserNameForm: () => null,
}));
vi.mock(
  "@/app/(protected)/_components/profile/account/user-password-form",
  () => ({
    UserPasswordForm: () => null,
  }),
);
vi.mock(
  "@/app/(protected)/_components/profile/account/user-two-factor-authentication",
  () => ({
    UserTwoFactorAuthentication: () => null,
  }),
);
vi.mock(
  "@/app/(protected)/_components/profile/notifications/whatsapp/whatsapp-notifications",
  () => ({
    WhatsAppNotifications: () => null,
  }),
);
vi.mock(
  "@/app/(protected)/_components/profile/notifications/preferences",
  () => ({
    NotificationPreferences: () => null,
  }),
);

import { ProfileContent } from "@/app/(protected)/profile/profile-content";

/**
 * Meu Perfil read the session, then the WhatsApp settings, then the
 * notification preferences: three API round trips in series, although the
 * last two need only the token.
 */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const ME = {
  user: {
    email: "a@b.c",
    name: "Ana",
    role: "BUSINESS_ADMIN",
    two_factor_enabled: false,
  },
};

beforeEach(() => {
  vi.stubEnv("HTTP_REQUEST", "http://api.test");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("ProfileContent", () => {
  it("asks for the three reads at once", async () => {
    let answerMe: (response: Response) => void = () => undefined;
    const requested: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        requested.push(new URL(url).pathname);

        if (url.endsWith("/user/me")) {
          return new Promise<Response>((resolve) => {
            answerMe = resolve;
          });
        }

        return Promise.resolve(
          new Response(JSON.stringify({ data: null, preferences: [] }), {
            status: 200,
          }),
        );
      }),
    );

    const rendering = ProfileContent({ token: "t" });

    await tick();

    expect([...requested].sort()).toEqual([
      "/notification/preferences",
      "/user/me",
      "/whatsapp/settings",
    ]);

    answerMe(new Response(JSON.stringify(ME), { status: 200 }));

    await expect(rendering).resolves.toBeTruthy();
  });

  it("sends an expired session to the login instead of rendering the form with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/user/me")
          ? new Response("{}", { status: 401 })
          : new Response("{}", { status: 401 }),
      ),
    );

    await expect(ProfileContent({ token: "t" })).rejects.toThrow(
      "redirect:/login",
    );
  });
});
