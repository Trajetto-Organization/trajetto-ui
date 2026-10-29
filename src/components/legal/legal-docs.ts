import { Cookie, Scale, Shield, type LucideIcon } from "lucide-react";

/** The design's icon and short tab name of each legal document. */
export const LEGAL_DOC_ICONS: Record<string, LucideIcon> = {
  termos: Scale,
  privacidade: Shield,
  cookies: Cookie,
};

export const LEGAL_DOC_SHORT: Record<string, string> = {
  termos: "Termos",
  privacidade: "Privacidade",
  cookies: "Cookies",
};
