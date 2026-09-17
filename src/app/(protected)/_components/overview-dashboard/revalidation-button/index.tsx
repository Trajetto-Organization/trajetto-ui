"use client";

/*
  Same reason as its sibling in `tanstack-table/data-table-revalidate`:
  `useFormState` is a client hook and this module declared nothing, so it was
  safe by accident of who imports it rather than by design.
*/
import { useFormState } from "react-dom";

import { RevalidateButtonFormInner } from "@/app/(protected)/_components/shared/revalidate-button-ui";
import { handleRevalidateData } from "@/actions/revalidate-data";

import type { DataButtonRevalidateProps } from "./revalidation-button.types";
import { useDataButtonRevalidation } from "../../hooks/revalidation-button";

import { cn } from "@/lib/utils";

const ButtonRevalidation = ({
  revalidateData,
  rateLimit,
  className,
  buttonClassName,
}: DataButtonRevalidateProps): JSX.Element => {
  const [state, dispatch] = useFormState(
    async (_prevState: any, _formData: FormData) => {
      const result = await handleRevalidateData(revalidateData);

      if (!result?.revalidateDataError) {
        window.dispatchEvent(new CustomEvent("data-revalidated"));
      }

      return result;
    },
    null,
  );

  const { isRateLimited, cooldownRemaining, registerClick } =
    useDataButtonRevalidation(state, rateLimit);

  const rateLimitedDispatch = (formData: FormData) => {
    const canProceed = registerClick();
    if (canProceed) {
      dispatch(formData);
    }
  };

  return (
    <form action={rateLimitedDispatch} className={cn("w-full", className)}>
      <RevalidateButtonFormInner
        isRateLimited={isRateLimited}
        cooldownRemaining={cooldownRemaining}
        className={buttonClassName || "w-full sm:w-auto"}
      />
    </form>
  );
};

export { ButtonRevalidation };
