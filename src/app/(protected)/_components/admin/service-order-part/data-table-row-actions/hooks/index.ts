import { useState } from "react";

function useUpdateServiceOrderPartForm() {
  const [isUpdateServiceOrderPartOpen, setIsUpdateServiceOrderPartOpen] =
    useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateServiceOrderPart = () => {
    setIsDropdownOpen(false);
    setIsUpdateServiceOrderPartOpen(!isUpdateServiceOrderPartOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    isUpdateServiceOrderPartOpen,
    handleCloseUpdateServiceOrderPart,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useUpdateServiceOrderPartForm };
