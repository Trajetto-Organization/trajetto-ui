import type { Metadata } from "next";

import { ThemeProvider } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

import { sfPro, inter } from "./fonts";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.METADATA_BASE as string;

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: "Trajetto - Sistema Avançado de Gestão de Frotas",
      template: `%s | Trajetto - Gestão de Frotas`,
    },
    description: `
      O Trajetto é a plataforma definitiva para otimização e planejamento de frotas, ideal para empresas e profissionais 
      que buscam eficiência e precisão no transporte. Com nossa tecnologia avançada, você pode traçar, monitorar, ajustar e acompanhar suas frotas em tempo real, 
      economizando tempo e custos operacionais. Descubra o poder de um gerenciador inteligente e simplifique sua logística com o Trajetto.
    `.trim(),
    keywords: [
      "gestão de frotas",
      "otimização de transporte",
      "monitoramento de veículos",
      "logística empresarial",
      "controle de frota",
      "eficiência em transporte",
      "planejamento logístico",
      "gerenciamento de motoristas",
      "manutenção de veículos",
      "rastreamento veicular",
      "sistema de frotas",
      "Trajetto",
      "gestão logística",
      "frotas empresariais",
      "controle de combustível",
      "relatórios de frota",
      "dashboard de frotas",
      "automação logística",
      "GPS para frotas",
      "telemetria veicular",
    ],
    authors: [{ name: "Trajetto", url: baseUrl }],
    creator: "Equipe Trajetto",
    publisher: "Trajetto Sistemas Ltda",
    applicationName: "Trajetto",
    category: "Gestão de Frotas e Logística",

    // ADVANCED SEO OPTIMIZATIONS
    classification: "Business Software",

    // Optimized robot settings
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    // Alternative and Canonical URLs
    alternates: {
      canonical: baseUrl,
      languages: {
        "pt-BR": baseUrl,
      },
    },

    // Optimized Open Graph
    openGraph: {
      title: "Trajetto - Sistema Avançado de Gestão de Frotas",
      description: `
        Plataforma completa para gestão inteligente de frotas. Monitore veículos, otimize rotas, 
        controle custos e aumente a eficiência da sua operação logística com o Trajetto.
      `.trim(),
      url: baseUrl,
      siteName: "Trajetto",
      images: [
        {
          url: `${baseUrl}/og-default.jpg`,
          width: 1200,
          height: 630,
          alt: "Trajetto - Sistema de Gestão de Frotas",
          type: "image/jpeg",
        },
      ],
      locale: "pt-BR",
      type: "website",
    },

    // Optimized Twitter Card
    twitter: {
      card: "summary_large_image",
      title: "Trajetto - Sistema Avançado de Gestão de Frotas",
      description: `
        Transforme a gestão da sua frota com nossa plataforma inteligente. 
        Monitore, otimize e controle toda sua operação logística em tempo real.
      `.trim(),
      images: [`${baseUrl}/og-default.jpg`],
      site: "@trajetto",
      creator: "@trajetto",
    },

    icons: {
      icon: [{ url: "/favicon.ico" }],
      apple: [{ url: "/apple-touch-icon" }],
    },

    // Additional metadata for SEO
    other: {
      "theme-color": "#7c3aed", // Purple primary color
      "color-scheme": "light dark",
      "format-detection": "telephone=no",
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "black-translucent",
      "msapplication-TileColor": "#7c3aed",
      "msapplication-config": "/browserconfig.xml",
    },
  };
}

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={cn(
          `flex min-h-screen flex-col bg-background 
          text-foreground antialiased`,
          sfPro.variable,
          inter.variable,
        )}
      >
        {/*
          `attribute="class"` is not decoration — without it the dark theme
          does not exist.

          next-themes defaults to `data-theme`, and Tailwind here is
          configured with `darkMode: ["class"]`, which looks for the `.dark`
          CLASS. The two never met: the provider wrote `data-theme="dark"` on
          <html>, no `dark:` utility ever matched, and the ~700 dark variants
          in this codebase had never rendered once.
        */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
