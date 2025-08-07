import { Metadata } from "next";
import { NewVerificationForm } from "@/components/auth/new-verification-form";

export const metadata: Metadata = {
  title: "Verificação de e-mail",
  description: `
    Esta página é destinada à verificação de e-mail. Por motivos de segurança, os usuários precisam 
    confirmar seus endereços de e-mail antes de obter acesso completo à plataforma.
  `,
};

const NewVerification = (): JSX.Element => {
  return <NewVerificationForm />;
};

export default NewVerification;
