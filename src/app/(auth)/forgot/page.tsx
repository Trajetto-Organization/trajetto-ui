import { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Recuperar Senha",
  description: `
    Recupere o acesso à sua conta Trajetto de forma segura. Insira seu e-mail para receber instruções 
    de redefinição de senha e volte a gerenciar sua frota rapidamente.
  `.trim(),
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: process.env.METADATA_BASE,
  },
  openGraph: {
    title: "Trajetto - Sistema de Gestão de Frotas",
    description: "Recupere o acesso à sua conta Trajetto de forma segura.",
    url: process.env.METADATA_BASE,
    type: "website",
    images: [
      {
        url: `${process.env.METADATA_BASE}/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: "Trajetto - Sistema de Gestão de Frotas",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Trajetto - Sistema de Gestão de Frotas",
    description: "Recupere o acesso à sua conta de forma segura.",
    images: [`${process.env.METADATA_BASE}/og-default.jpg`],
  },
};

const ForgotPassword = (): JSX.Element => {
  return <ForgotPasswordForm />;
};

export default ForgotPassword;
