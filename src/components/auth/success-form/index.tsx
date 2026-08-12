import { MailCheck } from "lucide-react";

interface FormErrorProps {
  message?: string;
}

const SuccessForm = ({ message }: FormErrorProps): JSX.Element | null => {
  if (!message) return null;

  return (
    <div
      className="animate-toast-in bg-emerald-100 p-3 rounded-md flex 
      items-center gap-x-2 text-sm text-emerald-500 mt-5"
    >
      <MailCheck className="w-5 h-5 flex-shrink-0" />
      <p className="break-words ml-2">{message}</p>
    </div>
  );
};

export { SuccessForm };
