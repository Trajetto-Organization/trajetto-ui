import { useState } from "react";

function useCheckBox() {
  const [canRead, setCanRead] = useState<boolean>(false);
  const [canWrite, setCanWrite] = useState<boolean>(false);

  return {
    setCanRead,
    setCanWrite,
    canRead,
    canWrite,
  };
}

export { useCheckBox };
