import { useRef } from "react";

function useQuoteForm(dispatch: (payload: FormData) => void) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleReset = () => {
    dispatch({ type: "RESET" } as FormData);
    formRef.current?.reset();
  };

  return {
    formRef,
    handleReset,
  };
}

export { useQuoteForm };
