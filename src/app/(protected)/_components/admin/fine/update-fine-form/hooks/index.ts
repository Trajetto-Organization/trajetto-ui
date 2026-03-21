import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  CommandBranchInputValue,
  CommandDriverInputValue,
  CommandTrafficViolationCodeInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/shared/common.types";

import type { UpdateFineFormState } from "../update-fine-form.types";
import type { FineProps } from "../../fine.types";

import { revalidateTagName } from "@/actions/revalidate";
import { queryClientProps } from "@/lib/query-client-props";

import { toast } from "sonner";

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

  const branchName = useMemo(
    () => fineData.branch?.corporate_reason || "",
    [fineData.branch?.corporate_reason],
  );

  const driverName = useMemo(
    () => fineData.driver?.name || "",
    [fineData.driver?.name],
  );

  const vehicleDescription = useMemo(
    () => fineData.vehicle?.description || "",
    [fineData.vehicle?.description],
  );

  const violationDescription = useMemo(
    () => fineData.trafficViolationCode?.description || "",
    [fineData.trafficViolationCode?.description],
  );

  // Step management
  const [currentStep, setCurrentStep] = useState<
    | "select-branch"
    | "select-vehicle-driver"
    | "select-violation-code"
    | "update-fine"
  >("select-branch");

  const [commandBranchInputValue, setCommandBranchInputValue] =
    useState<CommandBranchInputValue>({
      branchId: branchName ? fineData.branchId || "" : "",
      searchBranchInputValue: branchName,
    });

  const [commandVehicleInputValue, setCommandVehicleInputValue] =
    useState<CommandVehicleInputValue>({
      vehicleId: vehicleDescription ? fineData.vehicleId || "" : "",
      searchVehicleInputValue: vehicleDescription,
      vehicleLicensePlate:
        vehicleDescription && fineData.vehicle.license_plate
          ? fineData.vehicle.license_plate
          : "",
    });

  const [commandDriverInputValue, setCommandDriverInputValue] =
    useState<CommandDriverInputValue>({
      driverId: driverName ? fineData.driverId || "" : "",
      searchDriverInputValue: driverName,
      driverCnh:
        driverName && fineData.driver.cpf ? fineData.driver.cpf.slice(-4) : "",
    });

  // Create the complete display text for traffic violation code (same format as SearchTrafficViolationCode)
  const getViolationDisplayText = () => {
    if (
      violationDescription &&
      fineData.trafficViolationCode.code &&
      fineData.trafficViolationCode.sub_code !== undefined &&
      fineData.trafficViolationCode.sub_code !== null
    ) {
      return `${fineData.trafficViolationCode.code}-${fineData.trafficViolationCode.sub_code} - ${violationDescription}`;
    }

    return violationDescription;
  };

  const [
    commandTrafficViolationCodeInputValue,
    setCommandTrafficViolationCodeInputValue,
  ] = useState<CommandTrafficViolationCodeInputValue>({
    trafficViolationCodeId: violationDescription
      ? fineData.trafficViolationCodeId || ""
      : "",
    searchTrafficViolationCodeInputValue: getViolationDisplayText(),
    violationCode:
      violationDescription && fineData.trafficViolationCode.code
        ? fineData.trafficViolationCode.code
        : "",
  });

  // Form values state with callback pattern
  const [fineFormValues, setFineFormValues] = useState<Record<string, string>>(
    {},
  );

  const handleFormValuesChange = useCallback(
    (values: Record<string, string>) => {
      setFineFormValues(values);
    },
    [],
  );

  // Reset form values when dialog closes
  useEffect(() => {
    if (!isUpdateFineOpen) {
      setCommandBranchInputValue({
        branchId: branchName ? fineData.branchId || "" : "",
        searchBranchInputValue: branchName,
      });

      setCommandVehicleInputValue({
        vehicleId: vehicleDescription ? fineData.vehicleId || "" : "",
        searchVehicleInputValue: vehicleDescription,
        vehicleLicensePlate:
          vehicleDescription && fineData.vehicle.license_plate
            ? fineData.vehicle.license_plate
            : "",
      });

      setCommandDriverInputValue({
        driverId: driverName ? fineData.driverId || "" : "",
        searchDriverInputValue: driverName,
        driverCnh: driverName && fineData.driver.cpf ? fineData.driver.cpf : "",
      });

      setCommandTrafficViolationCodeInputValue({
        trafficViolationCodeId: violationDescription
          ? fineData.trafficViolationCodeId || ""
          : "",
        searchTrafficViolationCodeInputValue: violationDescription,
        violationCode:
          violationDescription && fineData.trafficViolationCode.code
            ? fineData.trafficViolationCode.code
            : "",
      });

      setCurrentStep("select-branch");

      // Reset form values
      setFineFormValues({});
    }
  }, [
    isUpdateFineOpen,
    branchName,
    driverName,
    vehicleDescription,
    violationDescription,
    fineData,
  ]);

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
  const handleBranchStepContinue = () => {
    setCurrentStep("select-vehicle-driver");
  };

  const handleVehicleDriverStepContinue = () => {
    setCurrentStep("select-violation-code");
  };

  const handleViolationCodeStepContinue = () => {
    setCurrentStep("update-fine");
  };

  const handleBackToBranchStep = () => {
    setCurrentStep("select-branch");
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

  const originalBranchId = fineData.branchId || "";
  const originalVehicleId = fineData.vehicleId || "";

  const originalDriverId = fineData.driverId || "";
  const originalTrafficViolationCodeId = fineData.trafficViolationCodeId || "";

  const isEntityDirty = [
    commandBranchInputValue.branchId !== originalBranchId,
    commandVehicleInputValue.vehicleId !== originalVehicleId,
    commandDriverInputValue.driverId !== originalDriverId,
    commandTrafficViolationCodeInputValue.trafficViolationCodeId !==
      originalTrafficViolationCodeId,
  ].some(Boolean);

  return {
    formRef,
    currentStep,
    commandBranchInputValue,
    commandVehicleInputValue,
    commandDriverInputValue,
    commandTrafficViolationCodeInputValue,
    handleBranchStepContinue,
    handleVehicleDriverStepContinue,
    handleViolationCodeStepContinue,
    handleBackToBranchStep,
    handleBackToVehicleDriverStep,
    handleBackToViolationCodeStep,
    handleUpdateSearchBranchInputValue,
    handleUpdateSearchVehicleInputValue,
    handleUpdateSearchDriverInputValue,
    handleUpdateSearchTrafficViolationCodeInputValue,
    isEntityDirty,
    fineFormValues,
    handleFormValuesChange,
  };
}

export { useUpdateFineForm };
