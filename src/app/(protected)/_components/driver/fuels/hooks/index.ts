import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";

import { useFuelInfiniteScroll } from "../../../shared/searches/search-fuel/hooks/fuel-infinite-scroll";

function useDriverFuelsList(vehicleId: string) {
  const { businessId, isLoaded } = useAuthStore();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    fuels,
    lastElementRef,
    isFetching,
    isLoading,
    refetch,
    hasError,
    errorMessage,
  } = useFuelInfiniteScroll(vehicleId, businessId!);

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
    fuels,
    lastElementRef,
    refetch,
    errorMessage,
    isLoading,
    hasError,
    isLoaded,
    isFetching,
  };
}

export { useDriverFuelsList };
