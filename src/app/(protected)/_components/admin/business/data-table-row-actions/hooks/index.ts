import { useEffect, useState } from "react";
import { toast } from "sonner";

function useUpdateBusinessForm() {
  const [isUpdateBusinessOpen, setIsUpdateBusinessOpen] =
    useState<boolean>(false);

  const [isAILimitOpen, setIsAILimitOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateBusiness = () => {
    if (isUpdateBusinessOpen) {
      toast.dismiss();
    }

    setIsDropdownOpen(false);
    setIsUpdateBusinessOpen(!isUpdateBusinessOpen);
  };

  const handleCloseAILimit = () => {
    if (isAILimitOpen) {
      toast.dismiss();
    }

    setIsDropdownOpen(false);
    setIsAILimitOpen(!isAILimitOpen);
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
    isAILimitOpen,
    handleCloseAILimit,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useUpdateBusinessForm };
