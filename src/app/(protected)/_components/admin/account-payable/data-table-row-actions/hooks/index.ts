import { useEffect, useState } from "react";
import { toast } from "sonner";

function useUpdateAccountPayableForm() {
  const [isUpdateAccountPayableOpen, setIsUpdateBranchOpen] =
    useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateAccountPayable = () => {
    if (isUpdateAccountPayableOpen) {
      toast.dismiss();
    }

    setIsDropdownOpen(false);
    setIsUpdateBranchOpen(!isUpdateAccountPayableOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  useEffect(() => {
    return () => {
      if (isUpdateAccountPayableOpen) {
        toast.dismiss();
      }
    };
  }, [isUpdateAccountPayableOpen]);

  return {
    isUpdateAccountPayableOpen,
    handleCloseUpdateAccountPayable,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useUpdateAccountPayableForm };
