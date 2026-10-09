"use client";

import type { FormEvent } from "react";

import { RevalidateButtonUI } from "@/app/(protected)/_components/shared/revalidate-button-ui";
import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";

import type { DataButtonRevalidateProps } from "./revalidation-button.types";
import { useButtonRefreshRateLimit } from "../../hooks/revalidation-button";

import { cn } from "@/lib/utils";

/**
 * The overview's "Atualizar": the same whole-tab refresh as every table's
 * "Atualizar" (useRevalidateScreen). The 7/30-day charts ride on it as
 * react-query reads; the usage limits and system metrics listen for
 * `data-revalidated`.
 */
const ButtonRevalidation = ({
  rateLimit,
  className,
  buttonClassName,
}: DataButtonRevalidateProps): JSX.Element => {
  const { revalidate, isRevalidating } = useRevalidateScreen();

  const { isRateLimited, cooldownRemaining, registerClick } =
    useButtonRefreshRateLimit(rateLimit);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!registerClick()) return;

    void revalidate();
  };

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <RevalidateButtonUI
        isLoading={isRevalidating}
        isRateLimited={isRateLimited}
        cooldownRemaining={cooldownRemaining}
        className={buttonClassName || "w-full sm:w-auto"}
        type="submit"
      />
    </form>
  );
};

export { ButtonRevalidation };
