import { useState } from "react";

function useDashboardUpdateFuelForm() {
  const [isUpdateFuelOpen, setIsUpdateFuelOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateFuel = () => {
    setIsDropdownOpen(false);
    setIsUpdateFuelOpen(!isUpdateFuelOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    isUpdateFuelOpen,
    handleCloseUpdateFuel,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useDashboardUpdateFuelForm };
