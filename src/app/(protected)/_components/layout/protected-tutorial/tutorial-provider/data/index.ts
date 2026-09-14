import type {
  TutorialConfig,
  TutorialStep,
  UserPermissions,
} from "../tutorial-provider.types";

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

// Helper function to check if a user has a specific permission
const hasPermission = (
  userPermissions?: UserPermissions,
  permissionKey?: string,
): boolean => {
  if (!userPermissions || !permissionKey) return true;
  if (!userPermissions.permissions) return false;

  return userPermissions.permissions.some(
    (perm) =>
      perm.permissionKey === permissionKey && (perm.canRead || perm.canWrite),
  );
};

// Helper function to determine if dashboard cards should be displayed based on permissions
const shouldDisplayDashboardCard = (
  userPermissions?: UserPermissions,
  cardType?: string,
): boolean => {
  if (!userPermissions || !cardType) return true;

  // MASTER sees everything
  if (userPermissions.role === "MASTER") return true;

  // BUSINESS_ADMIN sees everything except "businesses"
  if (userPermissions.role === "BUSINESS_ADMIN") {
    return cardType !== "businesses";
  }

  if (userPermissions.role === "BUSINESS_USER") {
    const permissionMap: Record<string, string> = {
      vehicles: "vehicle_manage",
      drivers: "driver_manage",
      businesses: "business_manage",
      branches: "branch_manage",
      parts: "part_manage",
      suppliers: "supplier_manage",
      serviceOrders: "service_order_manage",
      users: "user_registration_manage",
      fines: "fine_manage",
      fuel: "fuel_manage",
    };

    const requiredPermission = permissionMap[cardType];
    return requiredPermission
      ? hasPermission(userPermissions, requiredPermission)
      : false;
  }

  return true;
};

// Helper function to check if interactive cards section should be shown
const shouldShowInteractiveCards = (
  userPermissions?: UserPermissions,
): boolean => {
  if (!userPermissions) return true;
  if (
    userPermissions.role === "MASTER" ||
    userPermissions.role === "BUSINESS_ADMIN"
  )
    return true;

  if (userPermissions.role === "BUSINESS_USER") {
    // Check if user has at least one permission that would show a card
    const cardTypes = [
      "vehicles",
      "drivers",
      "branches",
      "parts",
      "suppliers",
      "serviceOrders",
      "users",
      "fines",
    ];
    return cardTypes.some((cardType) =>
      shouldDisplayDashboardCard(userPermissions, cardType),
    );
  }

  return true;
};

// Helper function to check if quick access section should be shown
const shouldShowQuickAccess = (userPermissions?: UserPermissions): boolean => {
  if (!userPermissions) return true;
  if (
    userPermissions.role === "MASTER" ||
    userPermissions.role === "BUSINESS_ADMIN"
  )
    return true;

  if (userPermissions.role === "BUSINESS_USER") {
    // Check if user has at least one permission that would show a quick link
    const linkTypes = [
      "users",
      "vehicles",
      "businesses",
      "serviceOrders",
      "drivers",
      "branches",
      "parts",
      "suppliers",
      "fines",
    ];
    return linkTypes.some((linkType) =>
      shouldDisplayDashboardCard(userPermissions, linkType),
    );
  }

  return true;
};

// Helper function to create PageStats tutorial step (reusable)
const createPageStatsTutorialStep = (): TutorialStep => ({
  target: "[data-tutorial='data-page-stats']",
  title: "Métricas da Página 📊",
  content: `Visualize as estatísticas e métricas principais desta seção de forma clara e organizada através destes cartões informativos.

  Os cartões exibem:
  • Totais e quantidades relevantes
  • Indicadores percentuais coloridos quando aplicável
  • Status e tendências importantes

  DICA: Os valores são atualizados automaticamente conforme os dados do sistema mudam.`,
  placement: "bottom",
});

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
      • Overview: Painel geral com cartões informativos, atividades recentes e atalhos inteligentes
      • Análise Gráfica: Gráficos interativos de tendências e custos de manutenção
      • Limites de Uso: Monitoramento do consumo de serviços e funcionalidades com IA`,
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
      target: "[data-tutorial='limits-tab']",
      title: "Aba Limites de Uso ⚡",
      content: `Monitore o consumo de serviços e funcionalidades avançadas da plataforma.
      Aqui você acompanha em tempo real:
      • Verificações IA: uso mensal das análises inteligentes em abastecimentos (leitura de odômetro) e checklists de veículos (km, cintos, volante, radiador, óleo e outros itens inspecionados)
      • Consulta de Multas: limite mensal de consultas automáticas de infrações (em breve)
      DICA: O consumo é reiniciado automaticamente no dia 1º de cada mês.`,
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
      condition: (userPermissions) =>
        shouldShowInteractiveCards(userPermissions),
    },
    {
      target: "[role='table']",
      title: "Resumo de Atividades 📈",
      content:
        "Acompanhe o resumo das atividades do sistema, incluindo status de registros, alterações recentes e indicadores importantes.",
      placement: "top",
      spotlightPadding: 10,
    },
    {
      target: "[data-quick-links]",
      title: "Acesso Rápido 🚀",
      content: `Estes cartões inteligentes permitem acessar rapidamente as áreas mais utilizadas do sistema.
      DICA: Clique em qualquer cartão para navegar diretamente para a seção correspondente, sem usar o menu lateral.`,
      placement: "top",
      condition: (userPermissions) => shouldShowQuickAccess(userPermissions),
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
  "/dashboard/limits": [
    {
      target: "[data-tutorial='limits-content']",
      title: "Limites de Uso ⚡",
      content: `Bem-vindo à central de monitoramento de consumo da plataforma!
      Aqui você acompanha em tempo real o uso de cada serviço avançado disponível para a sua empresa, garantindo total transparência sobre o que está sendo consumido e quanto ainda resta no período.`,
      placement: "center",
      condition: (userPermissions) => canViewAdvancedFeatures(userPermissions),
    },
    {
      target: "[data-tutorial='ai-usage-card']",
      title: "Verificação Inteligente IA 🤖",
      content: `Este cartão mostra o consumo mensal das análises realizadas pela IA, utilizada em dois contextos:
      • Abastecimentos: leitura automática da foto do odômetro para validar a quilometragem informada
      • Checklists de veículos: análise inteligente dos itens inspecionados, como quilometragem, cintos, volante, radiador, óleo, freios e outros
      O que cada elemento indica:
      • Barra de progresso azul: percentual do limite mensal já consumido
      • Badge no canto superior: indicador de status — "Ativo" (uso normal), "Uso elevado" (≥ 70%), "Limite atingido" (100%) ou "Desabilitado"
      • Verificações restantes: número de análises ainda disponíveis no período atual
      • Próximo reset: o contador é zerado automaticamente no dia 1º de cada mês
      NOTA: Quando o limite é atingido, novas verificações IA ficam pausadas até o próximo reset.`,
      placement: "bottom",
      spotlightPadding: 12,
      condition: (userPermissions) => canViewAdvancedFeatures(userPermissions),
    },
    {
      target: "[data-tutorial='overview-tab']",
      title: "Retornar ao Overview 🔄",
      content: `Para voltar à visão geral com cartões e atividades recentes, clique na aba "Overview".
      Você pode alternar entre as abas a qualquer momento para acessar diferentes tipos de informação.`,
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
    createPageStatsTutorialStep(),
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Criar Nova Filial 📝",
      content: `Para adicionar uma nova filial ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Filiais
      IMPORTANTE: Caso não possua esta permissão, será necessário solicitá-la ao administrador.
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
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
      DICA: Clique nos cabeçalhos das colunas para ordenar os dados e utilize os filtros para refinar a visualização conforme suas necessidades.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações da Filial ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada filial cadastrada.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Filiais
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      ATENÇÃO CRÍTICA: A exclusão de uma filial afetará todos os veículos, motoristas e ordens de serviço associados a ela. Esta ação deve ser realizada com extremo cuidado.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
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
    createPageStatsTutorialStep(),
    {
      target: "[data-tutorial='export-button']",
      title: "Exportar Relatório de Multas 📊",
      content: `Clique aqui para exportar um relatório completo de multas. Ao clicar, escolha o formato desejado:
      • CSV: arquivo de texto separado por vírgulas, compatível com qualquer editor de planilhas
      • Excel (.xlsx): planilha formatada, ideal para análises e filtros avançados
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Multas
      O relatório exportado contém todas as multas filtradas atualmente na tabela, com informações detalhadas como:
      • Dados do veículo e motorista envolvidos
      • Código de infração e valor da multa
      • Datas de ocorrência e vencimento
      • Status de pagamento e observações
      IMPORTANTE: O botão fica desabilitado quando não há dados na tabela para exportar.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
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
      placement: "left",
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
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
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
    createPageStatsTutorialStep(),
    {
      target: "[data-tutorial='export-button']",
      title: "Exportar Relatório de Motoristas 📊",
      content: `Clique aqui para exportar um relatório completo de motoristas. Ao clicar, escolha o formato desejado:
      • CSV: arquivo de texto separado por vírgulas, compatível com qualquer editor de planilhas
      • Excel (.xlsx): planilha formatada, ideal para análises e filtros avançados
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Motoristas
      O relatório exportado contém todos os motoristas filtrados atualmente na tabela, com informações detalhadas como:
      • Nome completo e dados pessoais (CPF, RG)
      • Dados da CNH (número, categoria e validade)
      • Telefone e contato
      • Filial vinculada
      • Status do motorista
      IMPORTANTE: O botão fica desabilitado quando não há dados na tabela para exportar.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Cadastrar Novo Motorista 🆕",
      content: `Para adicionar um novo motorista ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Motoristas
      PERMISSÕES OPCIONAIS:
      • LEITURA em Gerenciar Filiais (para vincular à filial específica)
      IMPORTANTE: Caso não possua as permissões necessárias, será necessário solicitá-las ao administrador.
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
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Motorista ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada motorista cadastrado.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Motoristas
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      NOTA: Desativar um motorista não o exclui permanentemente do sistema, apenas impede que seja associado a novos veículos até ser reativado.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
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
      Selecione entre os tipos disponíveis: Gasolina, Diesel, Etanol, GNV, entre outros.`,
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
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
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
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
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
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
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
    createPageStatsTutorialStep(),
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Cadastrar Nova Peça 🆕",
      content: `Para adicionar uma nova peça ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Peças
      PERMISSÕES OPCIONAIS:
      • LEITURA em Gerenciar Fornecedores (para vincular a um fornecedor)
      IMPORTANTE: Caso não possua as permissões necessárias, será necessário solicitá-las ao administrador.
      Informe descrição detalhada, preço unitário atualizado e opcionalmente selecione um fornecedor preferencial.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Busca de Peças 🔍",
      content: `Encontre rapidamente peças específicas digitando descrição, identificador ou qualquer outra informação cadastrada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Catálogo de Peças 📋",
      content: `Visualize todas as peças cadastradas no sistema com informações completas e organizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Peças
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
      A tabela apresenta descrição detalhada, preço unitário atualizado, fornecedor associado e outras informações relevantes para gestão.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações da Peça ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada peça cadastrada.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Peças
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      Ao editar, você pode atualizar a descrição, preço unitário e fornecedor associado.
      ATENÇÃO: A exclusão só é possível se a peça não estiver vinculada a ordens de serviço no sistema.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
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
      IMPORTANTE: Caso não possua essas permissões, será necessário solicitá-las ao administrador.
      Selecione o perfil de acesso de destino, o recurso específico do sistema e configure se o perfil pode ler e/ou escrever nesse recurso.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Permissões 🔍",
      content: `Encontre rapidamente permissões específicas digitando o nome do perfil de acesso, identificador ou tipo de permissão configurada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Matriz de Permissões 📋",
      content: `Visualize todas as permissões configuradas no sistema de forma clara e organizada.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Permissões de Usuários
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
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
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
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
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
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
      IMPORTANTE: Caso não possua esta permissão, será necessário solicitá-la ao administrador.
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
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
      DICA: Após criar um perfil, use o botão ⋮ para configurar todas as permissões de uma vez. Para ajustes finos em permissões individuais (editar ou excluir uma específica), acesse a página 'Permissões' no menu lateral.`,
      placement: "bottom",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Perfil ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada perfil de acesso cadastrado.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      AÇÕES DISPONÍVEIS E PERMISSÕES NECESSÁRIAS:
      • Configurar Permissões → ESCRITA em Gerenciar Permissões (configura todas as permissões do perfil de uma vez, substituindo as existentes)
      • Editar Perfil → ESCRITA em Gerenciar Perfis de Acesso
      • Excluir Perfil → ESCRITA em Gerenciar Perfis de Acesso
      NOTA: Cada ação é controlada de forma independente — você pode ter acesso a uma sem ter a outra.
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
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
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
    createPageStatsTutorialStep(),
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Vincular Peça à Ordem 🆕",
      content: `Para vincular uma peça a uma ordem de serviço específica, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Peças em Ordens de Serviço
      • LEITURA em Gerenciar Ordens de Serviço
      • LEITURA em Gerenciar Peças
      IMPORTANTE: Caso não possua essas permissões, será necessário solicitá-las ao administrador.
      Informe a quantidade exata utilizada para cálculo preciso dos custos.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Registros 🔍",
      content: `Encontre rapidamente registros específicos digitando o identificador da ordem de serviço, descrição da peça utilizada ou qualquer outra informação relacionada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Controle de Peças por Ordem 📋",
      content: `Visualize todas as peças utilizadas em ordens de serviço com informações detalhadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Peças em Ordens de Serviço
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
      A tabela mostra a ordem de serviço relacionada, peça utilizada, quantidade consumida, valor unitário e total calculado automaticamente.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Registro ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada registro de peça em ordem de serviço.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Peças em Ordens de Serviço
      • LEITURA em Gerenciar Ordens de Serviço
      • LEITURA em Gerenciar Peças
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      Ao editar, você pode atualizar a quantidade utilizada ou substituir a peça selecionada.
      IMPORTANTE: A remoção de um registro afetará diretamente o valor total calculado da ordem de serviço.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
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
    createPageStatsTutorialStep(),
    {
      target: "[data-tutorial='export-button']",
      title: "Exportar Relatório de Ordens de Serviço 📊",
      content: `Clique aqui para exportar um relatório completo de ordens de serviço. Ao clicar, escolha o formato desejado:
      • CSV: arquivo de texto separado por vírgulas, compatível com qualquer editor de planilhas
      • Excel (.xlsx): planilha formatada, ideal para análises e filtros avançados
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Ordens de Serviço
      O relatório exportado contém todas as ordens de serviço filtradas atualmente na tabela, com informações detalhadas como:
      • Veículo e motorista vinculados
      • Tipo de serviço (preventivo ou corretivo)
      • Status (aberta, em andamento, concluída)
      • Datas de abertura, previsão e conclusão
      • Fornecedor responsável (quando aplicável)
      • Custos e observações
      IMPORTANTE: O botão fica desabilitado quando não há dados na tabela para exportar.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
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
      PERMISSÕES OPCIONAIS:
      • LEITURA em Gerenciar Fornecedores (para vincular a uma ordem específica)
      IMPORTANTE: Caso não possua essas permissões, será necessário solicitá-las ao administrador.
      Descreva detalhadamente o problema identificado e informe as datas previstas para execução dos serviços.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Ordens de Serviço 🔍",
      content: `Encontre rapidamente ordens específicas digitando o identificador da ordem, placa do veículo ou qualquer outra informação relacionada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Painel de Ordens de Serviço 📋",
      content: `Visualize todas as ordens de serviço registradas no sistema com informações completas e organizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Ordens de Serviço
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
      A tabela apresenta informações detalhadas como veículo relacionado, tipo de serviço, status atual, datas programadas e valores envolvidos.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações da Ordem de Serviço ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada ordem de serviço registrada.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Ordens de Serviço
      • LEITURA em Gerenciar Veículos
      • LEITURA em Gerenciar Filiais
      • LEITURA em Gerenciar Cadastros de Usuários
      PERMISSÕES OPCIONAIS:
      • LEITURA em Gerenciar Fornecedores (para vincular a uma ordem específica)
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      NOTA: Diferentes ações estarão disponíveis de acordo com o status atual da ordem de serviço (planejada, em andamento, concluída, etc.).`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
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
    createPageStatsTutorialStep(),
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Cadastrar Novo Fornecedor 🆕",
      content: `Para adicionar um novo fornecedor ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Fornecedores
      IMPORTANTE: Caso não possua esta permissão, será necessário solicitá-la ao administrador.
      Informe dados completos como nome/razão social, CNPJ, contatos atualizados, endereço completo, etc.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Fornecedores 🔍",
      content: `Encontre rapidamente fornecedores específicos digitando o CNPJ, cidade de localização ou qualquer outra informação cadastrada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Catálogo de Fornecedores 📋",
      content: `Visualize todos os fornecedores cadastrados no sistema com informações completas e organizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Fornecedores
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
      A tabela apresenta informações essenciais como nome/razão social, CNPJ, contatos atualizados, etc.`,
      placement: "left",
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
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
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
    createPageStatsTutorialStep(),
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Criar Novo Usuário 🆕",
      content: `Para adicionar um novo usuário ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Cadastros de Usuários
      • LEITURA em Gerenciar Perfis de Acesso
      • LEITURA em Gerenciar Motoristas
      IMPORTANTE: Caso não possua essas permissões, será necessário solicitá-las ao administrador.
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
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
      A tabela apresenta informações como nome completo, email de acesso, nível de acesso configurado, perfil atribuído e status de verificação da conta.`,
      placement: "left",
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
      • LEITURA em Gerenciar Motoristas
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      A edição permite atualizar dados pessoais e alterar níveis de acesso e perfis atribuídos ao usuário.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
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
      IMPORTANTE: Caso não possua esta permissão, será necessário solicitá-la ao administrador.
      Informe a descrição específica do tipo, como 'Caminhão Baú', 'Van Utilitária', etc. Seja específico e descritivo para facilitar análises futuras e relatórios segmentados.`,
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
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
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
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
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
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
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
    createPageStatsTutorialStep(),
    {
      target: "[data-tutorial='export-button']",
      title: "Exportar Relatório de Veículos 📊",
      content: `Clique aqui para exportar um relatório completo de veículos. Ao clicar, escolha o formato desejado:
      • CSV: arquivo de texto separado por vírgulas, compatível com qualquer editor de planilhas
      • Excel (.xlsx): planilha formatada, ideal para análises e filtros avançados
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Veículos
      O relatório exportado contém todos os veículos filtrados atualmente na tabela, com informações detalhadas como:
      • Placa, modelo, marca e ano de fabricação
      • Tipo de veículo e tipo de combustível
      • Status operacional (ativo, inativo, em manutenção)
      • Quilometragem atual e da última revisão
      • Filial vinculada e motorista atribuído
      • Documentação (Renavam) e dados técnicos
      IMPORTANTE: O botão fica desabilitado quando não há dados na tabela para exportar.`,
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
      IMPORTANTE: Caso não possua as permissões obrigatórias, será necessário solicitá-las ao administrador.
      Informe dados essenciais como placa, modelo, ano de fabricação, número do chassi, entre outras informações técnicas importantes.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Veículos 🔍",
      content: `Encontre rapidamente veículos específicos digitando placa, modelo, ou qualquer outra informação cadastrada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Painel da Frota 📋",
      content: `Visualize todos os veículos da frota com informações completas e organizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Veículos
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
      A tabela apresenta informações essenciais como placa, modelo, ano de fabricação, tipo de veículo, status operacional atual e filial associada.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Veículo ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada veículo cadastrado.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Veículos
      • LEITURA em Gerenciar Tipos de Combustível
      PERMISSÕES OPCIONAIS:
      • LEITURA em Gerenciar Tipos de Veículos (para selecionar o tipo específico)
      • LEITURA em Gerenciar Filiais (para vincular à filial responsável)
      • LEITURA em Gerenciar Motoristas (para atribuir um motorista específico)
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
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
    createPageStatsTutorialStep(),
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      Esta ação é útil para verificar atualizações em tempo real dos status de pagamento e novos vencimentos.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
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
      IMPORTANTE: Caso não possua as permissões necessárias, será necessário solicitá-las ao administrador.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Contas 🔍",
      content: `Encontre rapidamente contas específicas digitando o nome da filial responsável, identificador da conta ou qualquer outra informação relacionada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Painel Financeiro 📋",
      content: `Visualize todas as contas a pagar registradas com informações completas e status atualizados.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Contas a Pagar
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
      A tabela apresenta informações essenciais como valor da conta, data de vencimento, data de pagamento, filial responsável e status atual.
      DICA VISUAL: As cores das linhas indicam status importantes: Verde = Conta Paga, Amarelo = Próximo do vencimento, Vermelho = Conta Vencida.`,
      placement: "left",
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
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/fuel": [
    {
      target: "[data-tutorial='welcome']",
      title: "Controle de Abastecimento ⛽",
      content: `Esta é sua central de controle completo de abastecimentos da frota.
      Registre e monitore todos os abastecimentos realizados, controle custos com combustível e acompanhe o consumo de cada veículo para otimizar a gestão operacional.`,
      placement: "center",
    },
    createPageStatsTutorialStep(),
    {
      target: "[data-tutorial='export-button']",
      title: "Exportar Relatório de Abastecimentos 📊",
      content: `Clique aqui para exportar um relatório completo de abastecimentos. Ao clicar, escolha o formato desejado:
      • CSV: arquivo de texto separado por vírgulas, compatível com qualquer editor de planilhas
      • Excel (.xlsx): planilha formatada, ideal para análises e filtros avançados
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Abastecimento
      O relatório exportado contém todos os abastecimentos filtrados atualmente na tabela, com informações detalhadas como:
      • Dados do veículo e motorista responsável
      • Tipo de combustível utilizado
      • Quantidade de litros e valor total
      • Quilometragem registrada no odômetro
      • Data do abastecimento
      IMPORTANTE: O botão fica desabilitado quando não há dados na tabela para exportar.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      Esta ação é útil para verificar novos abastecimentos registrados por outros usuários em tempo real.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Registrar Novo Abastecimento 🆕",
      content: `Para adicionar um novo registro de abastecimento ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Abastecimento
      • LEITURA em Gerenciar Veículos
      • LEITURA em Gerenciar Tipos de Combustível
      • LEITURA em Gerenciar Filiais (para vincular à filial responsável)
      • LEITURA em Gerenciar Motoristas (para identificar o condutor)
      IMPORTANTE: Caso não possua as permissões necessárias, será necessário solicitá-las ao administrador.
      Informe dados precisos como quantidade de litros, valor total, odômetro atual e posto onde foi realizado o abastecimento.`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Abastecimentos 🔍",
      content: `Encontre rapidamente registros específicos digitando placa do veículo, ou qualquer outra informação relacionada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Histórico de Abastecimentos 📋",
      content: `Visualize todos os abastecimentos registrados no sistema com informações completas e organizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Abastecimento
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
      A tabela apresenta informações detalhadas como veículo abastecido, tipo de combustível, quantidade em litros, valor total, data/hora do abastecimento e localização do posto.
      DICA: Use os filtros para analisar consumo por período, veículo específico ou tipo de combustível.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Abastecimento ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada registro de abastecimento.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Abastecimento
      • LEITURA em Gerenciar Veículos
      • LEITURA em Gerenciar Tipos de Combustível
      • LEITURA em Gerenciar Filiais
      • LEITURA em Gerenciar Motoristas
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      Funcionalidades disponíveis:
      • Ver Detalhes: exibe informações completas do abastecimento, incluindo dados do veículo, motorista, combustível, verificação por IA e análise de eficiência (consumo km/L, custo por km e autonomia estimada)`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/vehicle-checklist": [
    {
      target: "[data-tutorial='welcome']",
      title: "Central de Checklist Veicular 📋",
      content: `Nesta página você gerencia todos os checklists veiculares realizados para sua frota de forma completa e organizada.
      Registre inspeções veiculares detalhadas, monitore a condição dos veículos e mantenha histórico completo de verificações de segurança e conformidade.`,
      placement: "center",
    },
    createPageStatsTutorialStep(),
    {
      target: "[data-tutorial='export-button']",
      title: "Exportar Relatório de Checklists 📊",
      content: `Clique aqui para exportar um relatório completo de checklists. Ao clicar, escolha o formato desejado:
      • CSV: arquivo de texto separado por vírgulas, compatível com qualquer editor de planilhas
      • Excel (.xlsx): planilha formatada, ideal para análises e filtros avançados
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Checklist dos Veículos
      O relatório exportado contém todos os checklists filtrados atualmente na tabela, com informações detalhadas como:
      • Dados do veículo e motorista responsável
      • Condição dos pneus e funcionamento dos faróis
      • Nível de combustível, óleo, radiador e fluido de freio
      • Cintos de segurança e estado do volante
      • Data e resultado geral do checklist
      IMPORTANTE: O botão fica desabilitado quando não há dados na tabela para exportar.`,
      placement: "bottom",
    },
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      Esta ação é útil para verificar novos checklists registrados por outros usuários em tempo real.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Criar Novo Checklist Veicular 🆕",
      content: `Para registrar um novo checklist veicular no sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Checklist dos Veículos
      • LEITURA em Gerenciar Veículos
      • LEITURA em Gerenciar Filiais
      • LEITURA em Gerenciar Motoristas
      IMPORTANTE: Caso não possua essas permissões, será necessário solicitá-las ao administrador.
      O processo é organizado em 3 etapas:
      1. Seleção da filial responsável
      2. Escolha do veículo e motorista para inspeção
      3. Preenchimento completo do checklist com fotos obrigatórias`,
      placement: "bottom",
    },
    {
      target: "[placeholder='Procurar...']",
      title: "Buscar Checklists 🔍",
      content: `Encontre rapidamente checklists específicos digitando placa do veículo, nome do motorista, filial ou qualquer outra informação relacionada ao checklist realizado.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Painel de Checklists Veiculares 📋",
      content: `Visualize todos os checklists veiculares registrados no sistema com informações completas e organizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Checklist dos Veículos
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
      A tabela apresenta informações essenciais como veículo inspecionado, motorista responsável, data do checklist, quilometragem registrada, condição geral do veículo e status da inspeção.
      DICA VISUAL: As cores das linhas indicam a condição geral: Verde = Aprovado, Amarelo = Aprovado com Restrições, Vermelho = Reprovado.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Checklist ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada checklist veicular registrado.
      IMPORTANTE: Os botões só são exibidos quando há registros na tabela.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Checklist dos Veículos
      • LEITURA em Gerenciar Veículos
      • LEITURA em Gerenciar Filiais
      • LEITURA em Gerenciar Motoristas
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      Funcionalidades disponíveis:
      • Ver Detalhes: exibe informações completas do checklist, incluindo dados do veículo, motorista, condição de cada item inspecionado, observações e verificação por IA`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Personalizar a visualização para focar apenas nas informações mais relevantes
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/deliveries": [
    {
      target: "[data-tutorial='welcome']",
      title: "Módulo de Entregas 📦",
      content: `Esta é a central de distribuição da sua operação: aqui você cadastra as entregas, acompanha cada uma até a porta do destinatário e registra o que sai do previsto.
      Uma entrega nasce de duas formas: cadastrada manualmente ou importada do XML da NF-e, que preenche destinatário, endereço e itens automaticamente.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Entregas para visualizar esta página
      IMPORTANTE: Este módulo precisa estar contratado pela empresa. Se o módulo Entregas for desabilitado, a página deixa de ser acessível para todos os usuários da empresa, mesmo os que possuem a permissão.`,
      placement: "center",
    },
    {
      target: "[data-tutorial='deliveries-tabs']",
      title: "As Três Abas do Módulo 📑",
      content: `O módulo é organizado em três tabelas independentes, cada uma com sua própria busca, filtros e paginação:
      • Entregas: as entregas em si, com status, destinatário e ocorrências
      • Embarcadores: quem envia a carga — o remetente vinculado a cada entrega
      • Tipos de Ocorrência: o catálogo de imprevistos que a operação pode registrar
      DICA: A aba escolhida fica na URL, então o link que você compartilha reabre exatamente na tabela que você estava vendo.
      NOTA: Cada aba tem o seu próprio tutorial, que abre na primeira vez que você entrar nela.`,
      placement: "bottom",
      spotlightPadding: 8,
    },
    createPageStatsTutorialStep(),
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Se os dados parecerem desatualizados, clique aqui para recarregar as informações mais recentes do servidor sem precisar atualizar a página inteira.
      É especialmente útil neste módulo, onde motoristas e outros operadores alteram status ao longo do dia.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
    {
      target: "[data-tutorial='import-xml-button']",
      title: "Importar XML da NF-e 📄",
      content: `A forma mais rápida de cadastrar uma entrega: envie o arquivo XML da nota fiscal e o sistema extrai tudo sozinho.
      São lidos automaticamente:
      • Destinatário, documento e endereço completo de entrega
      • Número da nota e chave de acesso de 44 dígitos
      • Os itens da carga, com quantidade e valor unitário
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Entregas
      IMPORTANTE: A chave de acesso impede duplicidade — se a mesma nota for importada duas vezes, a segunda é recusada em vez de criar uma entrega repetida.
      DICA: Você pode arrastar o arquivo para dentro do modal em vez de procurá-lo no computador.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Nova Entrega 🆕",
      content: `Cadastre uma entrega manualmente quando não houver nota fiscal — ou quando ela ainda não tiver sido emitida.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Entregas
      O formulário pede:
      • Embarcador responsável pela carga (obrigatório)
      • Destinatário e endereço de entrega, com o CEP preenchendo cidade, bairro e rua automaticamente
      • Itens da carga, com quantidade e valor unitário
      • Data prevista de entrega, quando houver
      IMPORTANTE: Se o botão estiver desabilitado, passe o mouse sobre ele — o sistema informa exatamente qual permissão está faltando.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='deliveries-search']",
      title: "Buscar Entregas 🔍",
      content: `Encontre uma entrega específica digitando nome do destinatário, número do pedido, chave da NF-e ou cidade de destino.
      NOTA: A busca não requer permissões especiais e está sempre disponível.
      DICA: A busca percorre todas as entregas da empresa, não apenas as da página atual.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='deliveries-filters']",
      title: "Filtros da Operação 🎯",
      content: `Os filtros respondem às perguntas do dia a dia da distribuição:
      • Status: separa o que está pendente, em rota, entregue, com insucesso ou cancelado
      • Embarcador: isola a carga de um remetente específico
      • Destino: agrupa as entregas por cidade
      • Motorista: mostra a carga de um condutor
      DICA: Os filtros se combinam — "em rota" + "motorista X" responde onde está a carga daquele condutor agora.
      NOTA: Quando algum filtro está ativo aparece o botão Resetar, que limpa todos de uma vez.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Tabela de Entregas 📋",
      content: `Todas as entregas da empresa, com o essencial em cada linha: destinatário, embarcador, destino, status atual e data prevista.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Entregas
      O status segue um caminho definido e não aceita saltos:
      • Pendente → Em Rota ou Cancelada
      • Em Rota → Entregue, Insucesso, de volta para Pendente, ou Cancelada
      • Insucesso → Pendente (para nova tentativa) ou Cancelada
      IMPORTANTE: Entregue e Cancelada são estados finais — uma vez lá, a entrega não muda mais de status.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      target: "[data-tutorial='deliveries-select-all']",
      title: "Atribuir Motorista em Lote 🚚",
      content: `Marque as caixas de seleção das entregas pendentes e a ação "Atribuir motorista" surge numa barra flutuante sobre a base da tela.
      Na prática da distribuição, o despachante separa a carga do dia e manda um bloco inteiro para o mesmo motorista — por isso a atribuição é em lote, não uma a uma.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Entregas
      Como funciona:
      • Só entregas pendentes entram — se a seleção tiver outra, o botão explica antes mesmo de enviar
      • O motorista é obrigatório e precisa estar ativo; o veículo é opcional
      • Atribuir NÃO muda o status: a entrega ganha o selo "Designada" e só entra Em Rota quando o motorista iniciar a rota pelo aplicativo
      DICA: Para reatribuir, selecione de novo e escolha outro motorista — o par anterior é substituído; veículo omitido é limpo.`,
      placement: "right",
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações da Entrega ⚙️",
      content: `Nesta coluna ficam o ícone de olho e o menu de três pontos (⋮) de cada entrega.
      Ambos abrem os Detalhes, que é onde a operação acontece:
      • Histórico completo, com itens da carga e endereço de entrega
      • Ocorrências já registradas, com data, autor e localização
      • Registrar ocorrência: informa um imprevisto (avaria, ausência do destinatário, endereço não localizado)
      • Mudar status: avança a entrega, e ao marcar como Entregue você pode informar quem recebeu
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Entregas para mudar o status
      • ESCRITA em Gerenciar Ocorrências de Entrega para registrar ocorrências
      IMPORTANTE: Os botões continuam visíveis mesmo sem permissão, porém desabilitados — passe o mouse para ver o que falta.
      NOTA: Os botões de ação só aparecem quando há registros na tabela.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Clique aqui para personalizar quais colunas da tabela deseja visualizar.
      Você pode:
      • Mostrar ou ocultar colunas específicas conforme sua necessidade
      • Focar apenas nas informações relevantes para a sua rotina
      • Otimizar o espaço da tela removendo colunas desnecessárias
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/deliveries/occurrences": [
    {
      target: "[data-tutorial='deliveries-tabs']",
      title: "Feed de Ocorrências 📋",
      content: `Todas as ocorrências da operação em uma tabela só — o que antes exigia abrir entrega por entrega.
      Cada linha mostra o tipo (com o triângulo vermelho nas impeditivas), a entrega afetada, quem registrou, as fotos e o local.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Ocorrências
      NOTA: Ocorrência impeditiva também toca o sininho do gestor na hora em que acontece — aqui é onde você revisa o histórico completo.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='deliveries-filters']",
      title: "Filtrar o que importa 🎯",
      content: `Os filtros separam o ruído do urgente:
      • Gravidade: impeditivas (derrubaram a entrega) ou informativas
      • Tipo: isola um tipo de ocorrência específico
      • Status da entrega: veja só o que ainda está em aberto
      DICA: A busca encontra por destinatário ou pelo nome do tipo.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Fotos e local 📸",
      content: `Clique em qualquer miniatura para ver a foto em tamanho grande sem sair da tela.
      O "Ver no mapa" abre o ponto exato onde o motorista registrou a ocorrência.
      IMPORTANTE: As linhas chegam da mais recente para a mais antiga — o topo da tabela é o agora da operação.`,
      placement: "left",
      spotlightPadding: 20,
    },
  ],
  "/dashboard/deliveries/monitoring": [
    {
      target: "[data-tutorial='deliveries-tabs']",
      title: "Monitoramento da Operação 📊",
      content: `A resposta rápida para "como está a operação agora?":
      • Sem Motorista: pendentes que ainda precisam de rota — o número que o despachante zera
      • Designadas e Em Rota: o que está com motorista, parado ou na rua
      • Entregues e Insucessos de hoje: o que o dia produziu
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Entregas
      NOTA: "Hoje" conta a partir da meia-noite.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='monitoring-board']",
      title: "Quadro por Motorista 🚚",
      content: `Cada motorista com carga aparece aqui, o mais ocupado primeiro:
      • Os selos mostram designadas, em rota, entregues e insucessos do dia
      • A barra verde é o progresso da rota: entregas comprovadas sobre a carga do dia
      DICA: Use o botão Atualizar para trazer os números mais recentes — a posição ao vivo no mapa chega na torre de controle.`,
      placement: "top",
    },
  ],
  "/dashboard/deliveries/chat": [
    {
      target: "[data-tutorial='deliveries-tabs']",
      title: "Chat com os motoristas 💬",
      content: `A conversa da operação sai do grupo de WhatsApp e entra na plataforma, registrada e ligada às entregas.
      Cada motorista tem UMA conversa — as mensagens podem referenciar uma entrega específica, que aparece como um cartãozinho clicável.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Entregas para ver as conversas
      • ESCRITA em Gerenciar Entregas para enviar
      NOTA: O motorista recebe no aplicativo — e no celular via notificação quando o app está fechado.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='chat-threads']",
      title: "Suas conversas 📋",
      content: `A lista mostra quem está online (bolinha verde), a última mensagem e quantas você ainda não leu.
      • O botão de nova conversa abre o chat com qualquer motorista ativo
      • O megafone envia um aviso em massa: o mesmo texto, individual, para vários motoristas
      DICA: A busca encontra por nome do motorista e também dentro das mensagens.`,
      placement: "right",
    },
    {
      target: "[data-tutorial='chat-conversation']",
      title: "A conversa 🚚",
      content: `Tudo em tempo real: "digitando...", presença e os checks de leitura — ✓ enviada, ✓✓ lida pelo motorista.
      • O motorista pode responder com texto, foto e áudio (a voz é o jeito seguro de falar dirigindo)
      • O cartão de entrega dentro da mensagem abre o detalhe completo
      IMPORTANTE: As mensagens são registro da operação — não há como editar nem apagar.`,
      placement: "left",
      spotlightPadding: 12,
    },
  ],
  "/dashboard/deliveries/shippers": [
    {
      target: "[data-tutorial='welcome']",
      title: "Embarcadores 🏭",
      content: `O embarcador é quem envia a carga — o remetente por trás de cada entrega. Pode ser a sua própria empresa, um cliente que contrata o seu transporte ou um parceiro comercial.
      Cadastrar embarcadores aqui é o que permite, na aba Entregas, responder rapidamente "de quem é esta carga?" e filtrar a operação por remetente.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Entregas para visualizar esta aba
      NOTA: Embarcadores usam a mesma permissão das entregas — quem gerencia entregas gerencia embarcadores.`,
      placement: "center",
    },
    createPageStatsTutorialStep(),
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Recarrega a lista de embarcadores com as informações mais recentes do servidor, sem atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Novo Embarcador 🆕",
      content: `Cadastre quem envia a carga.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Entregas
      O formulário pede:
      • Nome do embarcador (obrigatório e único dentro da empresa)
      • CNPJ, e-mail e telefone para contato
      • Endereço, com o CEP preenchendo cidade, bairro e rua automaticamente
      IMPORTANTE: Dois embarcadores não podem ter o mesmo nome na mesma empresa — é isso que evita duplicidade na hora de escolher o remetente de uma entrega.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='deliveries-search']",
      title: "Buscar Embarcadores 🔍",
      content: `Digite nome, CNPJ ou e-mail para localizar um embarcador específico.
      NOTA: A busca não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='deliveries-filters']",
      title: "Filtro de Status 🎯",
      content: `Separa os embarcadores ativos dos inativos.
      Um embarcador inativo continua no sistema com todo o seu histórico, mas sai do caminho de quem está cadastrando uma entrega nova.
      DICA: Inativar é o caminho recomendado para um remetente que parou de operar — preserva as entregas antigas, que continuam vinculadas a ele.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Tabela de Embarcadores 📋",
      content: `Todos os embarcadores cadastrados, com identificador, nome, CNPJ, contato, cidade e as datas de criação e atualização.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Entregas
      DICA: O identificador é útil para suporte — você pode copiá-lo pelo menu de ações de cada linha.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Embarcador ⚙️",
      content: `O menu de três pontos (⋮) de cada linha oferece:
      • Editar Embarcador: atualiza dados cadastrais e de contato
      • Copiar ID: coloca o identificador na área de transferência
      • Excluir: remove o embarcador do sistema
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Entregas para editar e excluir
      IMPORTANTE: Um embarcador que já possui entregas vinculadas não pode ser excluído — o sistema informa quantas entregas dependem dele. Nesse caso, inative-o em vez de excluir: o histórico das entregas continua íntegro.
      NOTA: Sem a permissão de escrita os itens aparecem desabilitados, e o motivo surge ao passar o mouse.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Personalize quais colunas da tabela deseja visualizar, ocultando o que não faz parte da sua rotina.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
  "/dashboard/deliveries/occurrence-types": [
    {
      target: "[data-tutorial='welcome']",
      title: "Tipos de Ocorrência ⚠️",
      content: `Aqui você define o vocabulário de imprevistos da sua operação: destinatário ausente, endereço não localizado, carga avariada, recusa no recebimento.
      Cadastrar os tipos antes tem um motivo prático: na hora da ocorrência, quem está na rua escolhe de uma lista em vez de escrever texto livre — e isso é o que torna possível medir depois quantas entregas falharam por cada motivo.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Ocorrências de Entrega para visualizar esta aba
      IMPORTANTE: Esta aba usa uma permissão própria, diferente da permissão de entregas. É possível dar a um usuário o direito de registrar ocorrências sem deixá-lo mexer no catálogo de tipos.`,
      placement: "center",
    },
    createPageStatsTutorialStep(),
    {
      target: "[data-revalidate]",
      title: "Atualização de Dados 🔄",
      content: `Recarrega os tipos de ocorrência com as informações mais recentes do servidor, sem atualizar a página inteira.
      NOTA: Esta ação não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
    {
      target: "[data-tutorial='create-button']",
      title: "Novo Tipo de Ocorrência 🆕",
      content: `Cadastre um novo motivo que a operação poderá registrar.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Ocorrências de Entrega
      Além do nome e da descrição, duas opções mudam o comportamento da entrega:
      • Exige foto: quem registrar a ocorrência precisará anexar uma imagem como comprovação
      • Impeditiva: sinaliza que a ocorrência bloqueia a conclusão da entrega, como uma avaria grave
      DICA: Nomes curtos e claros funcionam melhor — quem escolhe está na rua, muitas vezes no celular.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='deliveries-search']",
      title: "Buscar Tipos 🔍",
      content: `Digite nome ou descrição para localizar um tipo de ocorrência específico.
      NOTA: A busca não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='deliveries-filters']",
      title: "Filtros do Catálogo 🎯",
      content: `Três filtros ajudam a revisar o catálogo:
      • Status: separa os tipos ativos dos inativos
      • Impeditiva: isola os motivos que bloqueiam a conclusão da entrega
      • Foto: mostra quais exigem comprovação por imagem
      DICA: Filtrar por "impeditiva" é uma boa forma de revisar periodicamente se a régua da operação continua adequada.`,
      placement: "bottom",
    },
    {
      target: "[role='table']",
      title: "Tabela de Tipos de Ocorrência 📋",
      content: `O catálogo completo, com identificador, nome, descrição, se exige foto, se é impeditiva, status e as datas de criação e atualização.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Ocorrências de Entrega
      NOTA: Estes tipos alimentam a lista que aparece em Registrar ocorrência, dentro dos detalhes de cada entrega.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      target: "[role='table'] th:last-child",
      title: "Ações do Tipo ⚙️",
      content: `O menu de três pontos (⋮) de cada linha oferece:
      • Editar Tipo: ajusta nome, descrição e as opções de foto e impedimento
      • Copiar ID: coloca o identificador na área de transferência
      • Excluir: remove o tipo do catálogo
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Ocorrências de Entrega para editar e excluir
      IMPORTANTE: Um tipo que já foi usado em alguma ocorrência não pode ser excluído — o sistema informa quantas ocorrências dependem dele. Inative-o em vez de excluir: ele sai da lista de escolha e o histórico continua legível.
      NOTA: Sem a permissão de escrita os itens aparecem desabilitados, e o motivo surge ao passar o mouse.`,
      placement: "bottom",
    },
    {
      target: "[data-tutorial='view-options']",
      title: "Opções de Visualização 👁️",
      content: `Personalize quais colunas da tabela deseja visualizar, ocultando o que não faz parte da sua rotina.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "left",
    },
  ],
};

export {
  tutorialConfigs,
  canViewAdvancedFeatures,
  shouldShowInteractiveCards,
  shouldShowQuickAccess,
  shouldDisplayDashboardCard,
  hasPermission,
};

export type { TutorialStep };
