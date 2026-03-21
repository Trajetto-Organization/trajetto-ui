import { useState } from "react";

function useUpdateProfileAccessForm() {
  const [isUpdateProfileAccessOpen, setIsUpdateProfileAccessOpen] =
    useState<boolean>(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isBulkConfigureOpen, setIsBulkConfigureOpen] =
    useState<boolean>(false);

  const handleOpenUpdateProfileAccess = () => {
    setIsDropdownOpen(false);
    setIsUpdateProfileAccessOpen(!isUpdateProfileAccessOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleOpenBulkConfigure = () => {
    setIsDropdownOpen(false);
    setIsBulkConfigureOpen(!isBulkConfigureOpen);
  };

  return {
    isUpdateProfileAccessOpen,
    handleOpenUpdateProfileAccess,
    handleOpenDropdown,
    isDropdownOpen,
    isBulkConfigureOpen,
    handleOpenBulkConfigure,
  };
}

export { useUpdateProfileAccessForm };
