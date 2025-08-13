import { useState } from "react";

function useFuelRowActions() {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isUpdateFuelOpen, setIsUpdateFuelOpen] = useState<boolean>(false);

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleCloseUpdateFuel = () => {
    setIsDropdownOpen(false);
    setIsUpdateFuelOpen(!isUpdateFuelOpen);
  };

  return {
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateFuelOpen,
    handleCloseUpdateFuel,
  };
}

export { useFuelRowActions };
