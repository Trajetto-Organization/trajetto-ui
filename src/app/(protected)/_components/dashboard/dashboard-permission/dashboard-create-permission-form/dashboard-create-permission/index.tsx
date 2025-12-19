import { useFormStatus } from "react-dom";

import FormInput from "@/components/custom/form-input";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DashboardCreatePermissionFormState } from "../dto";
import { useDashboardCheckBox } from "./hooks";

import { Label } from "@/components/ui/label";
import { permissionLabels, permissions } from "@/lib/permissions";

import { cn } from "@/lib/utils";

interface PermissionCheckboxProps {
  state: DashboardCreatePermissionFormState;
}

const DashboardCreatePermission = ({
  state,
}: PermissionCheckboxProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { canRead, canWrite, setCanWrite, setCanRead } = useDashboardCheckBox();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <FormInput
          label={"Nome da Permissão"}
          htmlfor={"action"}
          name="action"
          type="text"
          errorName={state.createPermissionError?.action}
          placeholder={"Digite o nome da permissão"}
          disabled={pending}
        />
      </div>

      <div className="w-full flex flex-col gap-3">
        <div
          className={cn(
            "text-sm font-medium",
            state.createPermissionError?.permissionKey &&
              "h-4 truncate text-red-500",
          )}
        >
          {state.createPermissionError?.permissionKey
            ? state.createPermissionError?.permissionKey
            : "Permissão"}
        </div>
        <Select name="permissionKey" disabled={pending}>
          <SelectTrigger aria-label="Permissão de acesso">
            <SelectValue placeholder="Permissão de acesso" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(permissions).map((permKey) => (
              <SelectItem
                key={permKey}
                value={permKey}
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
              >
                {permissionLabels[permKey]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="read"
            name="canRead"
            checked={canRead}
            disabled={pending}
            onCheckedChange={(event) => {
              setCanRead(event as boolean);
              if (!event) setCanWrite(false);
            }}
          />

          <Label
            htmlFor="read"
            className={state?.createPermissionError?.canRead && "text-red-500"}
          >
            Leitura
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="write"
            name="canWrite"
            checked={canWrite}
            disabled={!canRead || pending}
            onCheckedChange={(event) => setCanWrite(event as boolean)}
          />

          <Label
            htmlFor="write"
            className={state?.createPermissionError?.canWrite && "text-red-500"}
          >
            Escrita
          </Label>
        </div>
      </div>
    </div>
  );
};

export { DashboardCreatePermission };
