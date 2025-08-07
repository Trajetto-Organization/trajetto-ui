import { useEffect, useState } from "react";
import { toast } from "sonner";

function useUpdateBranchForm() {
  const [isUpdateBranchOpen, setIsUpdateBranchOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateBranch = () => {
    if (isUpdateBranchOpen) {
      toast.dismiss();
    }

    setIsDropdownOpen(false);
    setIsUpdateBranchOpen(!isUpdateBranchOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  useEffect(() => {
    return () => {
      if (isUpdateBranchOpen) {
        toast.dismiss();
      }
    };
  }, [isUpdateBranchOpen]);

  return {
    isUpdateBranchOpen,
    handleCloseUpdateBranch,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useUpdateBranchForm };
