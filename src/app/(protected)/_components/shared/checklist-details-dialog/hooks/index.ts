import { useState } from "react";

function useChecklistDetailsDialog() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleToggleDialog = () => {
    setIsOpen(!isOpen);
  };

  return {
    isOpen,
    handleToggleDialog,
  };
}

export { useChecklistDetailsDialog };
