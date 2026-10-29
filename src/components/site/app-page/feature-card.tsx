"use client";

import type { MouseEvent } from "react";

import {
  ClipboardCheck,
  FileCheck2,
  Fuel,
  MapPin,
  MessagesSquare,
  Route,
  TriangleAlert,
  WifiOff,
  type LucideIcon,
} from "lucide-react";

import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

import {
  MODULE_SOFT_BG,
  MODULE_SOFT_VAR,
  MODULE_TEXT,
  type Feature,
  type FeatureIcon,
} from "./content";

const ICONS: Record<FeatureIcon, LucideIcon> = {
  route: Route,
  proof: FileCheck2,
  incident: TriangleAlert,
  chat: MessagesSquare,
  fuel: Fuel,
  checklist: ClipboardCheck,
  offline: WifiOff,
  location: MapPin,
};

/** Moves the card's spotlight to the pointer (custom properties, no re-render). */
function followPointer(event: MouseEvent<HTMLElement>) {
  const element = event.currentTarget;
  const rect = element.getBoundingClientRect();
  element.style.setProperty("--mx", `${event.clientX - rect.left}px`);
  element.style.setProperty("--my", `${event.clientY - rect.top}px`);
}

/**
 * A card of "Tudo o que o motorista registra": icon in the module's color,
 * module marks (violet square = Frotas, pink dot = Entregas), a soft
 * spotlight that follows the mouse and a 3px lift on hover.
 */
const FeatureCard = ({
  feature,
  delay,
}: {
  feature: Feature;
  delay: number;
}): JSX.Element => {
  const Icon = ICONS[feature.icon];

  return (
    <Reveal
      as="article"
      delay={delay}
      onMouseMove={followPointer}
      className="group relative overflow-hidden rounded-[22px] border border-site-line bg-site-surface p-6 transition-[border-color,transform] duration-300 ease-site hover:-translate-y-[3px] hover:border-site-line2 motion-reduce:hover:translate-y-0"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(260px circle at var(--mx,-300px) var(--my,-300px), ${MODULE_SOFT_VAR[feature.module]}, transparent 65%)`,
        }}
      />
      <div className="relative flex items-center justify-between gap-2.5">
        <span
          className={cn(
            "flex size-[42px] items-center justify-center rounded-[13px]",
            MODULE_SOFT_BG[feature.module],
            MODULE_TEXT[feature.module],
          )}
        >
          <Icon aria-hidden className="size-5" />
        </span>
        <span aria-hidden className="flex gap-[3px]">
          {feature.module !== "d" ? (
            <span className="size-[7px] rounded-[2px] bg-site-violet" />
          ) : null}
          {feature.module !== "f" ? (
            <span className="size-[7px] rounded-full bg-site-pink" />
          ) : null}
        </span>
      </div>
      <h3 className="relative m-0 mt-5 text-[17px] font-semibold tracking-[-.01em]">
        {feature.title}
      </h3>
      <p className="relative m-0 mt-1.5 text-[14.5px] leading-[1.55] text-site-muted [text-wrap:pretty]">
        {feature.description}
      </p>
    </Reveal>
  );
};

export { FeatureCard };
