/**
 * Helper for correct pluralization in Portuguese
 */
const pluralize = (count: number, singular: string, plural: string): string => {
  return count === 1 ? singular : plural;
};

/**
 * Mapping priorities for search detection
 */
const PRIORITY_KEYWORDS = ["baixa", "média", "media", "alta", "urgente"];

/**
 * Specific formatting for Kanban results
 */
const formatKanbanResults = (count: number, searchQuery?: string): string => {
  if (!searchQuery) {
    // No search - show grand total
    return `Total de ${count} ${pluralize(count, "coluna", "colunas")}`;
  }

  // With search - more contextual message
  if (count === 0) {
    return "Nenhum resultado encontrado";
  }

  const normalizedQuery = searchQuery.toLowerCase().trim();

  // Detect if it is search by username/email (contains @)
  if (searchQuery.includes("@")) {
    return `${count} ${pluralize(count, "resultado encontrado", "resultados encontrados")} para o usuário`;
  }

  // Detect if it is search by priority
  const isPrioritySearch = PRIORITY_KEYWORDS.some((keyword) =>
    normalizedQuery.includes(keyword.toLowerCase()),
  );

  if (isPrioritySearch) {
    // Map priorities to show in Portuguese in the message
    const priorityMap: Record<string, string> = {
      baixa: "prioridade baixa",
      média: "prioridade média",
      media: "prioridade média",
      alta: "prioridade alta",
      urgente: "prioridade urgente",
    };

    const matchedPriority = PRIORITY_KEYWORDS.find((keyword) =>
      normalizedQuery.includes(keyword.toLowerCase()),
    );

    const priorityText = matchedPriority
      ? priorityMap[matchedPriority] || `"${searchQuery}"`
      : `"${searchQuery}"`;

    return `${count} ${pluralize(count, "card encontrado", "cards encontrados")} com ${priorityText}`;
  }

  // Detect if it can be search by other status/keywords
  const statusKeywords = [
    "concluído",
    "pendente",
    "em andamento",
    "finalizado",
  ];

  const isStatusSearch = statusKeywords.some((keyword) =>
    normalizedQuery.includes(keyword.toLowerCase()),
  );

  if (isStatusSearch) {
    return `${count} ${pluralize(count, "item encontrado", "itens encontrados")} para "${searchQuery}"`;
  }

  // General case - can be search by card title, column, etc.
  return `${count} ${pluralize(count, "resultado encontrado", "resultados encontrados")}`;
};

export { formatKanbanResults };
