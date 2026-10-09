interface CreateQuoteValidationError {
  name?: string[];
  company?: string[];
  email?: string[];
  telephone?: string[];
  fleet_size?: string[];
  message?: string[];
  createQuoteErrorMessage?: string;
}

type QuoteFieldName = Exclude<
  keyof CreateQuoteValidationError,
  "createQuoteErrorMessage"
>;

interface CreateQuoteFormState {
  createQuoteError?: CreateQuoteValidationError;
  successMessage?: string;
}

interface CreateQuoteContainerProps {
  state: CreateQuoteFormState;
}

export type { CreateQuoteContainerProps, CreateQuoteFormState, QuoteFieldName };
