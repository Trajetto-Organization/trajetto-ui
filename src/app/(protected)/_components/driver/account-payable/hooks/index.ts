import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";

import { useAccountPayableByResponsibleUserInfiniteScroll } from "../../../shared/searches/search-account-payable-by-responsible-user/hooks/account-payable-by-responsible-user-infinite-scroll";

function useDriverAccountPayableList() {
  const { isLoaded } = useAuthStore();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    accountPayables,
    lastElementRef,
    isFetching,
    isLoading,
    refetch,
    hasError,
    errorMessage,
  } = useAccountPayableByResponsibleUserInfiniteScroll();

  useEffect(() => {
    if (hasError) {
      setShowSpinner(false);
      return;
    }

    // Show spinner while auth is loading OR while data is loading
    if (!isLoaded || isLoading || isFetching) {
      setShowSpinner(true);
    } else {
      setShowSpinner(false);
    }
  }, [isLoading, isFetching, hasError, isLoaded]);

  // Initialize spinner as true to avoid blank screen
  useEffect(() => {
    setShowSpinner(true);
  }, []);

  return {
    showSpinner,
    accountPayables,
    lastElementRef,
    refetch,
    errorMessage,
    isLoaded,
    isLoading,
    hasError,
    isFetching,
  };
}

export { useDriverAccountPayableList };
