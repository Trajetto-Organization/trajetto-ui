import { UserRole } from "../../../dto";

interface TutorialStep {
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  spotlightPadding?: number;
  disableInteraction?: boolean;
  condition?: (
    userPermissions?: UserPermissions,
    currentTab?: string,
  ) => boolean;
}

interface TutorialConfig {
  [key: string]: TutorialStep[];
}

interface UserPermissions {
  role: UserRole;
  permissions?: Array<{
    permissionKey: string;
    canRead: boolean;
    canWrite: boolean;
  }>;
}

// Helper functions for permission checks
const canViewAdvancedFeatures = (
  userPermissions?: UserPermissions,
): boolean => {
  if (!userPermissions) return true;
  return (
    userPermissions.role === "MASTER" ||
    userPermissions.role === "BUSINESS_ADMIN"
  );
};

// Tutorial configurations rewritten elegantly - maintaining original structure
const tutorialConfigs: TutorialConfig = {
  "/dashboard": [
    {
      target: "[data-tutorial='welcome']",
      title: "Bem-vindo ao Dashboard! 📊",
      content: `Seu centro de comando inteligente para gestão de frotas. Aqui você 
      monitora métricas essenciais e acessa rapidamente todas as funcionalidades principais do sistema.`,
      placement: "center",
    },
    {
      target: "[data-tutorial='dashboard-tabs']",
      title: "Navegação por Abas 📑",
      content: `O dashboard está estruturado em abas organizadas para facilitar sua navegação:
      • Overview: Painel geral com cartões informativos, atividades recentes e atalhos inteligentes`,
      placement: "bottom",
      spotlightPadding: 8,
    },
    {
      target: "[data-tutorial='overview-tab']",
      title: "Aba Overview 📈",
      content: `Esta é sua central de informações principais. Aqui você encontra:
      • Cartões com métricas resumidas e atualizadas
      • Histórico de atividades recentes do sistema
      • Atalhos diretos para as funcionalidades mais utilizadas`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='charts-tab']",
      title: "Aba Análise Gráfica 📊",
      content: `Clique aqui para acessar visualizações avançadas e análises detalhadas dos seus dados.
      Esta seção inclui gráficos interativos de tendências de atividade e análises de custos de manutenção.
      NOTA: Esta aba aparece apenas se você possuir as permissões necessárias para visualizar análises gráficas avançadas.`,
      placement: "bottom",
      condition: (userPermissions) => canViewAdvancedFeatures(userPermissions),
    },
    {
      target: "[data-sidebar-menu]",
      title: "Menu de Navegação 📍",
      content: `Navegue facilmente pelas diversas seções do sistema usando a barra lateral intuitiva. Cada item representa uma área específica de gestão da sua frota.
      DICA: Pressione Ctrl + B para expandir ou recolher o menu rapidamente.`,
      placement: "right",
      spotlightPadding: 2,
    },
    {
      target: "[data-tutorial='search']",
      title: "Busca Inteligente ⚡",
      content:
        "Use o atalho Ctrl + K para abrir a busca rápida e navegar instantaneamente para qualquer seção do sistema!",
      placement: "bottom",
    },
    {
      target: "[data-tutorial='help']",
      title: "Tutorial Contextual ℹ️",
      content:
        "Se precisar de orientação ou tiver dúvidas, você pode acessar novamente o tutorial específico desta página a qualquer momento clicando aqui.",
      placement: "top",
    },
    {
      target: "[data-tutorial='account']",
      title: "Configurações da Conta 👤",
      content:
        "Acesse suas configurações de perfil, gerencie notificações e realize logout seguro quando necessário.",
      placement: "top",
    },
    {
      target: "[data-cards]",
      title: "Cartões Interativos ♦️",
      content: `Visualize as métricas principais do sistema de forma clara e organizada, incluindo veículos cadastrados, ordens de serviço em andamento e muito mais.
      DICA: Os cartões coloridos indicam alterações percentuais em relação ao período anterior.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Resumo de Atividades 📈",
      content:
        "Acompanhe em tempo real o resumo das atividades do sistema, incluindo status de registros, alterações recentes e indicadores importantes.",
      placement: "top",
      spotlightPadding: 10,
    },
    {
      target: "[data-quick-links]",
      title: "Acesso Rápido 🚀",
      content: `Estes cartões inteligentes permitem acessar rapidamente as áreas mais utilizadas do sistema.
      DICA: Clique em qualquer cartão para navegar diretamente para a seção correspondente, sem usar o menu lateral.`,
      placement: "top",
    },
  ],
  "/dashboard/charts": [
    {
      target: "[data-tutorial='charts-content']",
      title: "Centro de Analytics 📊",
      content: `Bem-vindo à seção de análise gráfica avançada! Aqui você encontra visualizações detalhadas e insights estratégicos dos dados do seu sistema.
      Estes gráficos inteligentes ajudam a identificar tendências, padrões e oportunidades importantes para otimizar a gestão da sua frota.`,
      placement: "center",
      condition: (userPermissions) => canViewAdvancedFeatures(userPermissions),
    },
    {
      target: "[data-tutorial='area-chart']",
      title: "Gráfico de Tendências 📈",
      content: `Este gráfico interativo mostra a evolução dos registros no sistema ao longo do tempo.
      Você pode visualizar o crescimento dinâmico de:
      • Veículos cadastrados
      • Motoristas registrados  
      • Filiais criadas
      • Peças e fornecedores
      • Ordens de serviço executadas
      • Usuários do sistema
      • Multas cadastradas
      DICA: As diferentes cores representam cada categoria, facilitando análises comparativas visuais.`,
      placement: "bottom",
      spotlightPadding: 15,
      condition: (userPermissions) => canViewAdvancedFeatures(userPermissions),
    },
    {
      target: "[data-tutorial='area-chart-time-selector']",
      title: "Seletor de Período 📅",
      content: `Use este seletor inteligente para personalizar o período de análise:
      • 7 dias: Análise diária detalhada da última semana
      • 30 dias: Visão diária completa do último mês  
      • 3 ou 6 meses: Análise mensal com tendências sazonais
      NOTA: O gráfico se atualiza automaticamente com os dados do período selecionado.`,
      placement: "left",
      condition: (userPermissions) => canViewAdvancedFeatures(userPermissions),
    },
    {
      target: "[data-tutorial='bar-chart']",
      title: "Análise de Custos de Manutenção 💰",
      content: `Este gráfico de barras apresenta uma visão estratégica da distribuição dos custos de manutenção:
      • Custos internos: Manutenções realizadas pela equipe interna da empresa
      • Custos externos: Serviços terceirizados e prestadores externos
      A visualização ajuda a identificar padrões de gastos e avaliar o equilíbrio entre serviços internos e externos. O valor total de cada período é calculado automaticamente para facilitar análises.`,
      placement: "top",
      spotlightPadding: 15,
      condition: (userPermissions) => canViewAdvancedFeatures(userPermissions),
    },
    {
      target: "[data-tutorial='bar-chart-time-selector']",
      title: "Controle Temporal dos Custos 📅",
      content: `Similar ao gráfico de tendências, você pode ajustar facilmente o período de análise dos custos.
      Isso permite comparar gastos entre diferentes períodos e identificar sazonalidades nos custos de manutenção da sua frota.`,
      placement: "left",
      condition: (userPermissions) => canViewAdvancedFeatures(userPermissions),
    },
    {
      target: "[data-tutorial='overview-tab']",
      title: "Retornar ao Overview 🔄",
      content: `Para voltar à visão geral com cartões e atividades recentes, clique na aba "Overview".
      Você pode alternar entre as abas a qualquer momento para acessar diferentes tipos de informação e análises.`,
      placement: "bottom",
      condition: (userPermissions) => canViewAdvancedFeatures(userPermissions),
    },
  ],
  "/dashboard/branch": [
    {
      target: "[data-tutorial='welcome']",
      title: "Central de Filiais 🏢",
      content: `Aqui você gerencia de forma centralizada todas as filiais cadastradas da sua empresa. Cada filial pode ter veículos específicos, motoristas dedicados e ordens de serviço associadas.`,
      placement: "center",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Criar Nova Filial 📝",
      content: `Para adicionar uma nova filial ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Filiais
      IMPORTANTE: Caso não possua esta permissão, será necessário solicitá-la ao administrador do sistema.
      Ao adicionar uma filial, você precisará fornecer informações essenciais como CNPJ, razão social, endereço completo e dados para contato.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Busca Inteligente de Filiais 🔍",
      content: `Encontre rapidamente filiais específicas digitando qualquer informação relacionada, como nome fantasia, CNPJ ou cidade.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Painel de Filiais 📋",
      content: `Visualize todas as filiais cadastradas em uma interface organizada e intuitiva.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Filiais
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador do sistema.
      DICA: Clique nos cabeçalhos das colunas para ordenar os dados e utilize os filtros para refinar a visualização conforme suas necessidades.`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações da Filial ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada filial cadastrada.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Filiais
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.
      ATENÇÃO CRÍTICA: A exclusão de uma filial afetará todos os veículos, motoristas e ordens de serviço associados a ela. Esta ação deve ser realizada com extremo cuidado.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/fine": [
    {
      target: "[data-tutorial='welcome']",
      title: "Gestão de Multas 🚦",
      content: `Controle completo e inteligente de multas e infrações de trânsito da sua frota.
      DICA: Gerencie pagamentos, monitore pontuação na CNH e mantenha histórico completo de infrações.`,
      placement: "center",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Registrar Nova Multa 🆕",
      content: `Adicione uma nova multa ao sistema seguindo um processo estruturado.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Multas
      • LEITURA em Gerenciar Filiais
      • LEITURA em Gerenciar Veículos
      • LEITURA em Gerenciar Motoristas
      Processo organizado em etapas:
      1. Seleção da filial responsável
      2. Escolha do veículo e motorista envolvidos
      3. Definição do código de infração específico
      4. Preenchimento completo dos dados da multa`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Busca de Multas 🔍",
      content: `Localize multas rapidamente por valor, código de infração, placa do veículo, nome do motorista ou qualquer informação relacionada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Registro de Multas 📋",
      content: `Visualize todas as multas registradas no sistema com informações completas e organizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Multas
      DICA: Use os filtros inteligentes por valor, código de infração ou filial específica para refinar sua visualização.`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações da Multa ⚙️",
      content: `Botões de ação (três pontos ⋮) para gerenciar cada multa registrada.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Multas
      • LEITURA em Gerenciar Filiais
      • LEITURA em Gerenciar Veículos
      • LEITURA em Gerenciar Motoristas
      Funcionalidades disponíveis:
      • Editar datas, valores e observações
      • Alterar veículo ou motorista responsável
      • Registrar pagamentos
      • Excluir permanentemente do sistema
      ATENÇÃO: A exclusão não pode ser desfeita e remove permanentemente todos os dados da multa.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/driver": [
    {
      target: "[data-tutorial='welcome']",
      title: "Central de Motoristas 👨‍✈️",
      content: `Nesta página você gerencia todos os motoristas cadastrados no sistema de forma organizada e eficiente.
      Mantenha informações sempre atualizadas sobre habilitação, documentos pessoais e histórico de condução de cada condutor da sua frota.`,
      placement: "center",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Cadastrar Novo Motorista 🆕",
      content: `Para adicionar um novo motorista ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Motoristas
      PERMISSÕES OPCIONAIS:
      • LEITURA em Gerenciar Filiais (para vincular à filial específica)
      IMPORTANTE: Caso não possua as permissões necessárias, será necessário solicitá-las ao administrador do sistema.
      Informe dados pessoais completos, informações da CNH, documentos necessários e opcionalmente selecione uma filial de vinculação.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Busca de Motoristas 🔍",
      content: `Encontre rapidamente motoristas específicos digitando nome completo, CPF, número de CNH ou qualquer outra informação relevante cadastrada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Painel de Motoristas 📋",
      content: `Visualize todos os motoristas cadastrados com informações detalhadas e atualizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Motoristas
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador do sistema.
      Veja informações como status da CNH, categoria de habilitação e data de vencimento. O sistema alerta automaticamente sobre documentos próximos do vencimento.`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Motorista ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada motorista cadastrado.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Motoristas
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.
      NOTA: Desativar um motorista não o exclui permanentemente do sistema, apenas impede que seja associado a novos veículos até ser reativado.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],

  "/dashboard/fuel-type": [
    {
      target: "[data-tutorial='welcome']",
      title: "Gestão de Combustíveis ⛽",
      content: `Gerencie os tipos de combustível utilizados pela sua frota de forma organizada e eficiente.
      Esta configuração é fundamental para o controle preciso de abastecimento e análise detalhada de consumo dos veículos.`,
      placement: "center",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Adicionar Combustível 🆕",
      content: `Para cadastrar um novo tipo de combustível no sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Tipos de Combustível
      IMPORTANTE: Caso não possua esta permissão, será necessário solicitá-la ao administrador do sistema.
      Selecione entre os tipos disponíveis: Gasolina Comum/Aditivada, Diesel S10/S500, Etanol, GNV, entre outros.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Busca Rápida 🔍",
      content: `Digite para filtrar os tipos de combustível cadastrados no sistema de forma instantânea.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Catálogo de Combustíveis 📋",
      content: `Visualize todos os tipos de combustível cadastrados no sistema de forma organizada.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Tipos de Combustível
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador do sistema.
      Esta tabela mostra a descrição detalhada e informações de registro de cada tipo de combustível disponível.`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Combustível ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada tipo de combustível cadastrado.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Tipos de Combustível
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.
      ATENÇÃO: Só é possível excluir tipos que não estejam associados a nenhum veículo no sistema.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],

  "/dashboard/part": [
    {
      target: "[data-tutorial='welcome']",
      title: "Inventário de Peças 🔧",
      content: `Aqui você gerencia o cadastro completo de peças e componentes para manutenção da sua frota.
      Mantenha um registro detalhado e organizado de todas as peças utilizadas nos veículos para controle eficiente de estoque e custos.`,
      placement: "center",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Cadastrar Nova Peça 🆕",
      content: `Para adicionar uma nova peça ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Peças
      PERMISSÕES OPCIONAIS:
      • LEITURA em Gerenciar Fornecedores (para vincular a um fornecedor)
      IMPORTANTE: Caso não possua as permissões necessárias, será necessário solicitá-las ao administrador do sistema.
      Informe descrição detalhada, preço unitário atualizado e opcionalmente selecione um fornecedor preferencial.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Busca de Peças 🔍",
      content: `Encontre rapidamente peças específicas digitando descrição, código de referência ou qualquer outra informação cadastrada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Catálogo de Peças 📋",
      content: `Visualize todas as peças cadastradas no sistema com informações completas e organizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Peças
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador do sistema.
      A tabela apresenta descrição detalhada, preço unitário atualizado, fornecedor associado e outras informações relevantes para gestão.`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações da Peça ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada peça cadastrada.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Peças
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.
      Ao editar, você pode atualizar a descrição, preço unitário e fornecedor associado.
      ATENÇÃO: A exclusão só é possível se a peça não estiver vinculada a ordens de serviço no sistema.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/permission": [
    {
      target: "[data-tutorial='welcome']",
      title: "Central de Permissões 🔐",
      content: `Nesta página você gerencia as permissões de acesso do sistema de forma granular e segura.
      Configure precisamente quais ações cada perfil de acesso pode realizar dentro da plataforma. Esta é uma área crítica e sensível do sistema!`,
      placement: "center",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Criar Nova Permissão 🆕",
      content: `Para adicionar uma nova permissão ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Permissões de Usuários
      • LEITURA em Gerenciar Perfis de Acesso
      IMPORTANTE: Caso não possua essas permissões, será necessário solicitá-las ao administrador do sistema.
      Selecione o perfil de acesso de destino, o recurso específico do sistema e configure se o perfil pode ler e/ou escrever nesse recurso.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Permissões 🔍",
      content: `Encontre rapidamente permissões específicas digitando o nome do perfil de acesso, recurso do sistema ou tipo de permissão configurada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Matriz de Permissões 📋",
      content: `Visualize todas as permissões configuradas no sistema de forma clara e organizada.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Permissões de Usuários
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador do sistema.
      A tabela mostra o perfil de acesso, o recurso específico e o tipo de permissão concedida (leitura/escrita).`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações da Permissão ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada permissão configurada.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Permissões de Usuários
      • LEITURA em Gerenciar Perfis de Acesso
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.
      Ao editar, você pode modificar o tipo de permissão concedida (leitura/escrita).
      CUIDADO: A exclusão remove completamente o acesso ao recurso para o perfil selecionado!`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/profile-access": [
    {
      target: "[data-tutorial='welcome']",
      title: "Perfis de Acesso 👥",
      content: `Aqui você gerencia os perfis de acesso do sistema de forma estratégica e organizada.
      Perfis são conjuntos estruturados de permissões que podem ser atribuídos a usuários, facilitando significativamente o controle de acesso em grupo.`,
      placement: "center",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Criar Novo Perfil 🆕",
      content: `Para adicionar um novo perfil de acesso ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Perfis de Acesso
      IMPORTANTE: Caso não possua esta permissão, será necessário solicitá-la ao administrador do sistema.
      Informe um nome descritivo e claro para o perfil (exemplos: 'Supervisor de Frota', 'Técnico de Manutenção', 'Analista Operacional').`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Perfis 🔍",
      content: `Encontre rapidamente perfis específicos digitando o nome ou qualquer informação relacionada ao perfil desejado.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Painel de Perfis 📋",
      content: `Visualize todos os perfis de acesso cadastrados no sistema de forma organizada.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Perfis de Acesso
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador do sistema.
      LEMBRE-SE: Após criar um perfil, você deve configurar suas permissões específicas na página 'Permissões' para que ele tenha funcionalidade.`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Perfil ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada perfil de acesso cadastrado.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Perfis de Acesso
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.
      ATENÇÃO CRÍTICA: Excluir um perfil removerá TODAS as permissões associadas a ele e afetará TODOS os usuários que o utilizam!`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/service-order-part": [
    {
      target: "[data-tutorial='welcome']",
      title: "Peças em Ordens de Serviço 🔧",
      content: `Nesta página você gerencia de forma detalhada as peças utilizadas em cada ordem de serviço específica.
      Controle precisamente quais peças foram utilizadas, quantidades consumidas e valores aplicados para um controle rigoroso de custos operacionais.`,
      placement: "center",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Vincular Peça à Ordem 🆕",
      content: `Para vincular uma peça a uma ordem de serviço específica, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Peças em Ordens de Serviço
      • LEITURA em Gerenciar Ordens de Serviço
      • LEITURA em Gerenciar Peças
      IMPORTANTE: Caso não possua essas permissões, será necessário solicitá-las ao administrador do sistema.
      Informe a quantidade exata utilizada para cálculo preciso dos custos.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Registros 🔍",
      content: `Encontre rapidamente registros específicos digitando o número da ordem de serviço, descrição da peça utilizada ou qualquer outra informação relacionada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Controle de Peças por Ordem 📋",
      content: `Visualize todas as peças utilizadas em ordens de serviço com informações detalhadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Peças em Ordens de Serviço
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador do sistema.
      A tabela mostra a ordem de serviço relacionada, peça utilizada, quantidade consumida, valor unitário e total calculado automaticamente.`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Registro ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada registro de peça em ordem de serviço.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Peças em Ordens de Serviço
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.
      Ao editar, você pode atualizar a quantidade utilizada ou substituir a peça selecionada.
      IMPORTANTE: A remoção de um registro afetará diretamente o valor total calculado da ordem de serviço.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/service-order": [
    {
      target: "[data-tutorial='welcome']",
      title: "Central de Ordens de Serviço 🛠️",
      content: `Aqui você gerencia todas as ordens de serviço da sua frota de forma centralizada e eficiente.
      Registre manutenções preventivas, corretivas e acompanhe detalhadamente o status de cada serviço para manter sua frota sempre operacional e segura.`,
      placement: "center",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Criar Nova Ordem de Serviço 🆕",
      content: `Para registrar uma nova ordem de serviço no sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Ordens de Serviço
      • LEITURA em Gerenciar Veículos
      • LEITURA em Gerenciar Filiais
      • LEITURA em Gerenciar Cadastros de Usuários
      IMPORTANTE: Caso não possua essas permissões, será necessário solicitá-las ao administrador do sistema.
      Descreva detalhadamente o problema identificado e informe as datas previstas para execução dos serviços.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Ordens de Serviço 🔍",
      content: `Encontre rapidamente ordens específicas digitando o número da ordem, placa do veículo, tipo de serviço ou qualquer outra informação relacionada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Painel de Ordens de Serviço 📋",
      content: `Visualize todas as ordens de serviço registradas no sistema com informações completas e organizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Ordens de Serviço
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador do sistema.
      A tabela apresenta informações detalhadas como veículo relacionado, tipo de serviço, status atual, datas programadas e valores envolvidos.`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações da Ordem de Serviço ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada ordem de serviço registrada.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Ordens de Serviço
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.
      NOTA: Diferentes ações estarão disponíveis de acordo com o status atual da ordem de serviço (planejada, em andamento, concluída, etc.).`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/supplier": [
    {
      target: "[data-tutorial='welcome']",
      title: "Rede de Fornecedores 🏭",
      content: `Nesta página você gerencia todos os fornecedores de peças, serviços e insumos para sua frota de forma estratégica.
      Mantenha um cadastro completo e atualizado para facilitar processos de compras, cotações e contratações de serviços especializados.`,
      placement: "center",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Cadastrar Novo Fornecedor 🆕",
      content: `Para adicionar um novo fornecedor ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Fornecedores
      IMPORTANTE: Caso não possua esta permissão, será necessário solicitá-la ao administrador do sistema.
      Informe dados completos como nome/razão social, CNPJ, contatos atualizados, endereço completo e área de atuação específica (peças automotivas, serviços especializados, combustível, etc.).`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Fornecedores 🔍",
      content: `Encontre rapidamente fornecedores específicos digitando nome fantasia, CNPJ, cidade de localização ou qualquer outra informação cadastrada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Catálogo de Fornecedores 📋",
      content: `Visualize todos os fornecedores cadastrados no sistema com informações completas e organizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Fornecedores
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador do sistema.
      A tabela apresenta informações essenciais como nome/razão social, CNPJ, contatos atualizados e localização geográfica.`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Fornecedor ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada fornecedor cadastrado.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Fornecedores
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.
      ATENÇÃO: A exclusão só é possível se o fornecedor não estiver vinculado a peças cadastradas ou ordens de serviço no sistema.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/user-registration": [
    {
      target: "[data-tutorial='welcome']",
      title: "Central de Usuários 👤",
      content: `Aqui você gerencia todos os usuários que têm acesso ao sistema de forma centralizada e segura.
      Controle precisamente quem pode acessar a plataforma e quais funcionalidades cada usuário pode utilizar. Esta é uma área extremamente sensível do sistema!`,
      placement: "center",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Criar Novo Usuário 🆕",
      content: `Para adicionar um novo usuário ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Cadastros de Usuários
      • LEITURA em Gerenciar Perfis de Acesso
      IMPORTANTE: Caso não possua essas permissões, será necessário solicitá-las ao administrador do sistema.
      Informe email válido, nome completo, senha inicial segura e selecione cuidadosamente o nível de acesso e perfil apropriados para o usuário.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Usuários 🔍",
      content: `Encontre rapidamente usuários específicos digitando nome completo, email ou perfil de acesso atribuído.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Painel de Usuários 📋",
      content: `Visualize todos os usuários cadastrados no sistema com informações detalhadas de acesso.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Cadastros de Usuários
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador do sistema.
      A tabela apresenta informações como nome completo, email de acesso, nível de acesso configurado, perfil atribuído e status de verificação da conta.`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Usuário ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada usuário cadastrado.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Cadastros de Usuários
      • LEITURA em Gerenciar Perfis de Acesso (para alterar perfis)
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.
      A edição permite atualizar dados pessoais e alterar níveis de acesso e perfis atribuídos ao usuário.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/vehicle-type": [
    {
      target: "[data-tutorial='welcome']",
      title: "Categorias de Veículos 🚚",
      content: `Nesta página você configura os diferentes tipos de veículos da sua frota de forma organizada e estratégica.
      Esta classificação é fundamental para organizar veículos por categoria e realizar análises segmentadas de dados (custos operacionais, consumo de combustível, manutenções, etc.).`,
      placement: "center",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Adicionar Tipo de Veículo 🆕",
      content: `Para cadastrar um novo tipo de veículo no sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Tipos de Veículos
      IMPORTANTE: Caso não possua esta permissão, será necessário solicitá-la ao administrador do sistema.
      Informe a descrição específica do tipo, como 'Caminhão Baú', 'Van Utilitária', 'Motocicleta para Entregas', etc. Seja específico e descritivo para facilitar análises futuras e relatórios segmentados.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Busca Rápida 🔍",
      content: `Digite para filtrar os tipos de veículos cadastrados no sistema de forma instantânea.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Catálogo de Tipos 📋",
      content: `Visualize todos os tipos de veículos cadastrados no sistema de forma organizada.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Tipos de Veículos
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador do sistema.
      Esta tabela mostra a descrição detalhada e informações de registro de cada tipo de veículo disponível para classificação.`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Tipo de Veículo ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada tipo de veículo cadastrado.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Tipos de Veículos
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.
      ATENÇÃO: A exclusão só é possível se não houver veículos cadastrados utilizando este tipo específico no sistema.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/vehicle": [
    {
      target: "[data-tutorial='welcome']",
      title: "Central da Frota 🚗",
      content: `Esta é a página central para gerenciar todos os veículos da sua frota de forma completa e organizada.
      Controle informações detalhadas, histórico de manutenções, status operacional e documentação completa de cada veículo para manter sua frota sempre operacional.`,
      placement: "center",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Cadastrar Novo Veículo 🆕",
      content: `Para adicionar um novo veículo à frota, clique neste botão.
      PERMISSÕES OBRIGATÓRIAS:
      • ESCRITA em Gerenciar Veículos
      • LEITURA em Gerenciar Tipos de Combustível
      PERMISSÕES OPCIONAIS:
      • LEITURA em Gerenciar Tipos de Veículos (para selecionar o tipo específico)
      • LEITURA em Gerenciar Filiais (para vincular à filial responsável)
      • LEITURA em Gerenciar Motoristas (para atribuir um motorista específico)
      IMPORTANTE: Caso não possua as permissões obrigatórias, será necessário solicitá-las ao administrador do sistema.
      Informe dados essenciais como placa, modelo, ano de fabricação, número do chassi, entre outras informações técnicas importantes.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Veículos 🔍",
      content: `Encontre rapidamente veículos específicos digitando placa, modelo, ano ou qualquer outra informação cadastrada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Painel da Frota 📋",
      content: `Visualize todos os veículos da frota com informações completas e organizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Veículos
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador do sistema.
      A tabela apresenta informações essenciais como placa, modelo, ano de fabricação, tipo de veículo, status operacional atual e filial associada.`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Veículo ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada veículo cadastrado.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Veículos
      PERMISSÕES OPCIONAIS:
      • ESCRITA em Gerenciar Ordens de Serviço (para registrar manutenções)
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      Esta ação é útil para verificar atualizações em tempo real dos status operacionais.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/account-payable": [
    {
      target: "[data-tutorial='welcome']",
      title: "Central Financeira 💰",
      content: `Nesta página você gerencia todas as despesas e contas a pagar da sua empresa de forma organizada e eficiente.
      Controle rigorosamente vencimentos, registre pagamentos e mantenha a saúde financeira sempre em dia com alertas automáticos.`,
      placement: "center",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Registrar Nova Conta 🆕",
      content: `Para adicionar uma nova conta a pagar ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Contas a Pagar
      • LEITURA em Gerenciar Filiais
      • LEITURA em Gerenciar Cadastros de Usuários
      PERMISSÕES OPCIONAIS:
      • LEITURA em Gerenciar Ordens de Serviço (para vincular a uma ordem específica)
      IMPORTANTE: Caso não possua as permissões necessárias, será necessário solicitá-las ao administrador do sistema.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Contas 🔍",
      content: `Encontre rapidamente contas específicas digitando valor, data de vencimento, nome da filial responsável ou qualquer outra informação relacionada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Painel Financeiro 📋",
      content: `Visualize todas as contas a pagar registradas com informações completas e status atualizados.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Contas a Pagar
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador do sistema.
      A tabela apresenta informações essenciais como valor da conta, data de vencimento, data de pagamento, filial responsável e status atual.
      DICA VISUAL: As cores das linhas indicam status importantes: Verde = Conta Paga, Amarelo = Próximo do vencimento, Vermelho = Conta Vencida.`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações da Conta ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada conta a pagar cadastrada.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Contas a Pagar
      • LEITURA em Gerenciar Filiais
      • LEITURA em Gerenciar Cadastros de Usuários
      PERMISSÕES OPCIONAIS:
      • LEITURA em Gerenciar Ordens de Serviço (para editar vinculação)
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      Esta ação é útil para verificar atualizações em tempo real dos status de pagamento e novos vencimentos.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
};

export { tutorialConfigs, canViewAdvancedFeatures };
export type { TutorialStep };
