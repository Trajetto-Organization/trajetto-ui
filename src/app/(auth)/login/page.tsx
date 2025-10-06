import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: `
    Entre com sua conta no Trajetto e aproveite todas as funcionalidades do nosso sistema de gestão de frotas inteligente. 
    Acesse dashboards, relatórios, monitore sua frota em tempo real e muito mais.
  `.trim(),
  robots: {
    index: true,
    follow: true,
  },

  // Canonical can point to homepage or be omitted for login pages
  alternates: {
    canonical: process.env.METADATA_BASE,
  },
  openGraph: {
    title: "Trajetto - Sistema de Gestão de Frotas",
    description:
      "Acesse sua conta Trajetto para gerenciar sua frota de forma inteligente.",
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
    description:
      "Sistema inteligente para gestão e otimização de frotas empresariais.",
    images: [`${process.env.METADATA_BASE}/og-default.jpg`],
  },
};

const Login = (): JSX.Element => {
  return <LoginForm />;
};

export default Login;
