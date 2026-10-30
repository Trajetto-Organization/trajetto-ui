import { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { buildPageMetadata } from "@/lib/page-metadata";

// Same as /login: out of search results, with its own canonical.
export const metadata: Metadata = buildPageMetadata({
  path: "/forgot",
  title: "Recuperar senha",
  socialTitle: "Recuperar a senha do Trajetto",
  description:
    "Recupere o acesso à sua conta do Trajetto: informe o seu e-mail para receber as instruções de redefinição de senha.",
});

const ForgotPassword = (): JSX.Element => {
  return <ForgotPasswordForm />;
};

export default ForgotPassword;
