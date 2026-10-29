import type { ReactNode } from "react";

import { AlertTriangle, Info, Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";

type CalloutType = "info" | "dica" | "atencao";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

const VARIANTS: Record<
  CalloutType,
  { icon: typeof Info; label: string; className: string }
> = {
  info: {
    icon: Info,
    label: "Observação",
    className:
      "border-blue-500/30 bg-blue-500/5 [&_svg]:text-blue-600 dark:[&_svg]:text-blue-400",
  },
  dica: {
    icon: Lightbulb,
    label: "Dica",
    className:
      "border-emerald-500/30 bg-emerald-500/5 [&_svg]:text-emerald-600 dark:[&_svg]:text-emerald-400",
  },
  atencao: {
    icon: AlertTriangle,
    label: "Atenção",
    className:
      "border-amber-500/40 bg-amber-500/5 [&_svg]:text-amber-600 dark:[&_svg]:text-amber-400",
  },
};

/** Highlighted note inside an article: `<Callout type="dica">…</Callout>`. */
const Callout = ({ type = "info", title, children }: CalloutProps) => {
  const variant = VARIANTS[type] ?? VARIANTS.info;
  const Icon = variant.icon;

  // A note, not an <aside>: inside the page's main content an aside is a
  // nested complementary landmark (axe landmark-complementary-is-top-level).
  return (
    <div
      role="note"
      aria-label={title ?? variant.label}
      className={cn(
        "my-6 flex gap-3 rounded-xl border px-4 py-4 sm:px-5",
        variant.className,
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-foreground/90 [&>p:last-child]:mb-0 [&>p]:mb-3">
        <p className="mb-1 font-semibold text-foreground">
          {title ?? variant.label}
        </p>
        {children}
      </div>
    </div>
  );
};

export { Callout };
export type { CalloutType };
