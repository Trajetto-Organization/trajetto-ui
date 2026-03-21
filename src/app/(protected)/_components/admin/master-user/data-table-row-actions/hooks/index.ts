import { useState } from "react";

function useUpdateMasterUserForm() {
  const [isUpdateMasterUserOpen, setIsUpdateMasterUserOpen] =
    useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleOpenUpdateMasterUser = () => {
    setIsDropdownOpen(false);
    setIsUpdateMasterUserOpen(!isUpdateMasterUserOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    isUpdateMasterUserOpen,
    handleOpenUpdateMasterUser,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useUpdateMasterUserForm };
