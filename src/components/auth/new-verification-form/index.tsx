"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ErrorForm } from "../error-form";
import { SuccessForm } from "../success-form";

import { Loader, Lock } from "lucide-react";
import { useNewVerificationValidationToken } from "./hooks";

const NewVerificationForm = (): JSX.Element => {
  const { error, success, countdown } = useNewVerificationValidationToken();

  return (
    <>
      <div className="mb-7 grid gap-2 text-center">
        <h1 className="animate-fade-in [animation-delay:200ms] text-3xl font-bold">
          Verificação de E-mail
        </h1>
      </div>

      <div className="animate-fade-down [animation-delay:500ms] w-full flex justify-center">
        <Card className="w-full max-w-[27rem] p-3">
          <CardHeader className="space-y-3 flex items-center justify-center">
            <CardTitle className="flex justify-center items-center">
              <Lock size={45} />
            </CardTitle>

            {!success && !error && (
              <CardDescription className="text-lg animate-pulse">
                Confirmando sua verificação
              </CardDescription>
            )}
          </CardHeader>

          <div
            className="flex flex-col justify-center 
            items-center w-full my-2 text-center"
          >
            {!success && !error && <Loader color="#f50057" size={18} />}
            <SuccessForm message={success} />

            {!success && <ErrorForm message={error} />}
          </div>
        </Card>
      </div>

      {(success || error) && countdown !== null && (
        <p
          className="text-sm text-muted-foreground 
          text-center animate-pulse mt-4"
        >
          Redirecionando para o login em {countdown}...
        </p>
      )}
    </>
  );
};

export { NewVerificationForm };
