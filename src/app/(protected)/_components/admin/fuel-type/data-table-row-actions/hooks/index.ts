import { useState } from "react";

function useUpdateFuelTypeForm() {
  const [isUpdateFuelTypeOpen, setIsUpdateFuelTypeOpen] =
    useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateFuelType = () => {
    setIsDropdownOpen(false);
    setIsUpdateFuelTypeOpen(!isUpdateFuelTypeOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    isUpdateFuelTypeOpen,
    handleCloseUpdateFuelType,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useUpdateFuelTypeForm };
