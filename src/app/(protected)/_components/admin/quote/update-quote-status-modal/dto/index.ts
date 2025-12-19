import { QuoteStatus } from "../../dto";

interface UpdateQuoteValidationError {
  status?: string[];
  notes?: string[];
  updateQuoteErrorMessage?: string;
}

interface UpdateQuoteFormState {
  updateQuoteError?: UpdateQuoteValidationError;
  successMessage?: string;
}

interface UpdateQuoteFormSubmitProps {
  state: UpdateQuoteFormState;
  status: QuoteStatus;
  notes: string | null | undefined;
  onClose: () => void;
  handleUpdateNotes: (updateNotes: string) => void;
  handleUpdateStatus: (updateStatus: QuoteStatus) => void;
  isQuoteStatusDirty: boolean;
}

export type { UpdateQuoteFormSubmitProps, UpdateQuoteFormState };
