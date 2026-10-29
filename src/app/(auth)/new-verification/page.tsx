import { Metadata } from "next";

import { NewVerificationForm } from "@/components/auth/new-verification-form";
import { buildPageMetadata } from "@/lib/page-metadata";

// Opened from a link with a token, like /forgot/password.
export const metadata: Metadata = buildPageMetadata({
  path: "/new-verification",
  title: "Verificação de e-mail",
  description:
    "Confirme o seu endereço de e-mail para concluir o acesso à sua conta do Trajetto.",
  noindex: true,
});

const NewVerification = (): JSX.Element => {
  return <NewVerificationForm />;
};

export default NewVerification;
