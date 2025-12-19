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

import { Label } from "@/components/ui/label";
import { permissionLabels, permissions } from "@/lib/permissions";

import { DashboardUpdatePermissionFormState } from "../dto";
import { cn } from "@/lib/utils";

interface DashboardUpdatePermissionProps {
  state: DashboardUpdatePermissionFormState;
  handleUpdatePermissionName: (updatedName: string) => void;
  handleUpdateCanReadPermission: (updatedCanReadPermission: boolean) => void;
  handleUpdateCanWritePermission: (updatedCanWritePermission: boolean) => void;
  handleUpdatePermissionKeyName: (updatedPermissionKeyName: string) => void;
  canWrite: boolean;
  canRead: boolean;
  permissionName: string;
  permissionKeyName: string;
}

const DashboardUpdatePermission = ({
  state,
  canRead,
  canWrite,
  permissionName,
  handleUpdateCanReadPermission,
  handleUpdateCanWritePermission,
  handleUpdatePermissionName,
  handleUpdatePermissionKeyName,
  permissionKeyName,
}: DashboardUpdatePermissionProps): JSX.Element => {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <FormInput
          label={"Nome da Permissão"}
          htmlfor={"action"}
          name="action"
          type="text"
          onChange={(event) =>
            handleUpdatePermissionName(event.currentTarget.value)
          }
          errorName={state.updatePermissionError?.action}
          placeholder={"Digite o nome da permissão"}
          disabled={pending}
          value={permissionName}
        />
      </div>

      <div className="w-full flex flex-col gap-3">
        <div
          className={cn(
            "text-sm font-medium",
            state.updatePermissionError?.permissionKey &&
              "h-4 truncate text-red-500",
          )}
        >
          {state.updatePermissionError?.permissionKey
            ? state.updatePermissionError?.permissionKey
            : "Permissão"}
        </div>
        <Select
          name="permissionKey"
          disabled={pending}
          value={permissionKeyName}
          onValueChange={(value: string) =>
            handleUpdatePermissionKeyName(value)
          }
        >
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
              handleUpdateCanReadPermission(event as boolean);
              if (!event) handleUpdateCanWritePermission(false);
            }}
          />

          <Label
            htmlFor="read"
            className={state?.updatePermissionError?.canRead && "text-red-500"}
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
            onCheckedChange={(event) =>
              handleUpdateCanWritePermission(event as boolean)
            }
          />
          <Label
            htmlFor="write"
            className={state?.updatePermissionError?.canWrite && "text-red-500"}
          >
            Escrita
          </Label>
        </div>
      </div>
    </div>
  );
};

export { DashboardUpdatePermission };
