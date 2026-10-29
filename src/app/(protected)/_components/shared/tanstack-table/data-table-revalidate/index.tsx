"use client";

/*
  The directive is load-bearing, not decoration: this is a shared primitive
  built on client hooks, and twenty-one `page-actions.tsx` files import it.
  One Server Component importing it without the directive is all it would
  take to break /admin again.
*/
import type { FormEvent } from "react";

import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";
import { RevalidateButtonUI } from "@/app/(protected)/_components/shared/revalidate-button-ui";
import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";

import type { DataTableRevalidateProps } from "./data-table-revalidate.types";
import { useRefreshRateLimit } from "./hooks";

const DataTableRevalidate = ({
  rateLimit,
  hideLabelOnMobile = false,
  className,
}: DataTableRevalidateProps) => {
  // h-9 on /admin and /dashboard alike (decision 16.61); full width, so the
  // row decides where it ends.
  const rowClassName = usePageActionClassName();

  const { revalidate, isRevalidating } = useRevalidateScreen();

  const { isRateLimited, cooldownRemaining, registerClick } =
    useRefreshRateLimit(rateLimit);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // A refused click must not reach the network, or the limit is decoration.
    if (!registerClick()) return;

    void revalidate();
  };

  return (
    // Still a form: the page layouts (and the responsive specs) size the
    // button through this block wrapper.
    <form onSubmit={handleSubmit}>
      <RevalidateButtonUI
        isLoading={isRevalidating}
        isRateLimited={isRateLimited}
        cooldownRemaining={cooldownRemaining}
        className={className ?? rowClassName}
        hideLabelOnMobile={hideLabelOnMobile}
        type="submit"
      />
    </form>
  );
};

export { DataTableRevalidate };
