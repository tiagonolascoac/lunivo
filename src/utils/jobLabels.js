export const jobStatusLabels = {
  draft: "Rascunho",
  awaiting_selection: "Aguardando seleção",
  selection_received: "Seleção recebida",
  editing: "Em edição",
  ready: "Pronto para entrega",
  delivered: "Entregue",
  archived: "Arquivado",
};

export const selectionStatusLabels = {
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  completed: "Finalizada",
};

export const eventTypeLabels = {
  ensaio: "Ensaio",
  casamento: "Casamento",
  formatura: "Formatura",
  familia: "Família",
  corporativo: "Corporativo",
  outro: "Outro",
};

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function getJobStatusLabel(status) {
  const key = normalizeValue(status);
  return jobStatusLabels[key] || status;
}

export function getSelectionStatusLabel(status) {
  const key = normalizeValue(status);
  return selectionStatusLabels[key] || status;
}

export function getEventTypeLabel(type) {
  const key = normalizeValue(type);
  return eventTypeLabels[key] || type;
}