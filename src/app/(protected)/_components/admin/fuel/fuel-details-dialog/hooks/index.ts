import { useState } from "react";

function useFuelDetailsDialog() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleToggleDialog = () => {
    setIsOpen(!isOpen);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
  };

  const handleOpenDialog = () => {
    setIsOpen(true);
  };

  return {
    isOpen,
    handleToggleDialog,
    handleCloseDialog,
    handleOpenDialog,
  };
}

export { useFuelDetailsDialog };
