import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

import { Trash2, Loader } from "lucide-react";

interface DeleteNotificationButtonProps {
  disabled?: boolean;
}

const DeleteNotificationButton = ({
  disabled,
}: DeleteNotificationButtonProps): JSX.Element => {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <Button
      size="icon"
      variant="ghost"
      type="submit"
      className="h-8 w-8 flex-shrink-0"
      title="Excluir notificação"
      disabled={isDisabled}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
      {isDisabled && (
        <div className="animate-spin mr-1">
          <Loader />
        </div>
      )}
    </Button>
  );
};

export { DeleteNotificationButton };
