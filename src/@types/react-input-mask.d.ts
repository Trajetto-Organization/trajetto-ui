declare module "react-input-mask" {
  import * as React from "react";

  export interface ReactInputMaskProps extends React.InputHTMLAttributes<HTMLInputElement> {
    mask: string;
    maskChar?: string | null;
    alwaysShowMask?: boolean;
    beforeMaskedValueChange?: any;
    formatChars?: { [key: string]: string };
    inputRef?: React.Ref<any>;
    children?: (inputProps: any) => React.ReactNode;
  }

  const InputMask: React.FC<ReactInputMaskProps>;
  export default InputMask;
}
