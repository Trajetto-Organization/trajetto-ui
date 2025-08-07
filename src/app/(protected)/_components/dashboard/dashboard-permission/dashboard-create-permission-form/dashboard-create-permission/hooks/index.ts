import { useState } from "react";

function useDashboardCheckBox() {
  const [canRead, setCanRead] = useState<boolean>(false);
  const [canWrite, setCanWrite] = useState<boolean>(false);

  return {
    setCanRead,
    setCanWrite,
    canRead,
    canWrite,
  };
}

export { useDashboardCheckBox };
