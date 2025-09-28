import { useState } from "react";

function useVehicleChecklistRowActions() {
  const [isUpdateChecklistOpen, setIsUpdateChecklistOpen] =
    useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateChecklist = () => {
    setIsDropdownOpen(false);
    setIsUpdateChecklistOpen(!isUpdateChecklistOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    handleOpenDropdown,
    isDropdownOpen,
    isUpdateChecklistOpen,
    handleCloseUpdateChecklist,
  };
}

export { useVehicleChecklistRowActions };
