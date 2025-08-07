import { useState } from "react";

function useDashboardUpdatePartForm() {
  const [isUpdatePartOpen, setIsUpdatePartOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdatePart = () => {
    setIsDropdownOpen(false);
    setIsUpdatePartOpen(!isUpdatePartOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    isUpdatePartOpen,
    handleCloseUpdatePart,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useDashboardUpdatePartForm };
