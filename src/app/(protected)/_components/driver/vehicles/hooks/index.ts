import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";

import type { SelectedVehicleProps } from "../vehicles.types";
import { useVehicleInfiniteScroll } from "../../../shared/searches/search-vehicle/hooks/vehicle-infinite-scroll";

function useDriverVehicles() {
  const { businessId, isLoaded } = useAuthStore();

  const [showSpinner, setShowSpinner] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [selectedVehicle, setSelectedVehicle] =
    useState<SelectedVehicleProps | null>(null);

  const {
    vehicles,
    lastElementRef,
    isFetching,
    isLoading,
    refetch,
    hasError,
    errorMessage,
  } = useVehicleInfiniteScroll(businessId!);

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
    isModalOpen,
    setIsModalOpen,
    selectedVehicle,
    setSelectedVehicle,
    vehicles,
    lastElementRef,
    refetch,
    errorMessage,
    isFetching,
    isLoading,
    hasError,
    isLoaded,
  };
}

export { useDriverVehicles };
