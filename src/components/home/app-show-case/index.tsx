"use client";

import { useRef } from "react";

import Link from "next/link";
import Image from "next/image";

import { motion, useInView } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

import { Step } from "@/components/step";
import { AndroidIcon } from "@/components/icons/brand";

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
      image: "/mobile-app-dashboard.webp",
      color: "from-blue-500/20 to-purple-500/20",
    },
    {
      title: "Abastecimento Inteligente",
      description:
        "Registre abastecimentos em segundos com foto do odômetro, calcule custos automaticamente e mantenha seu controle em dia.",
      image: "/mobile-app-fuel.webp",
      color: "from-purple-500/20 to-pink-500/20",
    },
    {
      title: "Checklist Completo",
      description:
        "Realize inspeções veiculares detalhadas com fotos obrigatórias, garanta a segurança da frota e documente tudo no app.",
      image: "/mobile-app-vehicle-checklist.webp",
      color: "from-green-500/20 to-blue-500/20",
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
                      loading="lazy"
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
                  href="#"
                  className="button-shine bg-[#d81b60] text-white rounded-full 
                  px-8 py-3 text-base font-medium shadow-lg inline-block
                  text-center w-full relative overflow-hidden"
                >
                  <span className="relative z-10">Baixe o nosso app</span>
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
                  <QRCodeSVG
                    value="https://app.com/download"
                    size={130}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                    className="border-4 border-white shadow-md rounded-xl"
                  />
                </div>

                <div className="flex flex-col text-left">
                  <h3 className="font-bold text-lg">
                    Baixe o aplicativo gratuito
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Leia o código com a câmera do seu smartphone para baixar o
                    nosso aplicativo gratuitamente.
                  </p>

                  <p className="mt-4 text-base font-semibold">Disponível em:</p>

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
