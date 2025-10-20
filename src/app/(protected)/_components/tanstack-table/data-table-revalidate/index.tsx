import { useFormState, useFormStatus } from "react-dom";
import { Loader, Clock } from "lucide-react";

import { useEffect, useState } from "react";

import { handleRevalidateData } from "@/actions/revalidate-data";
import { Button } from "@/components/ui/button";

import { useDataTableRevalidate } from "./hooks";
import { RevalidateDataProps } from "@/lib/query-keys-mapping";

interface DataTableRevalidateProps {
  revalidateData: RevalidateDataProps;
  rateLimit?: {
    maxClicks?: number;
    timeWindowMs?: number;
    cooldownTimeMs?: number;
    storageKey?: string;
  };
}

const DataTableRevalidateContainer = ({
  isRateLimited,
  cooldownRemaining,
}: {
  isRateLimited: boolean;
  cooldownRemaining: number;
}) => {
  const { pending } = useFormStatus();
  const isDisabled = pending || isRateLimited;

  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const displayCooldown =
    isRateLimited && cooldownRemaining <= 0 ? 1 : cooldownRemaining;

  return (
    <Button
      type="submit"
      variant={"outline"}
      size="sm"
      className="h-8 w-full"
      disabled={isDisabled}
      data-revalidate
    >
      {!isMounted ? (
        "Revalidar Dados"
      ) : isRateLimited ? (
        <>
          Aguarde {displayCooldown}s
          <Clock className="ml-2 h-4 w-4" />
        </>
      ) : (
        <>
          Revalidar Dados
          {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </>
      )}
    </Button>
  );
};

const DataTableRevalidate = ({
  revalidateData,
  rateLimit,
}: DataTableRevalidateProps) => {
  const [state, dispatch] = useFormState(
    async (prevState: any, formData: FormData) =>
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
      <DataTableRevalidateContainer
        isRateLimited={isRateLimited}
        cooldownRemaining={cooldownRemaining}
      />
    </form>
  );
};

export { DataTableRevalidate };
