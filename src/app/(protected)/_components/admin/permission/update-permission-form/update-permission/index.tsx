import { useFormStatus } from "react-dom";

import FormInput from "@/components/shared/custom/form-input";
import { SelectField } from "@/app/(protected)/_components/shared/custom/select-field";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import type { UpdatePermissionFormState } from "../update-permission-form.types";
import { permissionLabels, permissions } from "@/lib/permissions";

interface UpdatePermissionProps {
  state: UpdatePermissionFormState;
  handleUpdatePermissionName: (updatedName: string) => void;
  handleUpdateCanReadPermission: (updatedCanReadPermission: boolean) => void;
  handleUpdateCanWritePermission: (updatedCanWritePermission: boolean) => void;
  handleUpdatePermissionKeyName: (updatedPermissionKeyName: string) => void;
  canWrite: boolean;
  canRead: boolean;
  permissionName: string;
  permissionKeyName: string;
}

const UpdatePermission = ({
  state,
  canRead,
  canWrite,
  permissionName,
  handleUpdateCanReadPermission,
  handleUpdateCanWritePermission,
  handleUpdatePermissionName,
  handleUpdatePermissionKeyName,
  permissionKeyName,
}: UpdatePermissionProps): JSX.Element => {
  const { pending } = useFormStatus();

  const permissionOptions = Object.values(permissions).map((permKey) => ({
    value: permKey,
    label: permissionLabels[permKey],
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <FormInput
          label={"Nome da Permissão *"}
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

      <SelectField
        label="Permissão *"
        htmlfor="permissionKey"
        name="permissionKey"
        placeholder="Permissão de acesso"
        value={permissionKeyName}
        onChange={handleUpdatePermissionKeyName}
        errorName={state.updatePermissionError?.permissionKey}
        options={permissionOptions}
        disabled={pending}
      />

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

export { UpdatePermission };
