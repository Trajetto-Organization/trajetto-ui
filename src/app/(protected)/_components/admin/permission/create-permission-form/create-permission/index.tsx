import { useFormStatus } from "react-dom";

import FormInput from "@/components/custom/form-input";
import { SelectField } from "@/app/(protected)/_components/custom";

import { Checkbox } from "@/components/ui/checkbox";

import { CreatePermissionFormState } from "../dto";
import { useCheckBox } from "./hooks";

import { Label } from "@/components/ui/label";
import { permissionLabels, permissions } from "@/lib/permissions";

interface PermissionCheckboxProps {
  state: CreatePermissionFormState;
}

const CreatePermission = ({ state }: PermissionCheckboxProps): JSX.Element => {
  const { pending } = useFormStatus();
  const { canRead, canWrite, setCanWrite, setCanRead } = useCheckBox();

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
          errorName={state.createPermissionError?.action}
          placeholder={"Digite o nome da permissão"}
          disabled={pending}
        />
      </div>

      <SelectField
        label="Permissão *"
        htmlfor="permissionKey"
        name="permissionKey"
        placeholder="Permissão de acesso"
        errorName={state.createPermissionError?.permissionKey}
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

export { CreatePermission };
