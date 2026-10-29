import { ShieldAlert } from "lucide-react";

interface FormErrorProps {
  message?: string;
}

const ErrorForm = ({ message }: FormErrorProps): JSX.Element | null => {
  if (!message) return null;

  return (
    // An alert: the answer of a submit ("Falha no desafio de segurança.")
    // is read out without moving focus.
    <div
      role="alert"
      className="animate-toast-in bg-red-100 p-3 rounded-md
      flex items-center gap-x-2 text-sm
      text-destructive mt-5 dark:bg-red-500/10 dark:text-red-300"
    >
      <ShieldAlert aria-hidden="true" className="w-5 h-5 flex-shrink-0" />
      <p className="break-words ml-1">{message}</p>
    </div>
  );
};

export { ErrorForm };
