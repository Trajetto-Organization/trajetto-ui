"use client";

import { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";

import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic import of MapComponent to only load on client side
const MapComponent = dynamic(() => import("./map-component"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted/30">
      <div className="animate-pulse text-muted-foreground">
        Carregando o mapa...
      </div>
    </div>
  ),
});

const Map = (): JSX.Element => {
  const controls = useAnimation();

  // Centro geográfico aproximado do Brasil. O Trajetto é uma operação digital:
  // não há escritório para apontar, então o mapa comunica alcance nacional em
  // vez de fingir um endereço.
  const latitude = -14.235;
  const longitude = -51.9253;

  useEffect(() => {
    // Initialize animation when component mounts
    controls.start({
      scale: [0, 1],
      opacity: [0, 1],
      transition: { duration: 0.3 },
    });
  }, [controls]);

  const contactInformation = [
    { title: "Atendimento", content: "100% digital, sem instalação local" },
    { title: "Cobertura", content: "Todo o território nacional" },
    { title: "Horário", content: "Seg-Sex: 09:00 - 18:00" },
  ];

  return (
    <div
      className="relative h-[400px] rounded-xl 
      overflow-hidden shadow-xl"
    >
      {/* Container for Leaflet map */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          latitude={latitude}
          longitude={longitude}
          zoom={4}
          popupTitle="Trajetto"
          popupSubtitle="Atendemos frotas em todo o Brasil"
        />
      </div>

      {/* Container for perfectly centered ping effect */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 
        -translate-y-1/2 pointer-events-none z-10"
      >
        <motion.div className="relative" animate={controls}>
          <PingEffect />
        </motion.div>
      </div>

      {/* Gradient overlay with contact information */}
      <div
        className="absolute bottom-0 left-0 right-0 
        bg-gradient-to-t from-background/95 to-background/0 p-6"
      >
        <div
          className="container grid grid-cols-1 
          md:grid-cols-3 gap-4"
        >
          {contactInformation.map(({ title, content }, idx) => (
            <div className="text-center" key={idx}>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Component for the ping animation and marker
const PingEffect = () => {
  return (
    <div className="relative w-0 h-0">
      {/* Animated ping circle */}
      <motion.div
        className="absolute rounded-full bg-[#d81b60]/30"
        style={{ width: 30, height: 30, top: -15, left: -15 }}
        animate={{
          scale: [0.5, 1.5],
          opacity: [0.7, 0],
        }}
        transition={{
          duration: 0.9,
          repeat: Infinity,
          repeatDelay: 0.3,
          ease: "easeOut",
        }}
      />

      {/* White base dot */}
      <motion.div
        className="absolute rounded-full bg-white shadow-md"
        style={{ width: 14, height: 14, top: -7, left: -7 }}
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 10 }}
      />

      {/* Pin icon - perfectly centered */}
      <motion.div
        initial={{ y: -5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="absolute"
        style={{ top: -24, left: -12 }}
      >
        <MapPin className="h-6 w-6 text-[#d81b60]" strokeWidth={2.5} />
      </motion.div>
    </div>
  );
};

export { Map };
