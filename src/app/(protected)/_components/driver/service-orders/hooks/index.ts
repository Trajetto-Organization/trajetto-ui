import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";

import { useServiceOrderByVehicleInfiniteScroll } from "../../../shared/searches/search-service-order-by-vehicle/hooks/service-order-by-vehicle-infinite-scroll";

function useDriverServiceOrdersList(vehicleId: string) {
  const { businessId, isLoaded } = useAuthStore();
  const [showSpinner, setShowSpinner] = useState<boolean>(false);

  const {
    serviceOrders,
    lastElementRef,
    isFetching,
    isLoading,
    refetch,
    hasError,
    errorMessage,
  } = useServiceOrderByVehicleInfiniteScroll(vehicleId, businessId!);

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
    serviceOrders,
    lastElementRef,
    isFetching,
    isLoading,
    refetch,
    hasError,
    errorMessage,
    isLoaded,
  };
}

export { useDriverServiceOrdersList };
