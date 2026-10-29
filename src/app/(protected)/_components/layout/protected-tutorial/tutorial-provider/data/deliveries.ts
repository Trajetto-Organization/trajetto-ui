import type { TutorialConfig, TutorialStep } from "../tutorial-provider.types";

import {
  exportStep,
  filtersStep,
  revalidateStep,
  rowActionsStep,
  searchStep,
  statsStep,
  tableStep,
  viewOptionsStep,
  welcomeStep,
} from "./factories";

/**
 * Tours of Entregas: one per tab (DELIVERY_TABS), each with its own "seen"
 * flag. Key "/dashboard/deliveries" is the Entregas tab; the others are
 * "/dashboard/deliveries/<tab>" (see engine/tutorial-key). The operation's
 * sections moved to the Torre de controle on 14/10/2026, and their tours
 * with them (features/control-tower/tutorial).
 */

const tabsStep = (): TutorialStep => ({
  anchor: "deliveries-tabs",
  title: "Seções de Entregas 📑",
  content: `Entregas reúne o que é cadastrado ou importado:
  • Entregas, Embarcadores e Importações: o que entra na operação
  • Tipos de Ocorrência, Motivos de Status e Mensagens ao Cliente: a configuração
  NOTA: Monitoramento, Ocorrências, Atendimentos e Auditoria de Comprovantes ficam na Torre de Controle, como visões da operação. Os links antigos levam direto para lá.
  DICA: A seção fica na URL, então um link compartilhado reabre a mesma tela. Você só vê as seções que o seu perfil pode ler.`,
  placement: "bottom",
});

const deliveriesTab: TutorialStep[] = [
  welcomeStep(
    "Módulo de Entregas 📦",
    `A central de distribuição: aqui você cadastra as entregas, coloca cada uma numa rota e acompanha até a porta do destinatário.
    Uma entrega nasce de três formas: cadastrada à mão, importada do XML da NF-e ou de uma planilha.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas
    IMPORTANTE: O módulo Entregas precisa estar contratado pela empresa; sem ele a página não abre para ninguém.`,
  ),
  tabsStep(),
  statsStep(),
  exportStep("Entregas", "Gerenciar Entregas", [
    "Destinatário, endereço e embarcador",
    "Status, rota e motorista",
    "Data prevista e chave da NF-e",
  ]),
  revalidateStep(
    "Atualizar",
    "Útil aqui: motoristas e outros operadores mudam status o dia inteiro.",
  ),
  {
    anchor: "import-xml-button",
    title: "Importar 📄",
    content: `O menu Importar tem duas portas para a mesma sala:
    • Planilha (.xlsx ou .csv): muitas entregas de uma vez, com relatório linha a linha
    • XML da NF-e: destinatário, endereço, número e chave da nota e itens lidos do arquivo
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Entregas
    IMPORTANTE: A chave da NF-e impede duplicidade; a mesma nota importada duas vezes é recusada. Toda importação aparece na seção Importações e pode ser estornada.`,
    placement: "bottom",
    optional: true,
  },
  {
    anchor: "create-button",
    title: "Nova Entrega 🆕",
    content: `Cadastra uma entrega sem arquivo.
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Entregas
    Obrigatórios: Tipo (Entrega ou Ordem de serviço), Embarcador, Destinatário e endereço (o CEP preenche cidade, bairro e rua).
    NOTA: Ordem de serviço é uma parada para executar um serviço no endereço, como recolher cestos retornáveis. Segue a mesma rota, o mesmo motorista e o mesmo comprovante.
    Opcionais: telefone e e-mail do destinatário, código do pedido, chave da NF-e, data prevista, itens e observações.
    NOTA: A chave da NF-e é definida uma vez: editável enquanto vazia, fixa depois.`,
    placement: "bottom",
    optional: true,
  },
  {
    anchor: "deliveries-period",
    title: "Período 📅",
    content: `A lista abre em Hoje. Troque para 7, 14 ou 30 dias, ou escolha um período personalizado de até 92 dias.
    Os cartões, a paginação e a exportação seguem o período escolhido.
    NOTA: O período fica na URL e vale pela data de criação da entrega, no fuso da empresa.`,
    placement: "bottom",
  },
  searchStep(
    "Buscar Entregas 🔍",
    `Encontre uma entrega pelo ID, destinatário, pedido, NF-e, cidade, motorista ou CNH.
    DICA: A busca procura no período escolhido; o ID, o pedido, a chave ou o número da NF-e exatos procuram em todas as datas.`,
    "deliveries-search",
  ),
  filtersStep(
    "deliveries-filters",
    `Os filtros respondem às perguntas do dia:
    • Status: pendente, em rota, entregue, insucesso ou cancelada
    • Embarcador: a carga de um remetente
    • Motorista: a carga de um condutor
    • Tipo: entrega, ordem de serviço ou coleta`,
  ),
  tableStep(
    "Tabela de Entregas 📋",
    `Cada linha traz destinatário, embarcador, destino, status, rota e data prevista (só a data, sem horário). Uma ordem de serviço ou uma coleta tem o tipo marcado no código.
    O status segue um caminho definido:
    • Pendente → Em rota (só com rota iniciada pelo motorista) ou Cancelada
    • Em rota → Entregue, Insucesso, de volta a Pendente, ou Cancelada
    • Insucesso → Pendente (nova tentativa) ou Cancelada
    IMPORTANTE: Mudança manual de status exige um motivo, e marcar Entregue pelo painel exige informar quem recebeu.`,
  ),
  {
    anchor: "deliveries-select-all",
    title: "Adicionar à Rota 🚚",
    content: `Marque as entregas e a barra flutuante oferece Adicionar à rota.
    Escolha uma rota em planejamento ou liberada, ou planeje uma nova. Entregas que já estão em outra rota que ainda não saiu são movidas.
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Entregas
    IMPORTANTE: A rota é a unidade de atribuição: motorista e veículo pertencem à rota, e ela só chega ao motorista quando você a libera na página dela.`,
    placement: "right",
    optional: true,
  },
  rowActionsStep(
    "Ações da Entrega ⚙️",
    `O menu de três pontos (⋮) de cada entrega tem:
    • Ver detalhes: histórico, itens, ocorrências, comprovante e mensagens da entrega
    • Editar entrega e Copiar ID
    • Cancelar entrega: o fim do ciclo (entregas não são excluídas, para preservar a trilha de auditoria)
    NOTA: Ações que o seu perfil não pode usar aparecem desabilitadas, com o motivo ao passar o mouse.`,
  ),
  viewOptionsStep(),
];

const shippersTab: TutorialStep[] = [
  welcomeStep(
    "Embarcadores 🏭",
    `O embarcador é quem envia a carga: a sua própria empresa, um cliente que contrata o transporte ou um parceiro.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas
    NOTA: Embarcadores usam a mesma permissão das entregas.`,
  ),
  tabsStep(),
  statsStep(),
  revalidateStep(),
  {
    anchor: "create-button",
    title: "Novo Embarcador 🆕",
    content: `Cadastra quem envia a carga: nome, CNPJ, contato e endereço (o CEP preenche cidade, bairro e rua).
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Entregas
    IMPORTANTE: O CNPJ é validado e único na empresa, e um embarcador inativo não pode receber entregas novas (nem por XML ou planilha).`,
    placement: "bottom",
    optional: true,
  },
  searchStep(
    "Buscar Embarcadores 🔍",
    "Digite nome, CNPJ ou e-mail.",
    "deliveries-search",
  ),
  filtersStep(
    "deliveries-filters",
    `Separe os ativos dos inativos. Inativar preserva o histórico: as entregas antigas continuam ligadas ao embarcador.`,
  ),
  tableStep(
    "Tabela de Embarcadores 📋",
    "ID, CNPJ, nome, contato, cidade e as datas de criação e atualização.",
  ),
  rowActionsStep(
    "Ações do Embarcador ⚙️",
    `Editar Embarcador, Copiar ID e Deletar.
    IMPORTANTE: Um embarcador com entregas vinculadas não pode ser excluído; o sistema informa quantas dependem dele. Inative-o em vez de excluir.`,
  ),
  viewOptionsStep(),
];

const occurrenceTypesTab: TutorialStep[] = [
  welcomeStep(
    "Tipos de Ocorrência ⚠️",
    `O vocabulário da operação, em três categorias:
    • Entrega: a comprovação (ex.: "Entrega normal")
    • Não entrega: destinatário ausente, endereço não localizado, recusa…
    • Pausa: almoço, lanche, descanso…, cada uma ligada à natureza legal que alimenta os alertas da Lei 13.103
    Tudo o que a entrega exige é configurado por tipo: foto, foto do canhoto, assinatura na tela, formulário e autorização da torre.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Ocorrências`,
  ),
  tabsStep(),
  statsStep(),
  revalidateStep(),
  {
    anchor: "create-button",
    title: "Novo Tipo 🆕",
    content: `Abre o formulário do tipo: Nome do tipo, Chave, Categoria e, conforme a categoria, as exigências (foto do canhoto, assinatura na tela, autorização da torre, ocorrência impeditiva) e o formulário com perguntas ao motorista.
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Ocorrências
    NOTA: O aplicativo exige o preenchimento do formulário antes de enviar, inclusive sem internet, e a API guarda as respostas com a versão da definição.`,
    placement: "bottom",
    optional: true,
  },
  searchStep(
    "Buscar Tipos 🔍",
    "Digite o nome ou a descrição do tipo.",
    "deliveries-search",
  ),
  filtersStep(
    "deliveries-filters",
    "Filtre por categoria, status, se é impeditiva e se exige foto.",
  ),
  tableStep(
    "Catálogo de Tipos 📋",
    "Nome, categoria, exigências, formulário, autorização, status e datas de cada tipo.",
  ),
  rowActionsStep(
    "Ações do Tipo ⚙️",
    `Editar Tipo, Copiar ID e Deletar.
    IMPORTANTE: Um tipo já usado em ocorrências não pode ser excluído. Inative-o: ele sai da lista do motorista e o histórico continua legível.`,
  ),
  viewOptionsStep(),
];

const statusReasonsTab: TutorialStep[] = [
  welcomeStep(
    "Motivos de Status 🏷️",
    `Toda mudança manual de status de uma entrega pelo painel exige um motivo. Aqui você cadastra a lista que aparece nessa hora, para que a operação fale a mesma língua.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas`,
  ),
  tabsStep(),
  statsStep(),
  revalidateStep(),
  {
    anchor: "create-button",
    title: "Novo Motivo 🆕",
    content: `Cadastra um motivo para mudanças manuais de status.
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Entregas`,
    placement: "bottom",
    optional: true,
  },
  searchStep(
    "Buscar Motivos 🔍",
    "Digite o nome ou a descrição do motivo.",
    "deliveries-search",
  ),
  filtersStep("deliveries-filters", "Separe os motivos ativos dos inativos."),
  tableStep(
    "Motivos Cadastrados 📋",
    "Cada motivo com status e datas de criação e atualização.",
  ),
  rowActionsStep("Ações do Motivo ⚙️", "Editar Motivo, Copiar ID e Deletar."),
  viewOptionsStep(),
];

const importsTab: TutorialStep[] = [
  welcomeStep(
    "Importações 📥",
    `Cada importação de planilha ou XML vira uma linha aqui, com quantas entregas entraram, quantas eram duplicadas e quantas tinham erro.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas`,
  ),
  tabsStep(),
  statsStep(),
  revalidateStep(),
  filtersStep(
    "deliveries-filters",
    "Filtre por status da importação e por origem (planilha ou XML).",
  ),
  tableStep(
    "Histórico de Importações 📋",
    "Arquivo, origem, status, quantas foram importadas, duplicadas e com erro, quando foi enviada e, se for o caso, quando foi estornada.",
  ),
  rowActionsStep(
    "Ações da Importação ⚙️",
    `Ver relatório (linha a linha, com o motivo de cada recusa), Copiar ID e Estornar.
    IMPORTANTE: Estornar remove as entregas daquela importação que ainda não andaram; as já anunciadas às integrações viram "cancelada" (delivery.cancelled).`,
  ),
  viewOptionsStep(),
];

const messageTemplatesTab: TutorialStep[] = [
  welcomeStep(
    "Mensagens ao Cliente ✉️",
    `Os textos que o destinatário recebe por WhatsApp ou e-mail em cada momento da entrega, como "Saiu para entrega" e "A caminho".
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas
    IMPORTANTE: Sem mensagem escrita, nada é enviado. O Trajetto não fala com os seus clientes por conta própria.`,
  ),
  tabsStep(),
  revalidateStep(),
  {
    anchor: "message-templates",
    title: "Momentos da Entrega 🗓️",
    content: `Cada cartão é um momento e um canal. O selo diz se a mensagem está Ativa, Desativada ou Não escrita.
    • Escrever / Editar: abre o texto com as variáveis disponíveis
    • "A caminho" só é enviado quando o motorista marca a parada como a caminho e existe um modelo ativo para ele
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Entregas para escrever e editar`,
    placement: "top",
  },
];

const deliveriesTours: TutorialConfig = {
  "/dashboard/deliveries": deliveriesTab,
  "/dashboard/deliveries/shippers": shippersTab,
  "/dashboard/deliveries/imports": importsTab,
  "/dashboard/deliveries/occurrence-types": occurrenceTypesTab,
  "/dashboard/deliveries/status-change-reasons": statusReasonsTab,
  "/dashboard/deliveries/message-templates": messageTemplatesTab,
};

export { deliveriesTours };
