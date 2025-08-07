interface FakeBlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  featuredImage?: any;
  publishedAt: string;
  readTime: number;
  _createdAt: string;
  author: {
    name: string;
    slug: { current: string };
  };
  category: {
    title: string;
    slug: { current: string };
    color: string;
  };
}

interface FakeCategory {
  title: string;
  slug: { current: string };
  color: string;
  count: number;
}

// 🔧 DEVELOPMENT FLAG - Change to `false` to use real data from Sanity
export const USE_FAKE_DATA = true;

// Fake categories
const fakeCategories: FakeCategory[] = [
  {
    title: "Gestão de Frotas",
    slug: { current: "gestao-frotas" },
    color: "#3b82f6",
    count: 25,
  },
  {
    title: "Tecnologia",
    slug: { current: "tecnologia" },
    color: "#8b5cf6",
    count: 18,
  },
  {
    title: "Sustentabilidade",
    slug: { current: "sustentabilidade" },
    color: "#10b981",
    count: 12,
  },
  {
    title: "Inovação",
    slug: { current: "inovacao" },
    color: "#f59e0b",
    count: 15,
  },
  {
    title: "Manutenção",
    slug: { current: "manutencao" },
    color: "#ef4444",
    count: 20,
  },
  {
    title: "Logística",
    slug: { current: "logistica" },
    color: "#06b6d4",
    count: 14,
  },
];

// Function to generate fake posts
const generateFakePosts = (count: number): FakeBlogPost[] => {
  const titles = [
    "Como Otimizar a Gestão da Sua Frota em 2024",
    "5 Tecnologias que Estão Revolucionando o Transporte",
    "Sustentabilidade na Gestão de Frotas: Práticas Essenciais",
    "Manutenção Preventiva vs Corretiva: O que Escolher?",
    "IA na Logística: O Futuro do Transporte de Cargas",
    "Reduzindo Custos Operacionais com Telemática",
    "Segurança na Estrada: Melhores Práticas para Motoristas",
    "Como a Eletrificação Está Mudando as Frotas",
    "Análise de Dados para Tomada de Decisões na Gestão de Frotas",
    "Compliance e Regulamentações no Transporte de Cargas",
    "ROI em Tecnologia de Frotas: Como Medir o Retorno",
    "Gestão de Combustível: Estratégias para Reduzir Gastos",
    "Treinamento de Motoristas: Investimento que Vale a Pena",
    "Monitoramento em Tempo Real: Benefícios e Desafios",
    "Terceirização vs Frota Própria: Análise Comparativa",
    "Digitalização na Gestão de Frotas: Por Onde Começar",
    "Impacto da Logística 4.0 nas Operações de Transporte",
    "Gestão de Pneus: Como Prolongar a Vida Útil",
    "Rastreamento por GPS: Tecnologias e Tendências",
    "Frotas Autônomas: Realidade ou Ficção Científica?",
    "Gestão de Riscos no Transporte de Cargas Perigosas",
    "Como Implementar uma Cultura de Segurança na Empresa",
    "Eficiência Energética em Frotas Comerciais",
    "Last Mile Delivery: Desafios e Soluções Inovadoras",
    "Blockchain na Cadeia de Suprimentos: Casos de Uso",
    "Gestão de Multas e Infrações: Estratégias Preventivas",
    "IoT na Gestão de Frotas: Aplicações Práticas",
    "Planejamento de Rotas Inteligente: Algoritmos e Ferramentas",
    "Gestão de Estoque em Movimento: Desafios da Logística",
    "Cybersecurity em Frotas Conectadas: Protegendo seus Dados",
  ];

  const excerpts = [
    "Descubra as melhores estratégias para otimizar sua operação e reduzir custos significativamente.",
    "Explore as inovações tecnológicas que estão transformando o setor de transporte.",
    "Práticas sustentáveis que podem revolucionar sua gestão de frotas.",
    "Entenda quando aplicar cada tipo de manutenção para maximizar a eficiência.",
    "Como a inteligência artificial está revolucionando a logística moderna.",
    "Estratégias comprovadas para reduzir custos operacionais sem comprometer a qualidade.",
    "Medidas essenciais para garantir a segurança dos seus colaboradores.",
    "O impacto da eletrificação no futuro da mobilidade comercial.",
    "Transforme dados em insights valiosos para sua operação.",
    "Mantenha-se em conformidade com todas as regulamentações do setor.",
    "Métricas essenciais para avaliar o retorno do investimento em tecnologia.",
    "Técnicas avançadas para controlar e reduzir gastos com combustível.",
    "Como um treinamento adequado pode impactar positivamente seus resultados.",
    "Vantagens e desafios do monitoramento em tempo real de frotas.",
    "Análise detalhada para tomar a melhor decisão para seu negócio.",
    "Guia prático para começar a digitalização da sua gestão de frotas.",
    "Entenda como a Logística 4.0 pode transformar suas operações.",
    "Dicas práticas para maximizar a durabilidade e performance dos pneus.",
    "Conheça as mais recentes inovações em tecnologia de rastreamento.",
    "Explorando o potencial e os desafios das frotas autônomas.",
  ];

  const authors = [
    "Carlos Mendes",
    "Ana Silva",
    "João Santos",
    "Maria Oliveira",
    "Pedro Costa",
    "Lucia Ferreira",
    "Roberto Lima",
    "Carla Rodrigues",
    "Felipe Almeida",
    "Juliana Martins",
  ];

  return Array.from({ length: count }, (_, index) => {
    const randomCategory = fakeCategories[index % fakeCategories.length];
    const randomTitle = titles[index % titles.length];

    const randomExcerpt = excerpts[index % excerpts.length];
    const randomAuthor = authors[index % authors.length];

    // Random data in the last 6 months
    const randomDate = new Date();
    randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 180));

    return {
      _id: `fake-post-${index + 1}`,
      title: `${randomTitle} ${index > titles.length - 1 ? `(${Math.floor(index / titles.length) + 1})` : ""}`,
      slug: { current: `fake-post-${index + 1}` },
      excerpt: randomExcerpt,
      featuredImage: {
        asset: {
          _ref: `fake-image-${index + 1}`,
        },
      },
      publishedAt: randomDate.toISOString(),
      readTime: Math.floor(Math.random() * 10) + 3, // 3-12 min
      _createdAt: randomDate.toISOString(),
      author: {
        name: randomAuthor,
        slug: { current: randomAuthor.toLowerCase().replace(" ", "-") },
      },
      category: randomCategory,
    };
  });
};

// Function to filter fake posts based on search and category
export const getFilteredFakePosts = (
  searchQuery?: string,
  category?: string,
  page: number = 1,
  postsPerPage: number = 12,
) => {
  let allPosts = generateFakePosts(300); // Generate 85 posts to test pagination

  // Filter by search
  if (searchQuery) {
    allPosts = allPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }

  // Filter by category
  if (category) {
    allPosts = allPosts.filter(
      (post) => post.category.slug.current === category,
    );
  }

  // Pagination
  const start = (page - 1) * postsPerPage;
  const end = start + postsPerPage;

  const paginatedPosts = allPosts.slice(start, end);

  return {
    posts: paginatedPosts,
    total: allPosts.length,
    categories: fakeCategories,
  };
};

// Fake URLs for images
export const getFakeImageUrl = (
  postId: string,
  width: number = 600,
  height: number = 400,
) => {
  const imageNumber = (parseInt(postId.replace("fake-post-", "")) % 50) + 1;
  return `https://picsum.photos/${width}/${height}?random=${imageNumber}`;
};

export const getFakeBlurUrl = () => {
  return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rfw7QfvZWG2kFvOhSSMmkjkkjxhKqZpnSPcgtkhpEYHvwrWOAaMzHF5tPChnqT5WNRhBFphavWjVaDHCuKhAykyGc8wtrVZBKLNmZcliinYnGjqO9SLBEphXcr5dRgr8jRAClnQV3kFLRcKB0gN+qL+2g7KgNZqisFqt8LG9IgtbWOy46kgdHQygU3zqZEGNUZfvhfBMpW4I7jIFdH5uxPWWVWPXU=";
};

export { fakeCategories };
export type { FakeBlogPost, FakeCategory };
