import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

import { Check, Loader } from "lucide-react";

const MarkAllAsReadButton = ({
  disabled,
}: {
  disabled: boolean;
}): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <Button
      variant="outline"
      size="sm"
      type="submit"
      disabled={disabled || pending}
      className="whitespace-nowrap w-full sm:w-auto"
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
        }
      }}
    >
      <Check className="h-4 w-4 mr-2 flex-shrink-0" />
      <span className="inline">Marcar todas como lidas</span>

      {pending && (
        <div className="animate-spin ml-2 flex-shrink-0">
          <Loader className="h-4 w-4" />
        </div>
      )}
    </Button>
  );
};

export { MarkAllAsReadButton };
