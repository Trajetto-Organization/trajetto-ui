"use client";

import { useState, type FormEvent } from "react";

import { RevalidateButtonUI } from "@/app/(protected)/_components/shared/revalidate-button-ui";
import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";

import type { DataButtonRevalidateProps } from "./revalidation-button.types";
import { useButtonRefreshRateLimit } from "../../hooks/revalidation-button";

import { cn } from "@/lib/utils";

/**
 * The overview's "Atualizar": the same whole-tab refresh as every table's
 * "Atualizar" (useRevalidateScreen). The 7/30-day charts ride on it as
 * react-query reads; the usage limits listen for `data-revalidated`.
 *
 * `onRevalidate` narrows it for a tab that reads only its own queries:
 * Sistema refetches its two reads and nothing else, instead of re-rendering
 * the whole /admin page around them. Same button, same rate limit.
 */
const ButtonRevalidation = ({
  rateLimit,
  className,
  buttonClassName,
  onRevalidate,
}: DataButtonRevalidateProps): JSX.Element => {
  const { revalidate, isRevalidating } = useRevalidateScreen();

  const [isScopedRefreshing, setIsScopedRefreshing] = useState<boolean>(false);

  const { isRateLimited, cooldownRemaining, registerClick } =
    useButtonRefreshRateLimit(rateLimit);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!registerClick()) return;

    if (onRevalidate) {
      setIsScopedRefreshing(true);

      void onRevalidate().finally(() => setIsScopedRefreshing(false));
      return;
    }

    void revalidate();
  };

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <RevalidateButtonUI
        isLoading={isRevalidating || isScopedRefreshing}
        isRateLimited={isRateLimited}
        cooldownRemaining={cooldownRemaining}
        className={buttonClassName || "w-full sm:w-auto"}
        type="submit"
      />
    </form>
  );
};

export { ButtonRevalidation };
