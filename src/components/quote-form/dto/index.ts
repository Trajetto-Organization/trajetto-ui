interface CreateBusinessValidationError {
  name?: string[];
  company?: string[];
  telephone?: string[];
  fleet_size?: string[];
  message?: string[];
  createQuoteErrorMessage?: string;
}

interface CreateQuoteFormState {
  createQuoteError?: CreateBusinessValidationError;
  successMessage?: string;
}

interface CreateQuoteContainerProps {
  state: CreateQuoteFormState;
}

export type { CreateQuoteContainerProps, CreateQuoteFormState };
