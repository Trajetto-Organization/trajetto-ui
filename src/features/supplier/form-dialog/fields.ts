import type { FieldProps } from "@/app/(protected)/_components/shared/common.types";

/**
 * Which of the shared address fields a supplier has, in which order, and how
 * each is labelled (decision 3.3: "Nome *" required, "Nome (opcional)").
 *
 * Both old forms built this list inline and differently from each other;
 * the admin one also kept the company's own fields out by name. One list
 * here, pure, so it is tested without rendering a dialog.
 */
const SUPPLIER_FIELD_ORDER = [
  "name",
  "cnpj",
  "email",
  "telephone",
  "cep",
  "city",
  "uf",
  "street",
  "address_number",
  "complement",
] as const;

const REQUIRED = new Set<string>(["name", "cnpj"]);

/** "CEP *" → "CEP (opcional)"; required ones keep their star. */
function labelFor(name: string, label: string): string {
  const text = label
    .replace(/\s*\*\s*$/, "")
    .replace(/\s*\(opcional\)\s*$/i, "");

  return REQUIRED.has(name) ? `${text} *` : `${text} (opcional)`;
}

interface SupplierFieldLayoutInput {
  /** The address fields of useCepValidation (values, masks, handlers). */
  addressFields: FieldProps[];
  name: string;
  onNameChange: (value: string) => void;
}

function supplierFieldLayout({
  addressFields,
  name,
  onNameChange,
}: SupplierFieldLayoutInput): FieldProps[] {
  const byName = new Map(addressFields.map((field) => [field.name, field]));

  const nameField: FieldProps = {
    label: "Nome do Fornecedor *",
    htmlfor: "name",
    name: "name",
    type: "text",
    placeholder: "Nome completo do fornecedor",
    value: name,
    onChange: (event) => onNameChange(event.target.value),
    autoComplete: "organization",
  };

  return SUPPLIER_FIELD_ORDER.flatMap((fieldName) => {
    if (fieldName === "name") return [nameField];

    const field = byName.get(fieldName);

    if (!field) return [];

    return [
      {
        ...field,
        label: labelFor(fieldName, field.label),
        ...(fieldName === "email" && {
          placeholder: "compras@fornecedor.com.br",
        }),
      },
    ];
  });
}

export { SUPPLIER_FIELD_ORDER, supplierFieldLayout };
