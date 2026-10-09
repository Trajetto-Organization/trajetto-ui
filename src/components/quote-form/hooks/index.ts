import { useRef } from "react";

function useQuoteForm(dispatch: (payload: FormData) => void) {
  // Mutable: the form's ref callback also hands the element to the live
  // validation (components/quote-form/index.tsx).
  const formRef = useRef<HTMLFormElement | null>(null);

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
