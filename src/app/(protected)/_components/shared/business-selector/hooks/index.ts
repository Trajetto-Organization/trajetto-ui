import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { BusinessSelectorProps } from "../business-selector.types";
import { useBusinessInfiniteScroll } from "../../searches/search-business/hooks/business-infinite-scroll";

function useBusinessSelector({ currentBusinessId }: BusinessSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  const {
    business,
    lastElementRef,
    isLoading,
    isFetching,
    hasError,
    errorMessage,
    refetch,
  } = useBusinessInfiniteScroll();

  // Filter companies based on search term
  const filteredBusiness = useMemo(() => {
    if (!business) return [];
    if (!searchValue.trim()) {
      return business;
    }

    return business.filter((company) =>
      company.corporate_reason
        .toLowerCase()
        .includes(searchValue.toLowerCase()),
    );
  }, [business, searchValue]);

  // Find the current selected company
  const selectedBusiness = useMemo(() => {
    if (!currentBusinessId || !business) return null;
    return business.find((company) => company.id === currentBusinessId);
  }, [currentBusinessId, business]);

  const handleBusinessChange = (businessId: string) => {
    setOpen(false);
    setSearchValue(""); // Reset search on selection

    if (businessId === currentBusinessId) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("businessId", businessId);

    router.push(`?${params.toString()}`);
  };

  const handleRetry = () => {
    refetch();
  };

  return {
    open,
    setOpen,
    searchValue,
    setSearchValue,
    lastElementRef,
    isLoading,
    isFetching,
    hasError,
    errorMessage,
    filteredBusiness,
    selectedBusiness,
    handleBusinessChange,
    handleRetry,
    business,
  };
}

export { useBusinessSelector };
