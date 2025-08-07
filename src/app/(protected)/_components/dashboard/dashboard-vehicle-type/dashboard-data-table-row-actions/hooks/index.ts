import { useState } from "react";

function useDashboardUpdateVehicleTypeForm() {
  const [isUpdateVehicleTypeOpen, setIsUpdateVehicleTypeOpen] =
    useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateVehicleType = () => {
    setIsDropdownOpen(false);
    setIsUpdateVehicleTypeOpen(!isUpdateVehicleTypeOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    isUpdateVehicleTypeOpen,
    handleCloseUpdateVehicleType,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useDashboardUpdateVehicleTypeForm };
