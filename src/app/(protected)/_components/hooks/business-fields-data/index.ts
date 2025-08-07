interface FieldProps {
  label: string;
  htmlfor: string;
  name: string;
  type: string;
  placeholder: string;
  mask?: string;
  maxLength?: number;
  disabled?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value?: string;
}

const businessFieldsData: FieldProps[] = [
  {
    label: "Razão Social",
    htmlfor: "corporate_reason",
    name: "corporate_reason",
    type: "text",
    placeholder: "Razão social",
  },
  {
    label: "Nome fantasia (opcional)",
    htmlfor: "fantasy_name",
    name: "fantasy_name",
    type: "text",
    placeholder: "Nome fantasia",
  },
  {
    label: "CNPJ",
    htmlfor: "cnpj",
    name: "cnpj",
    type: "text",
    placeholder: "00.000.000/0000-00",
    mask: "99.999.999/9999-99",
  },
  {
    label: "CEP",
    htmlfor: "cep",
    name: "cep",
    type: "text",
    placeholder: "00000-000",
    mask: "99999-999",
  },
  {
    label: "Cidade",
    htmlfor: "city",
    name: "city",
    type: "text",
    placeholder: "Cidade",
  },
  {
    label: "UF",
    htmlfor: "uf",
    name: "uf",
    type: "text",
    placeholder: "UF",
    maxLength: 2,
  },
  {
    label: "Rua",
    htmlfor: "street",
    name: "street",
    type: "text",
    placeholder: "Rua",
  },
  {
    label: "Número",
    htmlfor: "address_number",
    name: "address_number",
    type: "text",
    placeholder: "Número do endereço",
  },
  {
    label: "Complemento (opcional)",
    htmlfor: "complement",
    name: "complement",
    type: "text",
    placeholder: "Complemento",
  },
  {
    label: "CNAE",
    htmlfor: "cnae",
    name: "cnae",
    type: "text",
    placeholder: "CNAE",
    maxLength: 7,
  },
  {
    label: "Código ERP (opcional)",
    htmlfor: "erp_code",
    name: "erp_code",
    type: "text",
    placeholder: "Código ERP",
  },
  {
    label: "Nome do responsável",
    htmlfor: "responsible_name",
    name: "responsible_name",
    type: "text",
    placeholder: "Nome do responsável",
  },
  {
    label: "Telefone",
    htmlfor: "telephone",
    name: "telephone",
    type: "text",
    placeholder: "(00) 00000-0000",
    mask: "(99) 99999-9999",
  },
  {
    label: "E-mail",
    htmlfor: "email",
    name: "email",
    type: "text",
    placeholder: "E-mail do responsável",
  },
];

export { businessFieldsData };
export type { FieldProps };
