import { useState } from "react";

function useNotifications() {
  const [showSpinner, setShowSpinner] = useState<boolean>(false);
  return {
    showSpinner,
    setShowSpinner,
  };
}

export { useNotifications };
