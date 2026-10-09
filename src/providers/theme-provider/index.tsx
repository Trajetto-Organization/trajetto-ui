"use client";

import { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import NextTopLoader from "nextjs-toploader";

import { ThemeProvider as NextThemesProvider } from "next-themes";

import { THEME_STORAGE_KEY } from "@/lib/theme-init-script";
import { type ThemeProviderProps } from "next-themes";

interface NextThemeProviderProps extends ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider = ({
  children,
  ...props
}: NextThemeProviderProps): JSX.Element => {
  return (
    <>
      <NextTopLoader
        color="rgb(11, 178, 245)"
        initialPosition={0.08}
        crawlSpeed={200}
        height={3}
        crawl={true}
        showSpinner={true}
        easing="ease"
        speed={200}
        shadow="0 0 10px #2299DD,0 0 5px #2299DD"
      />
      {/* Top-right: the bottom-right corner belongs to the operations alert
      balloon (decision 14.6, design §6.6) — toasts and cards must not fight
      over one corner. */}
      <Toaster position="top-right" />
      {/*
        next-themes always renders its own inline script, whose text comes
        from Function.toString() and so has no stable hash, and which carries
        no nonce on the prerendered root layout: the enforced CSP blocks it.
        A data-block type keeps that copy inert; the root layout runs
        THEME_INIT_SCRIPT instead, allowed by its hash.
      */}
      <NextThemesProvider
        {...props}
        storageKey={THEME_STORAGE_KEY}
        scriptProps={{ type: "application/json" }}
      >
        {children}
      </NextThemesProvider>
    </>
  );
};

export { ThemeProvider };
