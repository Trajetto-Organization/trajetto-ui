"use client";

import { useState, useEffect } from "react";
import { Reveal } from "@/components/shared/reveal";

import { useContact } from "./hooks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Clock,
  ClipboardCheck,
  Fuel,
  Globe,
  LayoutGrid,
  Loader,
  Mail,
  MessageSquare,
  Send,
  ShieldCheck,
} from "lucide-react";
import { WhatsappIcon } from "@/components/icons/brand";

const ContactForm = (): JSX.Element => {
  const {
    subject,
    firstName,
    handleSubmit,
    lastName,
    message,
    contactIsLoading,
    handleUpdateSubject,
    handleUpdateFirstName,
    handleUpdateLastName,
    handleUpdateMessage,
  } = useContact();

  // Recursos que o sistema realmente entrega hoje. Substitui os depoimentos
  // de clientes fictícios: enquanto não houver caso real para contar, o
  // produto fala por si.
  const testimonials = [
    {
      quote:
        "Inspeção veicular com foto obrigatória, localização e assinatura — preenchida direto no celular, mesmo sem sinal no pátio.",
      name: "Checklist em campo",
      role: "Aplicativo Android",
      icon: ClipboardCheck,
      color: "#d81b60",
    },
    {
      quote:
        "Abastecimento registrado com foto do odômetro e cálculo automático de custo, sem planilha e sem digitação em duplicidade.",
      name: "Controle de combustível",
      role: "App e painel web",
      icon: Fuel,
      color: "#d81b60",
    },
    {
      quote:
        "Cada empresa enxerga apenas os próprios dados, com perfis de acesso e permissões definidos por você para cada função.",
      name: "Multi-empresa e permissões",
      role: "Segurança de acesso",
      icon: ShieldCheck,
      color: "#d81b60",
    },
    {
      quote:
        "Ordens de serviço, manutenções, multas e contas a pagar reunidas no mesmo lugar, com histórico por veículo e por motorista.",
      name: "Gestão completa da frota",
      role: "Painel web",
      icon: LayoutGrid,
      color: "#d81b60",
    },
  ];

  const [currentTestimonialIndex, setCurrentTestimonialIndex] =
    useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  const currentTestimonial = testimonials[currentTestimonialIndex];

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute -top-24 -right-24 w-64 h-64 
        bg-[#d81b60]/10 rounded-full blur-3xl"
      />
      <div
        className="absolute -bottom-24 -left-24 w-64 
        h-64 bg-[#d81b60]/10 rounded-full blur-3xl"
      />

      <div className="container px-4 md:px-6 py-16 sm:py-20 relative z-10">
        <div className="text-center mb-14 sm:mb-20">
          <Reveal direction="none" delay={300}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Entre em Contato
            </h2>
          </Reveal>
          <Reveal direction="left" delay={400}>
            <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
              Estamos prontos para responder suas dúvidas e ajudar sua empresa a
              otimizar a gestão de frotas
            </p>
          </Reveal>
        </div>

        <div className="grid gap-8 lg:grid-cols-5 lg:gap-16 items-start">
          {/* Info panel */}
          <div className="lg:col-span-2 space-y-8">
            <Card
              className="overflow-hidden border-none shadow-lg 
              bg-gradient-to-br from-[#d81b60]/90 to-[#d81b60]/90 text-white"
            >
              <CardHeader>
                <CardTitle className="text-2xl font-bold">
                  Fale Conosco
                </CardTitle>
                <CardDescription className="text-white/80">
                  Estamos aqui para ajudar com soluções personalizadas para sua
                  frota
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white/10 p-3 rounded-full">
                      <WhatsappIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-white/70">WhatsApp</p>
                      <p className="font-medium text-white/60">
                        Em breve
                        <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                          a definir
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="bg-white/10 p-3 rounded-full">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-white/70">Email</p>
                      <p className="font-medium text-white/60">
                        Em breve
                        <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                          a definir
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="bg-white/10 p-3 rounded-full">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-white/70">Atendimento</p>
                      <p className="font-medium">
                        100% digital, em todo o Brasil
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="bg-white/10 p-3 rounded-full">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-white/70">
                        Horário de Atendimento
                      </p>
                      <p className="font-medium">Seg-Sex: 09:00 - 18:00</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social proof or testimonial */}
            <div
              className="bg-background/50 backdrop-blur-sm border 
              rounded-lg p-4 shadow-sm relative overflow-hidden h-[190px]"
            >
              {/* Changing the key remounts the node, which restarts the CSS
                  animation — that is what replaces AnimatePresence here. The
                  outgoing testimonial is not animated out: the incoming one
                  fades in over the same absolute box, so the swap reads as a
                  crossfade without keeping the old node alive. */}
              <div
                key={currentTestimonialIndex}
                className="animate-fade-up absolute inset-0 p-6"
              >
                <p className="italic text-muted-foreground">
                  &quot;{currentTestimonial.quote}&quot;
                </p>
                <div className="mt-4 flex items-center">
                  <div
                    className="animate-scale-in [animation-delay:200ms]
                      h-10 w-10 rounded-full flex
                      items-center justify-center text-white font-bold"
                    style={{ backgroundColor: currentTestimonial.color }}
                  >
                    <currentTestimonial.icon className="h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium">{currentTestimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentTestimonial.role}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="absolute bottom-2 left-0 right-0 
                flex justify-center space-x-1"
              >
                {testimonials.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      index === currentTestimonialIndex
                        ? "w-4 bg-[#d81b60]"
                        : "w-2 bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden border shadow-xl">
              <div className="h-2 bg-gradient-to-r from-[#d81b60] to-[#f06292]" />
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">
                  Envie-nos uma mensagem
                </CardTitle>
                <CardDescription>
                  Preencha o formulário abaixo e retornaremos o mais rápido
                  possível.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        className="text-sm font-medium 
                        text-muted-foreground"
                      >
                        Primeiro Nome
                      </label>
                      <Input
                        name="first_name"
                        type="text"
                        placeholder="Seu primeiro nome"
                        value={firstName}
                        onChange={(e) => handleUpdateFirstName(e.target.value)}
                        disabled={contactIsLoading}
                        className="h-12 border-muted/30 focus-visible:ring-[#d81b60]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-sm font-medium 
                        text-muted-foreground"
                      >
                        Sobrenome
                      </label>
                      <Input
                        name="last_name"
                        type="text"
                        placeholder="Seu sobrenome"
                        value={lastName}
                        onChange={(e) => handleUpdateLastName(e.target.value)}
                        disabled={contactIsLoading}
                        className="h-12 border-muted/30 
                        focus-visible:ring-[#d81b60]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium 
                      text-muted-foreground"
                    >
                      Assunto
                    </label>
                    <Input
                      name="subject"
                      type="text"
                      placeholder="Qual o assunto da sua mensagem?"
                      value={subject}
                      onChange={(e) => handleUpdateSubject(e.target.value)}
                      disabled={contactIsLoading}
                      className="h-12 border-muted/30 
                      focus-visible:ring-[#d81b60]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Mensagem
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute top-3 left-3 h-5 w-5 text-muted-foreground" />
                      <textarea
                        className="min-h-[160px] w-full rounded-md border border-muted/30 bg-background pl-10 pr-4 py-3 
                        text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none 
                        focus-visible:ring-2 focus-visible:ring-[#d81b60] focus-visible:ring-offset-2 disabled:cursor-not-allowed 
                        disabled:opacity-50 resize-none"
                        name="message"
                        placeholder="Descreva como podemos ajudar você..."
                        value={message}
                        onChange={(e) => handleUpdateMessage(e.target.value)}
                        disabled={contactIsLoading}
                      />
                    </div>
                  </div>

                  <div
                    className="transition-transform duration-200 ease-out
                    hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Button
                      className="w-full h-12 text-base bg-[#d81b60] 
                      transition-all duration-300"
                      size="lg"
                      type="submit"
                      onClick={handleSubmit}
                      disabled={contactIsLoading}
                    >
                      {contactIsLoading ? "Enviando..." : "Enviar Mensagem"}
                      {contactIsLoading ? (
                        <div className="ml-2 animate-spin">
                          <Loader className="h-5 w-5" />
                        </div>
                      ) : (
                        <Send className="ml-2 h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export { ContactForm };
