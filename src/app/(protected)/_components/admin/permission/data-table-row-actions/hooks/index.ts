import { useState } from "react";

function useUpdatePermissionForm() {
  const [isUpdatePermissionOpen, setIsUpdatePermissionOpen] =
    useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleOpenUpdatePermission = () => {
    setIsDropdownOpen(false);
    setIsUpdatePermissionOpen(!isUpdatePermissionOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    isUpdatePermissionOpen,
    handleOpenUpdatePermission,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useUpdatePermissionForm };
