import { useEffect, useState } from "react";
import { toast } from "sonner";

function useDashboardUpdateDriverForm() {
  const [isUpdateDriverOpen, setIsUpdateDriverOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateDriver = () => {
    setIsDropdownOpen(false);
    setIsUpdateDriverOpen(!isUpdateDriverOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  useEffect(() => {
    return () => {
      if (isUpdateDriverOpen) {
        toast.dismiss();
      }
    };
  }, [isUpdateDriverOpen]);

  return {
    isUpdateDriverOpen,
    handleCloseUpdateDriver,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useDashboardUpdateDriverForm };
