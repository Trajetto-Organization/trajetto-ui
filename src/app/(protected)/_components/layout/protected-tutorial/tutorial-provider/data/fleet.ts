import type { TutorialConfig } from "../tutorial-provider.types";

import {
  exportStep,
  filtersStep,
  revalidateStep,
  statsStep,
  tableActionVariants,
  viewOptionsStep,
} from "./factories";

/**
 * Tours of the fleet and registration pages (/dashboard). The /admin twins
 * are derived from these in ./admin.
 */
const fleetTours: TutorialConfig = {
  "/dashboard/branch": [
    {
      title: "Central de Filiais 🏢",
      content: `Aqui você gerencia de forma centralizada todas as filiais cadastradas da sua empresa. Cada filial pode ter veículos específicos, motoristas dedicados e ordens de serviço associadas.`,
      placement: "center",
    },
    statsStep(),
    revalidateStep(),
    {
      anchor: "create-button",
      title: "Criar Nova Filial 📝",
      content: `Para adicionar uma nova filial ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Filiais
      IMPORTANTE: Caso não possua esta permissão, será necessário solicitá-la ao administrador.
      Ao adicionar uma filial, você precisará fornecer informações essenciais como CNPJ, razão social, endereço completo e dados para contato.`,
      placement: "bottom",
    },
    {
      anchor: "table-search",
      title: "Busca Inteligente de Filiais 🔍",
      content: `Encontre rapidamente filiais específicas digitando qualquer informação relacionada, como nome fantasia, CNPJ ou cidade.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    filtersStep(
      "branch-filters",
      "Filtre por status (ativas ou inativas) e UF da filial.",
    ),
    {
      anchor: "data-table",
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
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações da Filial ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada filial cadastrada.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Filiais
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      ATENÇÃO CRÍTICA: A exclusão de uma filial afetará todos os veículos, motoristas e ordens de serviço associados a ela. Esta ação deve ser realizada com extremo cuidado.`,
      placement: "bottom",
    },
    viewOptionsStep(),
  ],
  "/dashboard/fine": [
    {
      title: "Gestão de Multas 🚦",
      content: `Controle completo e inteligente de multas e infrações de trânsito da sua frota.
      DICA: Gerencie pagamentos, monitore pontuação na CNH e mantenha histórico completo de infrações.`,
      placement: "center",
    },
    statsStep(),
    {
      anchor: "export-button",
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
    revalidateStep(),
    {
      anchor: "create-button",
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
      anchor: "table-search",
      title: "Busca de Multas 🔍",
      content: `Localize multas rapidamente por valor, código de infração, placa do veículo, nome do motorista ou qualquer informação relacionada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    filtersStep(
      "fine-filters",
      "Filtre por situação da multa, código da infração e filial.",
    ),
    {
      anchor: "data-table",
      title: "Registro de Multas 📋",
      content: `Visualize todas as multas registradas no sistema com informações completas e organizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Multas
      DICA: Use os filtros inteligentes por valor, código de infração ou filial específica para refinar sua visualização.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      anchor: "row-actions",
      variants: tableActionVariants(),
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
    viewOptionsStep(),
  ],
  "/dashboard/driver": [
    {
      title: "Central de Motoristas 👨‍✈️",
      content: `Nesta página você gerencia todos os motoristas cadastrados no sistema de forma organizada e eficiente.
      Mantenha informações sempre atualizadas sobre habilitação, documentos pessoais e histórico de condução de cada condutor da sua frota.`,
      placement: "center",
    },
    statsStep(),
    {
      anchor: "export-button",
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
    revalidateStep(),
    {
      anchor: "create-button",
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
      anchor: "table-search",
      title: "Busca de Motoristas 🔍",
      content: `Encontre rapidamente motoristas específicos digitando nome completo, CPF, número de CNH ou qualquer outra informação relevante cadastrada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    filtersStep(
      "driver-filters",
      "Filtre por status, tipo de contrato, categoria da CNH e filial do motorista.",
    ),
    {
      anchor: "data-table",
      title: "Painel de Motoristas 📋",
      content: `Visualize todos os motoristas cadastrados com informações detalhadas e atualizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Motoristas
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações do Motorista ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada motorista cadastrado.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Motoristas
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      NOTA: Desativar um motorista não o exclui permanentemente do sistema, apenas impede que seja associado a novos veículos até ser reativado.`,
      placement: "bottom",
    },
    viewOptionsStep(),
  ],
  "/dashboard/fuel-type": [
    {
      title: "Gestão de Combustíveis ⛽",
      content: `Gerencie os tipos de combustível utilizados pela sua frota de forma organizada e eficiente.
      Esta configuração é fundamental para o controle preciso de abastecimento e análise detalhada de consumo dos veículos.`,
      placement: "center",
    },
    {
      anchor: "create-button",
      title: "Adicionar Combustível 🆕",
      content: `Para cadastrar um novo tipo de combustível no sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Tipos de Combustível
      IMPORTANTE: Caso não possua esta permissão, será necessário solicitá-la ao administrador do sistema.
      Selecione entre os tipos disponíveis: Gasolina, Diesel, Etanol, GNV, entre outros.`,
      placement: "bottom",
    },
    {
      anchor: "table-search",
      title: "Busca Rápida 🔍",
      content: `Digite para filtrar os tipos de combustível cadastrados no sistema de forma instantânea.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      anchor: "data-table",
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
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações do Combustível ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada tipo de combustível cadastrado.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Tipos de Combustível
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      ATENÇÃO: Só é possível excluir tipos que não estejam associados a nenhum veículo no sistema.`,
      placement: "bottom",
    },
    revalidateStep(),
    viewOptionsStep(),
  ],
  "/dashboard/part": [
    {
      title: "Inventário de Peças 🔧",
      content: `Aqui você gerencia o cadastro completo de peças e componentes para manutenção da sua frota.
      Mantenha um registro detalhado e organizado de todas as peças utilizadas nos veículos para controle eficiente de estoque e custos.`,
      placement: "center",
    },
    statsStep(),
    revalidateStep(),
    {
      anchor: "create-button",
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
      anchor: "table-search",
      title: "Busca de Peças 🔍",
      content: `Encontre rapidamente peças específicas digitando descrição, identificador ou qualquer outra informação cadastrada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    filtersStep("part-filters", "Filtre por fornecedor da peça."),
    {
      anchor: "data-table",
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
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações da Peça ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada peça cadastrada.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Peças
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      Ao editar, você pode atualizar a descrição, preço unitário e fornecedor associado.
      ATENÇÃO: A exclusão só é possível se a peça não estiver vinculada a ordens de serviço no sistema.`,
      placement: "bottom",
    },
    viewOptionsStep(),
  ],
  "/dashboard/permission": [
    {
      title: "Central de Permissões 🔐",
      content: `Nesta página você gerencia as permissões de acesso do sistema de forma granular e segura.
      Configure precisamente quais ações cada perfil de acesso pode realizar dentro da plataforma. Esta é uma área crítica e sensível do sistema!`,
      placement: "center",
    },
    {
      anchor: "create-button",
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
      anchor: "table-search",
      title: "Buscar Permissões 🔍",
      content: `Encontre rapidamente permissões específicas digitando o nome do perfil de acesso, identificador ou tipo de permissão configurada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    filtersStep(
      "permission-filters",
      "Filtre por recurso, perfil de acesso e se a permissão concede leitura ou escrita.",
    ),
    {
      anchor: "data-table",
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
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações da Permissão ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada permissão configurada.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Permissões de Usuários
      • LEITURA em Gerenciar Perfis de Acesso
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      Ao editar, você pode modificar o tipo de permissão concedida (leitura/escrita).
      CUIDADO: A exclusão remove completamente o acesso ao recurso para o perfil selecionado!`,
      placement: "bottom",
    },
    revalidateStep(),
    viewOptionsStep(),
  ],
  "/dashboard/profile-access": [
    {
      title: "Perfis de Acesso 👥",
      content: `Aqui você gerencia os perfis de acesso do sistema de forma estratégica e organizada.
      Perfis são conjuntos estruturados de permissões que podem ser atribuídos a usuários, facilitando significativamente o controle de acesso em grupo.`,
      placement: "center",
    },
    {
      anchor: "create-button",
      title: "Criar Novo Perfil 🆕",
      content: `Para adicionar um novo perfil de acesso ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Perfis de Acesso
      IMPORTANTE: Caso não possua esta permissão, será necessário solicitá-la ao administrador.
      Informe um nome descritivo e claro para o perfil (exemplos: 'Supervisor de Operação', 'Analista Administrativo', 'Analista Operacional').`,
      placement: "bottom",
    },
    {
      anchor: "table-search",
      title: "Buscar Perfis 🔍",
      content: `Encontre rapidamente perfis específicos digitando o nome ou qualquer informação relacionada ao perfil desejado.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      anchor: "data-table",
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
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações do Perfil ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada perfil de acesso cadastrado.
      AÇÕES DISPONÍVEIS E PERMISSÕES NECESSÁRIAS:
      • Configurar Permissões → ESCRITA em Gerenciar Permissões (configura todas as permissões do perfil de uma vez, substituindo as existentes)
      • Editar Perfil → ESCRITA em Gerenciar Perfis de Acesso
      • Excluir Perfil → ESCRITA em Gerenciar Perfis de Acesso
      NOTA: Cada ação é controlada de forma independente — você pode ter acesso a uma sem ter a outra.
      ATENÇÃO CRÍTICA: Excluir um perfil removerá TODAS as permissões associadas a ele e afetará TODOS os usuários que o utilizam!`,
      placement: "bottom",
    },
    revalidateStep(),
    viewOptionsStep(),
  ],
  "/dashboard/service-order-part": [
    {
      title: "Peças em Ordens de Serviço 🔧",
      content: `Nesta página você gerencia de forma detalhada as peças utilizadas em cada ordem de serviço específica.
      Controle precisamente quais peças foram utilizadas, quantidades consumidas e valores aplicados para um controle rigoroso de custos operacionais.`,
      placement: "center",
    },
    statsStep(),
    revalidateStep(),
    {
      anchor: "create-button",
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
      anchor: "table-search",
      title: "Buscar Registros 🔍",
      content: `Encontre rapidamente registros específicos digitando o identificador da ordem de serviço, descrição da peça utilizada ou qualquer outra informação relacionada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    filtersStep(
      "order-part-filters",
      "Filtre por peça vinculada à ordem de serviço.",
    ),
    {
      anchor: "data-table",
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
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações do Registro ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada registro de peça em ordem de serviço.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Peças em Ordens de Serviço
      • LEITURA em Gerenciar Ordens de Serviço
      • LEITURA em Gerenciar Peças
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      Ao editar, você pode atualizar a quantidade utilizada ou substituir a peça selecionada.
      IMPORTANTE: A remoção de um registro afetará diretamente o valor total calculado da ordem de serviço.`,
      placement: "bottom",
    },
    viewOptionsStep(),
  ],
  "/dashboard/service-order": [
    {
      title: "Central de Ordens de Serviço 🛠️",
      content: `Aqui você gerencia todas as ordens de serviço da sua frota de forma centralizada e eficiente.
      Registre manutenções em oficina própria (interna) ou de terceiros (externa) e acompanhe a situação de cada serviço para manter a frota operacional e segura.`,
      placement: "center",
    },
    statsStep(),
    {
      anchor: "export-button",
      title: "Exportar Relatório de Ordens de Serviço 📊",
      content: `Clique aqui para exportar um relatório completo de ordens de serviço. Ao clicar, escolha o formato desejado:
      • CSV: arquivo de texto separado por vírgulas, compatível com qualquer editor de planilhas
      • Excel (.xlsx): planilha formatada, ideal para análises e filtros avançados
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Ordens de Serviço
      O relatório exportado contém todas as ordens de serviço filtradas atualmente na tabela, com informações detalhadas como:
      • Veículo e motorista vinculados
      • Tipo de manutenção (interna ou externa)
      • Status (aberta, em andamento, concluída)
      • Datas de abertura, previsão e conclusão
      • Fornecedor responsável (quando aplicável)
      • Custos e observações
      IMPORTANTE: O botão fica desabilitado quando não há dados na tabela para exportar.`,
      placement: "bottom",
    },
    revalidateStep(),
    {
      anchor: "create-button",
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
      anchor: "table-search",
      title: "Buscar Ordens de Serviço 🔍",
      content: `Encontre rapidamente ordens específicas digitando o identificador da ordem, placa do veículo ou qualquer outra informação relacionada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    filtersStep(
      "service-order-filters",
      "Filtre por situação, tipo de manutenção (interna ou externa) e filial.",
    ),
    {
      anchor: "data-table",
      title: "Painel de Ordens de Serviço 📋",
      content: `Visualize todas as ordens de serviço registradas no sistema com informações completas e organizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Ordens de Serviço
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
      A tabela apresenta o veículo, o tipo de manutenção (interna ou externa), a situação, as datas programadas e os valores envolvidos.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações da Ordem de Serviço ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada ordem de serviço registrada.
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
    viewOptionsStep(),
  ],
  "/dashboard/supplier": [
    {
      title: "Rede de Fornecedores 🏭",
      content: `Nesta página você gerencia todos os fornecedores de peças, serviços e insumos para sua frota de forma estratégica.
      Mantenha um cadastro completo e atualizado para facilitar processos de compras, cotações e contratações de serviços especializados.`,
      placement: "center",
    },
    statsStep(),
    revalidateStep(),
    {
      anchor: "create-button",
      title: "Cadastrar Novo Fornecedor 🆕",
      content: `Para adicionar um novo fornecedor ao sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Fornecedores
      IMPORTANTE: Caso não possua esta permissão, será necessário solicitá-la ao administrador.
      Informe dados completos como nome/razão social, CNPJ, contatos atualizados, endereço completo, etc.`,
      placement: "bottom",
    },
    {
      anchor: "table-search",
      title: "Buscar Fornecedores 🔍",
      content: `Encontre rapidamente fornecedores específicos digitando o CNPJ, cidade de localização ou qualquer outra informação cadastrada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    filtersStep("supplier-filters", "Filtre por estado (UF) do fornecedor."),
    {
      anchor: "data-table",
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
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações do Fornecedor ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada fornecedor cadastrado.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Fornecedores
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador do sistema.
      ATENÇÃO: A exclusão só é possível se o fornecedor não estiver vinculado a peças cadastradas ou ordens de serviço no sistema.`,
      placement: "bottom",
    },
    viewOptionsStep(),
  ],
  "/dashboard/user-registration": [
    {
      title: "Central de Usuários 👤",
      content: `Aqui você gerencia todos os usuários que têm acesso ao sistema de forma centralizada e segura.
      Controle precisamente quem pode acessar a plataforma e quais funcionalidades cada usuário pode utilizar. Esta é uma área extremamente sensível do sistema!`,
      placement: "center",
    },
    statsStep(),
    revalidateStep(),
    {
      anchor: "create-button",
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
      anchor: "table-search",
      title: "Buscar Usuários 🔍",
      content: `Encontre rapidamente usuários específicos digitando nome completo, email ou perfil de acesso atribuído.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    filtersStep(
      "user-filters",
      "Filtre por acesso, verificação em duas etapas (2FA), nível de acesso e perfil de acesso.",
    ),
    {
      anchor: "data-table",
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
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações do Usuário ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada usuário cadastrado.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Cadastros de Usuários
      • LEITURA em Gerenciar Perfis de Acesso (para alterar perfis)
      • LEITURA em Gerenciar Motoristas
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      A edição permite atualizar dados pessoais e alterar níveis de acesso e perfis atribuídos ao usuário.`,
      placement: "bottom",
    },
    viewOptionsStep(),
  ],
  "/dashboard/vehicle-type": [
    {
      title: "Categorias de Veículos 🚚",
      content: `Nesta página você configura os diferentes tipos de veículos da sua frota de forma organizada e estratégica.
      Esta classificação é fundamental para organizar veículos por categoria e realizar análises segmentadas de dados (custos operacionais, consumo de combustível, manutenções, etc.).`,
      placement: "center",
    },
    {
      anchor: "create-button",
      title: "Adicionar Tipo de Veículo 🆕",
      content: `Para cadastrar um novo tipo de veículo no sistema, clique neste botão.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Tipos de Veículos
      IMPORTANTE: Caso não possua esta permissão, será necessário solicitá-la ao administrador.
      Informe a descrição específica do tipo, como 'Caminhão Baú', 'Van Utilitária', etc. Seja específico e descritivo para facilitar análises futuras e relatórios segmentados.`,
      placement: "bottom",
    },
    {
      anchor: "table-search",
      title: "Busca Rápida 🔍",
      content: `Digite para filtrar os tipos de veículos cadastrados no sistema de forma instantânea.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    {
      anchor: "data-table",
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
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações do Tipo de Veículo ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada tipo de veículo cadastrado.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Tipos de Veículos
      IMPORTANTE: Caso ainda não possua essas permissões, solicite ao administrador.
      ATENÇÃO: A exclusão só é possível se não houver veículos cadastrados utilizando este tipo específico no sistema.`,
      placement: "bottom",
    },
    revalidateStep(),
    viewOptionsStep(),
  ],
  "/dashboard/vehicle": [
    {
      title: "Central da Frota 🚗",
      content: `Esta é a página central para gerenciar todos os veículos da sua frota de forma completa e organizada.
      Controle informações detalhadas, histórico de manutenções, status operacional e documentação completa de cada veículo para manter sua frota sempre operacional.`,
      placement: "center",
    },
    statsStep(),
    {
      anchor: "export-button",
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
    revalidateStep(),
    {
      anchor: "create-button",
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
      anchor: "table-search",
      title: "Buscar Veículos 🔍",
      content: `Encontre rapidamente veículos específicos digitando placa, modelo, ou qualquer outra informação cadastrada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    filtersStep("vehicle-filters", "Filtre por status e filial do veículo."),
    {
      anchor: "data-table",
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
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações do Veículo ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada veículo cadastrado.
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
    viewOptionsStep(),
  ],
  "/dashboard/account-payable": [
    {
      title: "Contas a Pagar 💰",
      content: `Aqui você registra e acompanha as despesas da empresa: quem recebe, quanto, quando vence e quanto já foi pago.
      Cada conta pode apontar o veículo que gerou o custo (centro de custo) e a ordem de serviço de origem.
      NOTA: A situação Vencida é calculada pelo servidor no dia da empresa (no fuso dela), não pelo relógio do seu computador.`,
      placement: "center",
    },
    statsStep(),
    exportStep("Contas a Pagar", "Gerenciar Contas a Pagar", [
      "Favorecido, descrição e nº do documento",
      "Valor, valor pago e valor restante",
      "Vencimento, pagamento e situação",
      "Filial, veículo, responsável e quem registrou",
    ]),
    revalidateStep(),
    {
      anchor: "create-button",
      title: "Registrar Nova Conta 🆕",
      content: `Abre o formulário da conta.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Contas a Pagar
      Campos obrigatórios: Filial, Responsável, Categoria, Data de vencimento e Valor total.
      Opcionais: favorecido (um fornecedor cadastrado ou um nome digitado), veículo, ordem de serviço, nº do documento, descrição, data de pagamento e valor pago.
      DICA: Um motorista pode ser o responsável; ele passa a ver a conta na área dele.`,
      placement: "bottom",
    },
    {
      anchor: "table-search",
      title: "Buscar Contas 🔍",
      content: `Procura em toda a lista por favorecido, fornecedor, descrição, documento, placa, filial, responsável, valor ou ID.`,
      placement: "bottom",
    },
    filtersStep(
      "account-payable-filters",
      "Filtre por situação (Pendente, Parcial, Vencida, Paga…) e por categoria.",
    ),
    {
      anchor: "data-table",
      title: "Painel Financeiro 📋",
      content: `Todas as contas, com favorecido, valor, valor pago e restante, vencimento, pagamento, situação, filial, veículo e quem registrou.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Contas a Pagar
      DICA: Use Colunas Visíveis para esconder o que não faz parte da sua rotina.`,
      placement: "top",
      spotlightPadding: 6,
    },
    {
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações da Conta ⚙️",
      content: `O menu de três pontos (⋮) de cada conta tem Editar Conta a Pagar (inclusive para registrar o pagamento), Copiar ID, Copiar ID da ordem de serviço (quando houver) e Excluir.
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Contas a Pagar
      NOTA: Sem a permissão de escrita os itens aparecem desabilitados, com o motivo ao passar o mouse.`,
      placement: "left",
    },
    viewOptionsStep(),
  ],
  "/dashboard/fuel": [
    {
      title: "Controle de Abastecimento ⛽",
      content: `Esta é sua central de controle completo de abastecimentos da frota.
      Registre e monitore todos os abastecimentos realizados, controle custos com combustível e acompanhe o consumo de cada veículo para otimizar a gestão operacional.`,
      placement: "center",
    },
    statsStep(),
    {
      anchor: "export-button",
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
    revalidateStep(),
    {
      anchor: "create-button",
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
      anchor: "table-search",
      title: "Buscar Abastecimentos 🔍",
      content: `Encontre rapidamente registros específicos digitando placa do veículo, ou qualquer outra informação relacionada.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    filtersStep(
      "fuel-filters",
      "Filtre por filial, veículo e combustível do abastecimento.",
    ),
    {
      anchor: "data-table",
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
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações do Abastecimento ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada registro de abastecimento.
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
    viewOptionsStep(),
  ],
  "/dashboard/vehicle-checklist": [
    {
      title: "Central de Checklist Veicular 📋",
      content: `Nesta página você gerencia todos os checklists veiculares realizados para sua frota de forma completa e organizada.
      Registre inspeções veiculares detalhadas, monitore a condição dos veículos e mantenha histórico completo de verificações de segurança e conformidade.`,
      placement: "center",
    },
    statsStep(),
    {
      anchor: "export-button",
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
    revalidateStep(),
    {
      anchor: "create-button",
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
      anchor: "table-search",
      title: "Buscar Checklists 🔍",
      content: `Encontre rapidamente checklists específicos digitando placa do veículo, nome do motorista, filial ou qualquer outra informação relacionada ao checklist realizado.
      NOTA: Esta funcionalidade não requer permissões especiais e está sempre disponível.`,
      placement: "bottom",
    },
    filtersStep(
      "checklist-filters",
      "Filtre por condição geral, veículo e filial do checklist.",
    ),
    {
      anchor: "data-table",
      title: "Painel de Checklists Veiculares 📋",
      content: `Visualize todos os checklists veiculares registrados no sistema com informações completas e organizadas.
      PERMISSÕES NECESSÁRIAS:
      • LEITURA em Gerenciar Checklist dos Veículos
      IMPORTANTE: Caso ainda não possua esta permissão, solicite ao administrador.
      A tabela apresenta informações essenciais como veículo inspecionado, motorista responsável, data do checklist, quilometragem registrada, condição geral do veículo e status da inspeção.
      DICA: A coluna de condição geral mostra Aprovado, Aprovado com restrições ou Reprovado; o filtro Condição geral isola cada uma.`,
      placement: "left",
      spotlightPadding: 20,
    },
    {
      anchor: "row-actions",
      variants: tableActionVariants(),
      title: "Ações do Checklist ⚙️",
      content: `Nesta coluna aparecem os botões de ação (três pontos ⋮) para gerenciar cada checklist veicular registrado.
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
    viewOptionsStep(),
  ],
};

export { fleetTours };
