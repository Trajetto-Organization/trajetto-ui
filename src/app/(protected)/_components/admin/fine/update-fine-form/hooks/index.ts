import { useEffect, useRef, useState } from "react";
import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandDriverInputValue,
  CommandTrafficViolationCodeInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/dto";

import { FineProps } from "../../dto";
import { UpdateFineFormState } from "../dto";

import { revalidateTagName } from "@/actions/revalidate";
import { toast } from "sonner";

import { queryClientProps } from "@/lib/query-client-props";

interface UseUpdateFineFormProps {
  state: UpdateFineFormState | null;
  handleCloseUpdateFine: () => void;
  fineData: FineProps;
  isUpdateFineOpen: boolean;
}

function useUpdateFineForm({
  state,
  handleCloseUpdateFine,
  fineData,
  isUpdateFineOpen,
}: UseUpdateFineFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const toastShownRef = useRef(false);

  // Sanitize optional fields that might contain "N/A"
  const sanitizedBranchName =
    fineData.branchName && fineData.branchName !== "N/A"
      ? fineData.branchName
      : "";

  const sanitizedDriverName =
    fineData.driverName && fineData.driverName !== "N/A"
      ? fineData.driverName
      : "";

  const sanitizedVehicleDescription =
    fineData.vehicleDescription && fineData.vehicleDescription !== "N/A"
      ? fineData.vehicleDescription
      : "";

  const sanitizedViolationDescription =
    fineData.violationDescription && fineData.violationDescription !== "N/A"
      ? fineData.violationDescription
      : "";

  // Step management
  const [currentStep, setCurrentStep] = useState<
    | "select-business"
    | "select-vehicle-driver"
    | "select-violation-code"
    | "update-fine"
  >("select-business");

  // Initialize form values from fine data with sanitized values
  const [commandBusinessInputValue, setCommandBusinessInputValue] =
    useState<CommandBusinessInputValue>({
      businessId: fineData.businessId as string,
      searchBusinessInputValue: fineData.businessName as string,
    });

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      branchId: sanitizedBranchName ? fineData.branchId || "" : "",
      searchBranchInputValue: sanitizedBranchName,
    });

  const [commandVehicleInputValue, setCommandVehicleInputValue] =
    useState<CommandVehicleInputValue>({
      vehicleId: sanitizedVehicleDescription ? fineData.vehicleId || "" : "",
      searchVehicleInputValue: sanitizedVehicleDescription,
      vehicleLicensePlate:
        sanitizedVehicleDescription && fineData.vehicleLicensePlate
          ? fineData.vehicleLicensePlate
          : "",
    });

  const [commandDriverInputValue, setCommandDriverInputValue] =
    useState<CommandDriverInputValue>({
      driverId: sanitizedDriverName ? fineData.driverId || "" : "",
      searchDriverInputValue: sanitizedDriverName,
      driverCnh:
        sanitizedDriverName && fineData.driverCpf
          ? fineData.driverCpf.slice(-4)
          : "",
    });

  // Create the complete display text for traffic violation code (same format as SearchTrafficViolationCode)
  const getViolationDisplayText = () => {
    if (sanitizedViolationDescription && fineData.violationCode) {
      return `${fineData.violationCode} - ${sanitizedViolationDescription}`;
    }
    return sanitizedViolationDescription;
  };

  const [
    commandTrafficViolationCodeInputValue,
    setCommandTrafficViolationCodeInputValue,
  ] = useState<CommandTrafficViolationCodeInputValue>({
    trafficViolationCodeId: sanitizedViolationDescription
      ? fineData.trafficViolationCodeId || ""
      : "",
    searchTrafficViolationCodeInputValue: getViolationDisplayText(),
    violationCode:
      sanitizedViolationDescription && fineData.violationCode
        ? fineData.violationCode
        : "",
  });

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isUpdateFineOpen) {
      setCommandBusinessInputValue({
        businessId: fineData.businessId as string,
        searchBusinessInputValue: fineData.businessName as string,
      });

      setCommandBranchInputValue({
        branchId: sanitizedBranchName ? fineData.branchId || "" : "",
        searchBranchInputValue: sanitizedBranchName,
      });

      setCommandVehicleInputValue({
        vehicleId: sanitizedVehicleDescription ? fineData.vehicleId || "" : "",
        searchVehicleInputValue: sanitizedVehicleDescription,
        vehicleLicensePlate:
          sanitizedVehicleDescription && fineData.vehicleLicensePlate
            ? fineData.vehicleLicensePlate
            : "",
      });

      setCommandDriverInputValue({
        driverId: sanitizedDriverName ? fineData.driverId || "" : "",
        searchDriverInputValue: sanitizedDriverName,
        driverCnh:
          sanitizedDriverName && fineData.driverCpf ? fineData.driverCpf : "",
      });

      setCommandTrafficViolationCodeInputValue({
        trafficViolationCodeId: sanitizedViolationDescription
          ? fineData.trafficViolationCodeId || ""
          : "",
        searchTrafficViolationCodeInputValue: sanitizedViolationDescription,
        violationCode:
          sanitizedViolationDescription && fineData.violationCode
            ? fineData.violationCode
            : "",
      });

      setCurrentStep("select-business");
    }
  }, [
    isUpdateFineOpen,
    sanitizedBranchName,
    sanitizedDriverName,
    sanitizedVehicleDescription,
    sanitizedViolationDescription,
    fineData,
  ]);

  // Handle business and branch selection updates
  const handleUpdateSearchBusinessInputValue = (
    data: CommandBusinessInputValue,
  ) => {
    const updateBusinessData =
      data.businessId === commandBusinessInputValue.businessId
        ? { businessId: "", searchBusinessInputValue: "" }
        : data;

    if (
      updateBusinessData.businessId !== commandBusinessInputValue.businessId
    ) {
      setCommandBranchInputValue({
        branchId: "",
        searchBranchInputValue: "",
      });
      setCommandVehicleInputValue({
        vehicleId: "",
        searchVehicleInputValue: "",
        vehicleLicensePlate: "",
      });
      setCommandDriverInputValue({
        driverId: "",
        searchDriverInputValue: "",
        driverCnh: "",
      });
      setCommandTrafficViolationCodeInputValue({
        trafficViolationCodeId: "",
        searchTrafficViolationCodeInputValue: "",
        violationCode: "",
      });
    }

    setCommandBusinessInputValue(updateBusinessData);
  };

  const handleUpdateSearchBranchInputValue = (
    data: CommandBranchInputValue,
  ) => {
    const updateBranchData =
      data.branchId === commandBranchInputValue.branchId
        ? { branchId: "", searchBranchInputValue: "" }
        : data;

    setCommandBranchInputValue(updateBranchData);
  };

  const handleUpdateSearchVehicleInputValue = (
    data: CommandVehicleInputValue,
  ) => {
    const updateVehicleData =
      data.vehicleId === commandVehicleInputValue.vehicleId
        ? {
            vehicleId: "",
            searchVehicleInputValue: "",
            vehicleLicensePlate: "",
          }
        : data;

    setCommandVehicleInputValue(updateVehicleData);
  };

  const handleUpdateSearchDriverInputValue = (
    data: CommandDriverInputValue,
  ) => {
    const updateDriverData =
      data.driverId === commandDriverInputValue.driverId
        ? { driverId: "", searchDriverInputValue: "", driverCnh: "" }
        : data;

    setCommandDriverInputValue(updateDriverData);
  };

  const handleUpdateSearchTrafficViolationCodeInputValue = (
    data: CommandTrafficViolationCodeInputValue,
  ) => {
    const updateTrafficViolationCodeData =
      data.trafficViolationCodeId ===
      commandTrafficViolationCodeInputValue.trafficViolationCodeId
        ? {
            trafficViolationCodeId: "",
            searchTrafficViolationCodeInputValue: "",
            violationCode: "",
          }
        : data;

    setCommandTrafficViolationCodeInputValue(updateTrafficViolationCodeData);
  };

  // Step navigation
  const handleBusinessStepContinue = () => {
    setCurrentStep("select-vehicle-driver");
  };

  const handleVehicleDriverStepContinue = () => {
    setCurrentStep("select-violation-code");
  };

  const handleViolationCodeStepContinue = () => {
    setCurrentStep("update-fine");
  };

  const handleBackToBusinessStep = () => {
    setCurrentStep("select-business");
  };

  const handleBackToVehicleDriverStep = () => {
    setCurrentStep("select-vehicle-driver");
  };

  const handleBackToViolationCodeStep = () => {
    setCurrentStep("select-violation-code");
  };

  useEffect(() => {
    // Handle error case first
    if (state?.updateFineError?.updateFineErrorMessage) {
      toast.error(state.updateFineError.updateFineErrorMessage);
      return;
    }

    // Handle success case
    if (state?.successMessage && !toastShownRef.current) {
      // Mark toast as shown to prevent duplicates
      toastShownRef.current = true;

      // Show the toast first
      toast.success(state.successMessage);

      // Start revalidation in background
      const performRevalidation = async () => {
        try {
          await Promise.all([
            revalidateTagName("update-fine"),
            queryClientProps.resetQueries({
              predicate: (query) => {
                return (
                  Array.isArray(query.queryKey) && query.queryKey[0] === "fine"
                );
              },
            }),
          ]);
        } catch (error: any) {
          if (process.env.NODE_ENV === "development") {
            console.error("Erro na revalidação:", error);
          }

          toast.error("Erro ao atualizar dados. Recarregue a página.");
        }
      };

      // Start revalidation in background without waiting
      performRevalidation();

      // Close the modal immediately after showing toast
      handleCloseUpdateFine();
    }

    // Cleanup function to reset the ref when the component unmounts
    return () => {
      toastShownRef.current = false;
    };
  }, [state, handleCloseUpdateFine]);

  // Create sanitized original values for comparison
  const originalBranchId =
    fineData.branchName !== "N/A" ? fineData.branchId || "" : "";
  const originalVehicleId =
    fineData.vehicleDescription !== "N/A" ? fineData.vehicleId || "" : "";
  const originalDriverId =
    fineData.driverName !== "N/A" ? fineData.driverId || "" : "";
  const originalTrafficViolationCodeId =
    fineData.violationDescription !== "N/A"
      ? fineData.trafficViolationCodeId || ""
      : "";

  const isBusinessAndEntityDirty = [
    commandBusinessInputValue.businessId !== fineData.businessId,
    commandBranchInputValue.branchId !== originalBranchId,
    commandVehicleInputValue.vehicleId !== originalVehicleId,
    commandDriverInputValue.driverId !== originalDriverId,
    commandTrafficViolationCodeInputValue.trafficViolationCodeId !==
      originalTrafficViolationCodeId,
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBusinessInputValue,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    commandTrafficViolationCodeInputValue,
    handleBusinessStepContinue,
    handleVehicleDriverStepContinue,
    handleViolationCodeStepContinue,
    handleBackToBusinessStep,
    handleBackToVehicleDriverStep,
    handleBackToViolationCodeStep,
    handleUpdateSearchBusinessInputValue,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchTrafficViolationCodeInputValue,
    isBusinessAndEntityDirty,
  };
}

export { useUpdateFineForm };
