import { useState } from "react";

function useUpdateUserForm() {
  const [isUpdateUserOpen, setIsUpdateUserOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleOpenUpdateUser = () => {
    setIsDropdownOpen(false);
    setIsUpdateUserOpen(!isUpdateUserOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    isUpdateUserOpen,
    handleOpenUpdateUser,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useUpdateUserForm };
