import type { StaticImageData } from "next/image";

import gabrielPhoto from "@/assets/about/gabriel-about-co-founder.webp";
import jomarPhoto from "@/assets/about/jomar-about-co-founder.webp";
import michaelPhoto from "@/assets/about/michael-about-co-founder.webp";
import thiagoPhoto from "@/assets/about/thiago-about-co-founder.webp";

/** The four partners, in the design's order (Sobre · Equipe and the hero's avatars). */
interface Partner {
  id: "michael" | "gabriel" | "thiago" | "jomar";
  name: string;
  role: string;
  bio: string;
  photo: StaticImageData;
}

const PARTNERS: readonly Partner[] = [
  {
    id: "michael",
    name: "Michael Sivori",
    role: "CPO & Co-Fundador",
    bio: "Lidera design e experiência do usuário da plataforma com foco em interface e front-end.",
    photo: michaelPhoto,
  },
  {
    id: "gabriel",
    name: "Gabriel Mesquita",
    role: "CTO & Co-Fundador",
    bio: "Arquiteto técnico da plataforma. Especialista em desenvolvimento full-stack.",
    photo: gabrielPhoto,
  },
  {
    id: "thiago",
    name: "Thiago Baptista",
    role: "Head de Infraestrutura & Co-Fundador",
    bio: "Especialista em automação, IA e arquitetura de sistemas. CEO da THS Tecnologia.",
    photo: thiagoPhoto,
  },
  {
    id: "jomar",
    name: "Jomar Pereira",
    role: "Head Comercial & Co-Fundador",
    bio: "Lidera estratégias de vendas e relacionamento com clientes no mercado B2B de logística, de frotas a entregas.",
    photo: jomarPhoto,
  },
];

function partner(id: Partner["id"]): Partner {
  return PARTNERS.find((item) => item.id === id)!;
}

export { PARTNERS, partner };
export type { Partner };
