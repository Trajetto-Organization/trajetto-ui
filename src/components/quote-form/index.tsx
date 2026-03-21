"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import Link from "next/link";
import Turnstile from "react-turnstile";

import type {
  CreateQuoteContainerProps,
  CreateQuoteFormState,
} from "./quote-form.types";

import { handleQuoteSubmit } from "@/actions/quote/create-quote";
import {
  BarChart3,
  Building,
  Check,
  ChevronRight,
  Loader,
  Mail,
  Phone,
  Shield,
  User,
  Fuel,
} from "lucide-react";
import FormInput from "@/components/shared/custom/form-input";

import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import { motion } from "framer-motion";
import { ErrorForm } from "../auth/error-form";

import { useQuoteForm } from "./hooks";
import { cn } from "@/lib/utils";

import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const QuoteFormContainer = ({
  state,
}: CreateQuoteContainerProps): JSX.Element => {
  const { pending } = useFormStatus();
  const [isCaptchaValid, setIsCaptchaValid] = useState<boolean>(false);

  const inputFields = [
    {
      label: "Nome completo",
      name: "name",
      htmlfor: "name",
      placeholder: "Seu nome completo",
      type: "text",
      icon: <User className="h-4 w-4 text-gray-500" />,
    },
    {
      label: "Empresa",
      name: "company",
      htmlfor: "company",
      placeholder: "Nome da empresa",
      type: "text",
      icon: <Building className="h-4 w-4 text-gray-500" />,
    },
    {
      label: "E-mail",
      name: "email",
      htmlfor: "email",
      placeholder: "seu@email.com",
      type: "email",
      icon: <Mail className="h-4 w-4 text-gray-500" />,
    },
    {
      label: "Telefone",
      name: "telephone",
      htmlfor: "telephone",
      placeholder: "(00) 00000-0000",
      mask: "(99) 99999-9999",
      type: "tel",
      icon: <Phone className="h-4 w-4 text-gray-500" />,
    },
  ];

  const selectOptions = [
    { value: "1-5", label: "1 a 5 veículos" },
    { value: "6-15", label: "6 a 15 veículos" },
    { value: "16-30", label: "16 a 30 veículos" },
    { value: "31-50", label: "31 a 50 veículos" },
    { value: "51-100", label: "51 a 100 veículos" },
    { value: "101+", label: "Mais de 100 veículos" },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {inputFields.map((field) => (
          <FormInput
            key={field.name}
            label={field.label}
            htmlfor={field.htmlfor}
            name={field.name}
            type={field.type}
            placeholder={field.placeholder}
            icon={field.icon}
            errorName={(state?.createQuoteError as any)?.[field.name]}
            disabled={pending}
            mask={field.mask}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {state.createQuoteError?.fleet_size ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Label
                  className={cn("h-4 truncate text-red-500")}
                  htmlFor="fleet_size"
                >
                  {state.createQuoteError.fleet_size[0]}
                </Label>
              </TooltipTrigger>
              <TooltipContent
                align="start"
                className="max-w-[300px] p-2
                break-words whitespace-normal"
              >
                {state.createQuoteError.fleet_size[0]}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Label htmlFor="fleet_size" className="h-4 truncate">
            Tamanho da frota <span className="text-red-500">*</span>
          </Label>
        )}
        <Select name="fleet_size" disabled={pending}>
          <SelectTrigger id="fleet_size" className="w-full h-10">
            <SelectValue
              placeholder="Selecione o tamanho da sua frota"
              className="pl-7"
            />
          </SelectTrigger>
          <SelectContent>
            {selectOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {state.createQuoteError?.message ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Label
                  className={cn("h-4 truncate text-red-500")}
                  htmlFor="message"
                >
                  {state.createQuoteError.message[0]}
                </Label>
              </TooltipTrigger>
              <TooltipContent
                align="start"
                className="max-w-[300px] p-2
                break-words whitespace-normal"
              >
                {state.createQuoteError.message[0]}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Label htmlFor="message" className="h-4 truncate">
            Mensagem (opcional)
          </Label>
        )}
        <Textarea
          name="message"
          id="message"
          placeholder="Conte-nos mais sobre suas necessidades..."
          className="min-h-[120px] resize-none"
          disabled={pending}
        />
      </div>

      <ErrorForm message={state?.createQuoteError?.createQuoteErrorMessage} />

      <Button
        type="submit"
        className="w-full mt-6 bg-[#d81b60]
        hover:bg-[#c2185b] text-white"
        disabled={
          (process.env.NODE_ENV === "production" && !isCaptchaValid) || pending
        }
      >
        Solicitar Orçamento
        {pending && (
          <div className="ml-2 animate-spin">
            <Loader />
          </div>
        )}
      </Button>

      {process.env.NODE_ENV === "production" && (
        <>
          <Turnstile
            sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={(token) => {
              const input = document.getElementById(
                "quote-turnstile-token",
              ) as HTMLInputElement;

              if (input) input.value = token;
              setIsCaptchaValid(true);
            }}
            theme="auto"
            size="flexible"
            className="mt-5"
          />
          <input
            id="quote-turnstile-token"
            type="hidden"
            name="turnstileToken"
          />
        </>
      )}
    </>
  );
};

const QuoteForm = (): JSX.Element => {
  const defaultState: CreateQuoteFormState = {};

  const [state, dispatch] = useFormState(handleQuoteSubmit, null);
  const { formRef, handleReset } = useQuoteForm(dispatch);

  const benefits = [
    {
      title: "Redução de Custos",
      description:
        "Reduza gastos com combustível, manutenção e multas em até 30%",
      icon: <BarChart3 className="h-8 w-8 text-[#d81b60]" />,
    },
    {
      title: "Controle Multi-Filiais",
      description:
        "Gerencie múltiplas filiais em uma única plataforma com segurança segmentada de dados",
      icon: <Building className="h-8 w-8 text-[#d81b60]" />,
    },
    {
      title: "Gestão de Combustível",
      description:
        "Controle abastecimentos, quilometragem e custos por litro automaticamente",
      icon: <Fuel className="h-8 w-8 text-[#d81b60]" />,
    },
    {
      title: "Gestão Completa",
      description:
        "Centralize manutenções, documentos e despesas em uma única plataforma",
      icon: <Shield className="h-8 w-8 text-[#d81b60]" />,
    },
  ];

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariant = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <>
      <section
        className="relative py-28 bg-gradient-to-b 
        from-background to-background/90 overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-grid-pattern 
          opacity-[0.03] pointer-events-none"
        />

        <div className="container px-4 mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 
              bg-clip-text text-transparent bg-gradient-to-r pb-1 md:pb-2 lg:pb-3
              from-foreground to-foreground/70"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Transforme sua Gestão de Frotas Hoje
            </motion.h1>
            <motion.p
              className="text-xl text-muted-foreground mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Solicite um orçamento personalizado e descubra como o Trajetto
              pode revolucionar a eficiência da sua operação com tecnologia de
              ponta.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link
                href={"#budget"}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  `bg-[#d81b60] hover:bg-[#c2185b] 
                  text-white rounded-full group`,
                )}
              >
                Solicitar Orçamento
                <div className="ml-2">
                  <ChevronRight
                    size={20}
                    className="group-hover:translate-x-1
                    transition-all duration-300"
                  />
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-11 bg-muted/30">
        <div className="container px-4 mx-auto">
          <motion.h2
            className="text-3xl font-bold text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Por que escolher o Trajetto?
          </motion.h2>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="bg-white dark:bg-gray-900/60 p-6 
                rounded-xl shadow-sm border border-border/50"
                variants={itemVariant}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 bg-primary/5 rounded-full mb-4">
                    {benefit.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="budget" className="py-20 bg-background">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            <motion.div
              className="flex-1 w-full"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div
                className="bg-white dark:bg-gray-900/50 
                p-8 rounded-2xl shadow-lg border border-border/50"
              >
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Solicite seu orçamento
                </h2>
                <p className="text-muted-foreground mb-8">
                  Preencha o formulário e nossa equipe entrará em contato em até
                  24 horas.
                </p>

                {state?.successMessage ? (
                  <div
                    className="p-8 bg-green-50 dark:bg-green-900/20 
                    rounded-xl border border-green-200 dark:border-green-800"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div
                        className="w-16 h-16 bg-green-100 dark:bg-green-800/30 
                        rounded-full flex items-center justify-center mb-4"
                      >
                        <Check
                          className="w-8 h-8 text-green-600 
                        dark:text-green-400"
                        />
                      </div>
                      <h3
                        className="text-2xl font-bold text-green-800 
                        dark:text-green-400 mb-2"
                      >
                        Orçamento Solicitado!
                      </h3>
                      <p className="text-green-700 dark:text-green-300 mb-4">
                        Recebemos sua solicitação com sucesso. Em breve, um
                        especialista entrará em contato.
                      </p>
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="mt-4"
                      >
                        Enviar outro orçamento
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form ref={formRef} action={dispatch}>
                    <QuoteFormContainer state={state ?? defaultState} />
                  </form>
                )}
              </div>
            </motion.div>

            <motion.div
              className="lg:w-2/5"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div
                className="bg-[#d81b60]/5 dark:bg-[#d81b60]/10 
                p-8 rounded-2xl border border-[#d81b60]/20"
              >
                <h3 className="text-2xl font-bold mb-6">O que oferecemos</h3>
                <ul className="space-y-4">
                  {[
                    "Gestão completa de ordens de serviço",
                    "Controle de combustível e manutenções",
                    "Gestão de multas e documentos",
                    "Relatórios detalhados de desempenho",
                    "Controle de usuários com autenticação 2FA",
                    "Gerencie múltiplas filiais em uma única plataforma",
                    "Exportação de relatórios em Excel e CSV",
                    "Integração com WhatsApp para notificações",
                    "Controle granular de permissões por usuário",
                    "Gestão de motoristas e documentação",
                    "Dashboards com métricas essenciais",
                    "Suporte técnico especializado",
                    "Histórico completo",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start">
                      <Check
                        className="h-5 w-5 text-[#d81b60] 
                        mr-3 mt-0.5 flex-shrink-0"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div
                  className="mt-8 p-4 bg-white 
                dark:bg-gray-900/50 rounded-xl"
                >
                  <p className="font-medium text-lg mb-2">Não perca tempo!</p>
                  <p className="text-muted-foreground">
                    Cada dia sem um sistema eficiente de gestão de frotas pode
                    estar custando à sua empresa recursos valiosos.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export { QuoteForm };
