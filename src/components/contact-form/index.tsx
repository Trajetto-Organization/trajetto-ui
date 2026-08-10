"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

import { Loader, Mail, MessageSquare, Send, MapPin, Clock } from "lucide-react";
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

  const testimonials = [
    {
      quote:
        "A Trajetto transformou completamente nossa logística. Reduzimos custos operacionais em 30% no primeiro trimestre!",
      name: "Roberto Martins",
      role: "Diretor de Operações, LogTech",
      initials: "RM",
      color: "#d81b60",
    },
    {
      quote:
        "O sistema de gestão da Trajetto nos permitiu otimizar rotas e economizar combustível. Resultado imediato na nossa operação!",
      name: "Camila Souza",
      role: "Gerente de Frotas, TransporteMax",
      initials: "CS",
      color: "#d81b60",
    },
    {
      quote:
        "Após implementar as soluções da Trajetto, conseguimos reduzir o tempo de inatividade dos veículos em 45%. Impressionante!",
      name: "Fernando Almeida",
      role: "CEO, ExpressLog",
      initials: "FA",
      color: "#d81b60",
    },
    {
      quote:
        "A interface intuitiva e os relatórios detalhados nos deram visibilidade total da nossa operação. Recomendo fortemente.",
      name: "Juliana Costa",
      role: "Supervisora de Logística, CargoNet",
      initials: "JC",
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
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold tracking-tight"
          >
            Entre em Contato
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, type: "tween" }}
            className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Estamos prontos para responder suas dúvidas e ajudar sua empresa a
            otimizar a gestão de frotas
          </motion.p>
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
                      <p className="font-medium">+55 (31) 999999-9999</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="bg-white/10 p-3 rounded-full">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-white/70">Email</p>
                      <p className="font-medium">contato@intrajetto.com</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="bg-white/10 p-3 rounded-full">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-white/70">Endereço</p>
                      <p className="font-medium">
                        Av. Afonso Pena, 1500 - Belo Horizonte, MG
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
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTestimonialIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 p-6"
                >
                  <p className="italic text-muted-foreground">
                    &quot;{currentTestimonial.quote}&quot;
                  </p>
                  <div className="mt-4 flex items-center">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="h-10 w-10 rounded-full flex 
                      items-center justify-center text-white font-bold"
                      style={{ backgroundColor: currentTestimonial.color }}
                    >
                      {currentTestimonial.initials}
                    </motion.div>
                    <div className="ml-3">
                      <p className="font-medium">{currentTestimonial.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {currentTestimonial.role}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

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

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
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
                  </motion.div>
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
