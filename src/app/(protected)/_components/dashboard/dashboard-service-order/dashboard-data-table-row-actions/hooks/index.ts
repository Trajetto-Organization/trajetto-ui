import { useState } from "react";

function useDashboardUpdateServiceOrderForm() {
  const [isUpdateServiceOrderOpen, setIsUpdateServiceOrderOpen] =
    useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateServiceOrder = () => {
    setIsDropdownOpen(false);
    setIsUpdateServiceOrderOpen(!isUpdateServiceOrderOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    isUpdateServiceOrderOpen,
    handleCloseUpdateServiceOrder,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useDashboardUpdateServiceOrderForm };
