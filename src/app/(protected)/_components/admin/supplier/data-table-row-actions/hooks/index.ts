import { useEffect, useState } from "react";
import { toast } from "sonner";

function useUpdateSupplierForm() {
  const [isUpdateSupplierOpen, setIsUpdateSupplierOpen] =
    useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseUpdateSupplier = () => {
    setIsDropdownOpen(false);
    setIsUpdateSupplierOpen(!isUpdateSupplierOpen);
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  useEffect(() => {
    return () => {
      if (isUpdateSupplierOpen) {
        toast.dismiss();
      }
    };
  }, [isUpdateSupplierOpen]);

  return {
    isUpdateSupplierOpen,
    handleCloseUpdateSupplier,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useUpdateSupplierForm };
