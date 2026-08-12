"use client";

import Image from "next/image";

// Import estático: o Next gera o `blurDataURL` no build, então o blur aparece
// já no HTML do servidor. O padrão anterior (`useState` + fade de opacidade)
// dependia de JS no cliente e deixava um bloco cinza piscando antes.
import aboutBackground from "@/../public/about.webp";

const AboutHeroSection = (): JSX.Element => {
  return (
    <section
      className="relative h-[60vh] min-h-[500px]
      flex items-center justify-center overflow-hidden"
    >
      {/* Optimized background image */}
      <Image
        src={aboutBackground}
        alt="about_image_background"
        aria-hidden
        fill
        className="object-cover"
        priority
        quality={85}
        placeholder="blur"
        sizes="100vw"
      />

      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-r
        from-[#880e4f]/80 to-[#d81b60]/80 z-10"
      />

      {/* Content */}
      <div
        className="container relative z-20
        text-white text-center px-4"
      >
        <h1
          className="animate-fade-in [animation-delay:300ms] text-4xl md:text-6xl
          font-bold mb-6"
        >
          Nossa Jornada
        </h1>
        <p
          className="animate-fade-left [animation-delay:400ms] text-xl md:text-2xl max-w-3xl
          mx-auto leading-relaxed"
        >
          Transformando a gestão de frotas com tecnologia e inovação
        </p>
      </div>
    </section>
  );
};

export { AboutHeroSection };
