import { useEffect, useState } from "react";
import { toast } from "sonner";

function useUpdateBusinessForm() {
  const [isUpdateBusinessOpen, setIsUpdateBusinessOpen] =
    useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateBusiness = () => {
    if (isUpdateBusinessOpen) {
      toast.dismiss();
    }

    setIsDropdownOpen(false);
    setIsUpdateBusinessOpen(!isUpdateBusinessOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  useEffect(() => {
    return () => {
      if (isUpdateBusinessOpen) {
        toast.dismiss();
      }
    };
  }, [isUpdateBusinessOpen]);

  return {
    isUpdateBusinessOpen,
    handleCloseUpdateBusiness,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useUpdateBusinessForm };
