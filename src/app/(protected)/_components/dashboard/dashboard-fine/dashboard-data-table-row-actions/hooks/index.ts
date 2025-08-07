import { useState } from "react";

function useDashboardUpdateFineForm() {
  const [isUpdateFineOpen, setIsUpdateFineOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateFine = () => {
    setIsDropdownOpen(false);
    setIsUpdateFineOpen(!isUpdateFineOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    isUpdateFineOpen,
    handleCloseUpdateFine,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useDashboardUpdateFineForm };
