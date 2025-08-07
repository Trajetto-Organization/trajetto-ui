export interface DriverProps {
  label: string;
  htmlfor: string;
  name: string;
  type: string;
  placeholder: string;
  mask?: string;
  maxLength?: number;
  disabled?: boolean;
  required?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value?: string;
}

const driverFieldsData: DriverProps[] = [
  {
    label: "Nome do motorista",
    htmlfor: "name",
    name: "name",
    type: "text",
    placeholder: "Digite o nome do motorista",
  },
  {
    label: "Data de Nascimento",
    htmlfor: "birth_date",
    name: "birth_date",
    type: "date",
    placeholder: "Selecione uma data",
  },
  {
    label: "CPF",
    htmlfor: "cpf",
    name: "cpf",
    type: "text",
    placeholder: "000.000.000-00",
    mask: "999.999.999-99",
  },
  {
    label: "RG",
    htmlfor: "rg",
    name: "rg",
    type: "text",
    placeholder: "00.000.000-0",
    mask: "99.999.999-9",
  },
  {
    label: "CNH",
    htmlfor: "cnh",
    name: "cnh",
    type: "text",
    placeholder: "00000000000",
    mask: "99999999999",
  },
  {
    label: "Status",
    htmlfor: "status",
    name: "status",
    type: "select",
    placeholder: "Selecione o status",
  },
  {
    label: "Tipo de Contrato",
    htmlfor: "contract_type",
    name: "contract_type",
    type: "select",
    placeholder: "Selecione o tipo de contrato",
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
    label: "Complemento",
    htmlfor: "complement",
    name: "complement",
    type: "text",
    placeholder: "Complemento",
  },
];

export { driverFieldsData };
