import { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Redefinir minha senha",
    description: "Redefina sua senha para recuperar o acesso à sua conta.",
  };
}

const ResetPassword = (): JSX.Element => {
  return <ResetPasswordForm />;
};

export default ResetPassword;
