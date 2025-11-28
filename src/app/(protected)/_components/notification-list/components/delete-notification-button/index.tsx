import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

import { Trash2, Loader } from "lucide-react";

const DeleteNotificationButton = (): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <Button
      size="icon"
      variant="ghost"
      type="submit"
      className="h-8 w-8 flex-shrink-0"
      title="Excluir notificação"
      disabled={pending}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
      {pending && (
        <div className="animate-spin mr-1">
          <Loader />
        </div>
      )}
    </Button>
  );
};

export { DeleteNotificationButton };
