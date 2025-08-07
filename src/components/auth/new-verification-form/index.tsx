"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "framer-motion";

import { ErrorForm } from "../error-form";
import { SuccessForm } from "../success-form";

import { Loader, Lock } from "lucide-react";
import { useNewVerificationValidationToken } from "./hooks";

const NewVerificationForm = (): JSX.Element => {
  const { error, success, countdown } = useNewVerificationValidationToken();

  return (
    <>
      <div className="mb-7 grid gap-2 text-center">
        <motion.h1
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold"
        >
          Verificação de E-mail
        </motion.h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: "tween" }}
        className="w-full flex justify-center"
      >
        <Card className="w-full max-w-[27rem] p-3">
          <CardHeader className="space-y-5 flex items-center justify-center">
            <CardTitle className="flex justify-center items-center">
              <Lock size={45} />
            </CardTitle>

            {success && countdown !== null && (
              <CardDescription className="text-lg animate-pulse text-center">
                Redirecionando para a página de login em{" "}
                <h1
                  className="text-center text-3xl font-bold 
                  tracking-[-0.02em] [text-wrap:balance] mt-3"
                >
                  {countdown}
                </h1>
              </CardDescription>
            )}

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
      </motion.div>
    </>
  );
};

export { NewVerificationForm };
