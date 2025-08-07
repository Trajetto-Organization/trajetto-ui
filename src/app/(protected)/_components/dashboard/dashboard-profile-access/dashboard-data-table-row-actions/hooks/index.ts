import { useState } from "react";

function useDashboardUpdateProfileAccessForm() {
  const [isUpdateProfileAccessOpen, setIsUpdateProfileAccessOpen] =
    useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleOpenUpdateProfileAccess = () => {
    setIsDropdownOpen(false);
    setIsUpdateProfileAccessOpen(!isUpdateProfileAccessOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    isUpdateProfileAccessOpen,
    handleOpenUpdateProfileAccess,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useDashboardUpdateProfileAccessForm };
