import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

import { Check, Loader } from "lucide-react";

const MarkAsReadButton = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <Button
      size="sm"
      variant="outline"
      type="submit"
      disabled={pending}
      className="whitespace-nowrap"
    >
      <Check className="h-4 w-4 mr-2 flex-shrink-0" />

      <span className="hidden sm:inline">Marcar como lida</span>
      <span className="inline sm:hidden">Lida</span>

      {pending && (
        <div className="animate-spin ml-2 flex-shrink-0">
          <Loader className="h-4 w-4" />
        </div>
      )}
    </Button>
  );
};

export { MarkAsReadButton };
