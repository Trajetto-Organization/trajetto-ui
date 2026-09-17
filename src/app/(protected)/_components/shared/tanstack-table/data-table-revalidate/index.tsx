import { useFormState } from "react-dom";

import { handleRevalidateData } from "@/actions/revalidate-data";
import { RevalidateButtonFormInner } from "@/app/(protected)/_components/shared/revalidate-button-ui";

import type { DataTableRevalidateProps } from "./data-table-revalidate.types";
import { useDataTableRevalidate } from "./hooks";

const DataTableRevalidate = ({
  revalidateData,
  rateLimit,
  hideLabelOnMobile = false,
  className = "h-8 w-full",
}: DataTableRevalidateProps) => {
  /**
   * `?? {}` is load-bearing, and was the reason no button on any table ever
   * invalidated a react-query key.
   *
   * `handleRevalidateData` returns nothing when it succeeds, so the form
   * state went from null straight back to undefined — and the hook below
   * only invalidates `if (state && !state.revalidateDataError)`. The whole
   * client half of the refresh was gated behind a value that never arrived;
   * only the failure path ever produced an object.
   *
   * A fresh object per click on purpose: two refreshes in a row have to be
   * two distinct states, or the second one changes nothing to react to.
   */
  const [state, dispatch] = useFormState(
    async (_prevState: any, _formData: FormData) =>
      (await handleRevalidateData(revalidateData)) ?? {},
    null,
  );

  const { isRateLimited, cooldownRemaining, registerClick } =
    useDataTableRevalidate(state, rateLimit, revalidateData);

  const rateLimitedDispatch = (formData: FormData) => {
    const canProceed = registerClick();
    if (canProceed) {
      dispatch(formData);
    }
  };

  return (
    <form action={rateLimitedDispatch}>
      <RevalidateButtonFormInner
        isRateLimited={isRateLimited}
        cooldownRemaining={cooldownRemaining}
        label="Revalidar Dados"
        className={className}
        hideLabelOnMobile={hideLabelOnMobile}
        alwaysShowIcon={false}
      />
    </form>
  );
};

export { DataTableRevalidate };
