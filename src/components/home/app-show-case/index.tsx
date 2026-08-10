"use client";

import { useRef } from "react";

import Link from "next/link";
import Image from "next/image";

import { motion, useInView } from "framer-motion";
import { Camera, MapPin, ShieldCheck, WifiOff } from "lucide-react";

import { Step } from "@/components/step";
import { AndroidIcon } from "@/components/icons/brand";

// Import estático: o Next lê as dimensões no build e gera o `blurDataURL`
// sozinho, então o blur sai de graça e sem CLS. Com `src="/arquivo.webp"`
// (string) nada disso acontece.
import dashboardScreen from "@/../public/mobile-app-dashboard.webp";
import fuelScreen from "@/../public/mobile-app-fuel.webp";

import checklistScreen from "@/../public/mobile-app-vehicle-checklist.webp";

const AppShowcase = (): JSX.Element => {
  const sectionRef = useRef(null);
  const phonesRef = useRef(null);

  const downloadRef = useRef(null);

  const isPhonesInView = useInView(phonesRef, { once: true, amount: 0.3 });
  const isDownloadInView = useInView(downloadRef, { once: true, amount: 0.5 });

  const phoneScreens = [
    {
      title: "Selecione seu Veículo",
      description:
        "Encontre rapidamente o veículo da frota, visualize o status dos veículos e escolha entre abastecimento ou checklist.",
      image: dashboardScreen,
      color: "from-blue-500/20 to-purple-500/20",
    },
    {
      title: "Abastecimento Inteligente",
      description:
        "Registre abastecimentos em segundos com foto do odômetro, calcule custos automaticamente e mantenha seu controle em dia.",
      image: fuelScreen,
      color: "from-purple-500/20 to-pink-500/20",
    },
    {
      title: "Checklist Completo",
      description:
        "Realize inspeções veiculares detalhadas com fotos obrigatórias, garanta a segurança da frota e documente tudo no app.",
      image: checklistScreen,
      color: "from-green-500/20 to-blue-500/20",
    },
  ];

  // Capacidades que o app realmente entrega hoje — nada aqui é promessa.
  const appCapabilities = [
    {
      icon: WifiOff,
      title: "Funciona sem internet",
      description:
        "O formulário e as fotos ficam salvos no aparelho. Se o app fechar ou o sinal cair, nada se perde.",
      color: "#2563eb",
    },
    {
      icon: Camera,
      title: "Foto direto do campo",
      description:
        "Odômetro e checklist são registrados com foto tirada na hora, otimizada antes do envio.",
      color: "#7c3aed",
    },
    {
      icon: MapPin,
      title: "Localização no registro",
      description:
        "O abastecimento captura a posição no momento do envio, não uma posição antiga guardada.",
      color: "#059669",
    },
    {
      icon: ShieldCheck,
      title: "Envio sem duplicar",
      description:
        "Se a conexão falhar no meio, tentar de novo não cria um segundo lançamento no sistema.",
      color: "#d81b60",
    },
  ];

  const phoneContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const phoneItemVariants = {
    hidden: { opacity: 0, y: 80, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.215, 0.61, 0.15, 1], // Ease out cubic
      },
    },
  };

  const phoneTextVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: 0.2,
        ease: "easeOut",
      },
    },
  };

  const downloadVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: "easeOut",
      },
    },
  };

  return (
    <>
      <div
        className="w-full flex flex-row 
        justify-center h-24 mt-5 mb-16"
        id="app"
      >
        <Step />
      </div>
      <section
        className="min-h-screen py-12 px-6 
        md:px-16 overflow-hidden"
        ref={sectionRef}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-20">
            <h2
              className="text-3xl md:text-5xl font-display 
              font-bold tracking-tight"
            >
              Gestão de Frotas na Palma da Mão
            </h2>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Aplicativo operacional para equipe de campo. Registre
              abastecimentos e realize checklists veiculares direto do
              smartphone.
            </p>
          </div>

          <motion.div
            ref={phonesRef}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 lg:gap-8"
            initial="hidden"
            animate={isPhonesInView ? "visible" : "hidden"}
            variants={phoneContainerVariants}
          >
            {phoneScreens.map((screen, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center"
                variants={phoneItemVariants}
                custom={index}
              >
                <motion.div
                  className="relative mb-8 w-full 
                  max-w-[280px] mx-auto"
                  whileHover={{
                    y: -10,
                    transition: { duration: 0.3 },
                  }}
                >
                  <div
                    className={`
                      absolute -inset-4 rounded-full 
                      bg-gradient-radial ${screen.color} blur-2xl 
                      opacity-70 -z-10
                    `}
                  />

                  <div
                    className="phone-frame shadow-lg overflow-hidden 
                    rounded-[32px] border-[8px] border-gray-900 
                    relative h-full"
                  >
                    <Image
                      src={screen.image}
                      alt={screen.title}
                      className="w-full h-full object-cover"
                      placeholder="blur"
                      sizes="(max-width: 768px) 280px, (max-width: 1024px) 30vw, 280px"
                      fill
                    />
                  </div>
                </motion.div>

                <motion.div
                  className="text-center px-4"
                  variants={phoneTextVariants}
                >
                  <h3 className="text-xl font-display font-semibold mb-2">
                    {screen.title}
                  </h3>
                  <p className="text-muted-foreground">{screen.description}</p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>

          {/* Capacidades reais do app de campo */}
          <motion.div
            className="mt-24 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            animate={isPhonesInView ? "visible" : "hidden"}
            variants={phoneContainerVariants}
          >
            {appCapabilities.map((capability) => (
              <motion.div
                key={capability.title}
                variants={phoneTextVariants}
                // Hover em CSS, não em `whileHover`: ao sair do hover o
                // framer-motion volta usando a transição do estado base — que
                // aqui é a variante de entrada, com `delay: 0.2` e `duration:
                // 0.6`. Era isso que fazia a volta parecer travada. Em CSS ida
                // e volta usam a mesma curva e a mesma duração.
                className="group h-full rounded-2xl border border-zinc-200/80
                bg-white/60 p-6 shadow-sm backdrop-blur-sm
                transition-[transform,box-shadow] duration-200 ease-out
                hover:-translate-y-1.5 hover:shadow-lg"
              >
                <div
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl
                  transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${capability.color}15` }}
                >
                  <capability.icon
                    className="h-5 w-5"
                    style={{ color: capability.color }}
                  />
                </div>

                <h3 className="mb-2 text-base font-semibold tracking-tight text-slate-800">
                  {capability.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {capability.description}
                </p>

                <div
                  className="mt-4 h-0.5 w-8 rounded-full transition-[width]
                  duration-200 ease-out group-hover:w-full"
                  style={{ backgroundColor: capability.color }}
                />
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="mt-24"
            ref={downloadRef}
            initial="hidden"
            animate={isDownloadInView ? "visible" : "hidden"}
            variants={downloadVariants}
          >
            <div
              className="flex flex-col md:flex-row items-center 
              justify-center w-full gap-8 md:gap-16 max-w-3xl mx-auto"
            >
              <motion.div
                className="w-full md:w-auto md:min-w-[220px]"
                whileHover={{
                  scale: 1.03,
                  y: -2,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 10,
                }}
              >
                <Link
                  href="/contact"
                  className="button-shine bg-[#d81b60] text-white rounded-full 
                  px-8 py-3 text-base font-medium shadow-lg inline-block
                  text-center w-full relative overflow-hidden"
                >
                  <span className="relative z-10">Quero ser avisado!</span>
                  <div className="shine-effect" />
                </Link>
              </motion.div>

              {/* Card do QR Code */}
              <motion.div
                className="flex flex-col md:flex-row items-center gap-6 
                p-6 rounded-xl shadow-sm w-full"
                whileHover={{
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                  y: -5,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
              >
                <div className="flex-shrink-0">
                  <div
                    className="flex h-[130px] w-[130px] items-center justify-center
                    rounded-2xl border border-zinc-200 bg-gradient-to-br
                    from-zinc-50 to-blue-50/60 shadow-sm"
                  >
                    <AndroidIcon size={56} color="#3DDC84" />
                  </div>
                </div>

                <div className="flex flex-col text-left">
                  <span
                    className="mb-2 w-fit rounded-full bg-blue-50 px-3 py-1
                    text-[11px] font-semibold uppercase tracking-widest text-blue-700"
                  >
                    Em breve
                  </span>

                  <h3 className="font-bold text-lg">
                    Aplicativo Android a caminho
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    O app de campo está em fase final de testes. Deixe seu
                    contato e avisamos assim que a publicação sair.
                  </p>

                  <p className="mt-4 text-base font-semibold">
                    Plataforma prevista:
                  </p>

                  <div className="flex items-center mt-1 space-x-2">
                    <span className="font-medium">Android</span>
                    <AndroidIcon size={18} color="#3DDC84" />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export { AppShowcase };
