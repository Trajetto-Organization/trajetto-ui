import { useState } from "react";

function useFuelRowActions() {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return {
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useFuelRowActions };
