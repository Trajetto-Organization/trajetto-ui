import { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { buildPageMetadata } from "@/lib/page-metadata";

// Opened from a link with a token: robots.txt keeps crawlers out, and the
// meta says so too for a link that ends up shared elsewhere.
export const metadata: Metadata = buildPageMetadata({
  path: "/forgot/password",
  title: "Redefinir minha senha",
  description:
    "Redefina sua senha para recuperar o acesso à sua conta do Trajetto.",
  noindex: true,
});

const ResetPassword = (): JSX.Element => {
  return <ResetPasswordForm />;
};

export default ResetPassword;
