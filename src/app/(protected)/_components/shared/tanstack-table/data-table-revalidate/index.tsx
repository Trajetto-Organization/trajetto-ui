import { useFormState } from "react-dom";

import { handleRevalidateData } from "@/actions/revalidate-data";
import { RevalidateButtonFormInner } from "@/app/(protected)/_components/shared/revalidate-button-ui";

import type { DataTableRevalidateProps } from "./data-table-revalidate.types";
import { useDataTableRevalidate } from "./hooks";

const DataTableRevalidate = ({
  revalidateData,
  rateLimit,
}: DataTableRevalidateProps) => {
  const [state, dispatch] = useFormState(
    async (_prevState: any, _formData: FormData) =>
      await handleRevalidateData(revalidateData),
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
        className="h-8 w-full"
        alwaysShowIcon={false}
      />
    </form>
  );
};

export { DataTableRevalidate };
