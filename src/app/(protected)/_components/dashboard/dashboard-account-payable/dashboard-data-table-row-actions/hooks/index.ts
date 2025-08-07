import { useEffect, useState } from "react";
import { toast } from "sonner";

function useDashboardUpdateAccountPayableForm() {
  const [
    isDashboardUpdateAccountPayableOpen,
    setIsDashboardUpdateAccountPayableOpen,
  ] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const handleCloseDashboardUpdateAccountPayable = () => {
    if (isDashboardUpdateAccountPayableOpen) {
      toast.dismiss();
    }

    setIsDropdownOpen(false);
    setIsDashboardUpdateAccountPayableOpen(
      !isDashboardUpdateAccountPayableOpen,
    );
  };

  const handleOpenDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  useEffect(() => {
    return () => {
      if (isDashboardUpdateAccountPayableOpen) {
        toast.dismiss();
      }
    };
  }, [isDashboardUpdateAccountPayableOpen]);

  return {
    isDashboardUpdateAccountPayableOpen,
    handleCloseDashboardUpdateAccountPayable,
    handleOpenDropdown,
    isDropdownOpen,
  };
}

export { useDashboardUpdateAccountPayableForm };
