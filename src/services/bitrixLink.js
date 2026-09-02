/**
 * Fallback de link de tarefa no Bitrix, usado quando o backend não manda
 * `linkTarefa` pronto (ex.: campo ausente numa resposta compactada/antiga).
 * Espelha a mesma regra do backend (montarLinkTarefa em backend/src/config.ts):
 * tarefa de grupo de trabalho usa a rota de workgroup; sem grupo, cai na rota
 * pessoal do responsável. Sem nenhum dos dois IDs, não há link confiável.
 */
const DOMINIO_PORTAL_BITRIX = 'bitrix.dapadvocacia.com.br';

export function montarLinkTarefaBitrix(tarefa) {
  if (!tarefa) return null;
  if (tarefa.linkTarefa) return tarefa.linkTarefa;

  const { id, projetoId, responsavelId } = tarefa;
  if (!id) return null;
  if (projetoId) return `https://${DOMINIO_PORTAL_BITRIX}/workgroups/group/${projetoId}/tasks/task/view/${id}/`;
  if (responsavelId) return `https://${DOMINIO_PORTAL_BITRIX}/company/personal/user/${responsavelId}/tasks/task/view/${id}/`;
  return null;
}

/**
 * Caminho relativo (sem domínio) do mesmo link, para uso com BX24.openPath —
 * a API do SDK do Bitrix que navega a aba real do portal a partir de dentro
 * do iframe do app. Passar URL absoluta pra ela não funciona.
 */
export function montarCaminhoTarefaBitrix(tarefa) {
  const link = montarLinkTarefaBitrix(tarefa);
  if (!link) return null;
  try {
    return new URL(link).pathname;
  } catch {
    return null;
  }
}
