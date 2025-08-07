import { useState } from "react";

function useDashboardUpdateSupplierForm() {
  const [isUpdateSupplierOpen, setIsUpdateSupplierOpen] =
    useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateSupplier = () => {
    setIsDropdownOpen(false);
    setIsUpdateSupplierOpen(!isUpdateSupplierOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    isUpdateSupplierOpen,
    handleCloseUpdateSupplier,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useDashboardUpdateSupplierForm };
