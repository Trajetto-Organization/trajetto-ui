"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Play } from "lucide-react";
import { toast } from "sonner";

const HeroVideoSection = (): JSX.Element => {
  const [initialInteractionDone, setInitialInteractionDone] =
    useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleInitialPlay = () => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => {
          setInitialInteractionDone(true);
        })
        .catch((error) => {
          console.error("Erro ao reproduzir vídeo:", error);
          toast.error(
            "Não foi possível reproduzir o vídeo! Por favor, tente novamente.",
          );
        });
    }
  };

  return (
    <div className="relative w-full">
      <div
        className="relative overflow-hidden 
        rounded-xl border bg-card p-0 shadow-xl
        aspect-[4/3] sm:aspect-[3/2] md:aspect-video"
      >
        {!initialInteractionDone && (
          <div
            className="absolute inset-0 bg-black/20 z-10 
            transition-opacity duration-500"
          />
        )}

        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            src="/hero-video.mp4"
            poster="/hero-video-placeholder.png"
            className="w-full h-full object-cover rounded-lg"
            preload="metadata"
            playsInline
            controls={initialInteractionDone}
            controlsList="nodownload"
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        </div>

        <AnimatePresence>
          {!initialInteractionDone && (
            <motion.div
              className="absolute inset-0 flex flex-col 
              items-center justify-center z-20 p-4"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.button
                onClick={handleInitialPlay}
                className="rounded-full bg-black/50 backdrop-blur-sm 
                hover:bg-black/70 transition-colors shadow-lg p-5"
                whileHover={{
                  scale: 1.05,
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Play
                  className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 
                  md:w-12 text-white fill-white/80"
                />
              </motion.button>

              <motion.p
                className="text-white text-center mt-4 sm:mt-6 px-4 sm:px-6 py-3
                rounded-2xl max-w-xs sm:max-w-md font-semibold text-base"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                  textShadow:
                    "0 2px 8px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.6)",
                }}
              >
                <span className="hidden sm:inline">
                  Veja como reduzir custos e aumentar a eficiência da sua frota
                  em minutos
                </span>
                <span className="sm:hidden">
                  Reduza custos e aumente a eficiência da sua frota
                </span>
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export { HeroVideoSection };
