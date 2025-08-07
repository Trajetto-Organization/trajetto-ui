import { useState } from "react";

function useDashboardUpdateVehicleForm() {
  const [isUpdateVehicleOpen, setIsUpdateVehicleOpen] =
    useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateVehicle = () => {
    setIsDropdownOpen(false);
    setIsUpdateVehicleOpen(!isUpdateVehicleOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    isUpdateVehicleOpen,
    handleCloseUpdateVehicle,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useDashboardUpdateVehicleForm };
