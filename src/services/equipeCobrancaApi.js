/**
 * Client HTTP para o módulo de Equipe de Cobrança contra o worker Node real
 * (mesmo backend/worker que o dashboard de produção usa — ver
 * VITE_SYNC_API_URL/VITE_API_TOKEN no README do backend, "Conectando o
 * Frontend"). Substitui data.js/localStorage como fonte de verdade.
 *
 * Todas as funções devolvem um valor "vazio" seguro (array vazio, null) em
 * qualquer falha (API_URL não configurada, worker fora do ar, token
 * inválido, erro de rede) — este protótipo não tem tela de erro, então uma
 * lista vazia é preferível a quebrar a UI.
 */

const API_URL = import.meta.env.VITE_SYNC_API_URL || ''
const API_TOKEN = import.meta.env.VITE_API_TOKEN || ''

function headers(extra) {
  return { ...(API_TOKEN ? { 'X-API-Token': API_TOKEN } : {}), ...extra }
}

async function chamar(caminho, init) {
  if (!API_URL) return null
  try {
    const resp = await fetch(`${API_URL}${caminho}`, {
      ...init,
      headers: headers({ 'Content-Type': 'application/json', ...(init?.headers || {}) }),
    })
    if (!resp.ok) return null
    return await resp.json()
  } catch {
    return null
  }
}

function paramsSolicitante(solicitante) {
  const params = new URLSearchParams()
  if (solicitante?.id != null) params.set('solicitanteId', String(solicitante.id))
  if (solicitante?.nome) params.set('solicitanteNome', solicitante.nome)
  return params
}

/** Usuários do Bitrix elegíveis para Cobrador/Advogado (autocomplete). */
export async function buscarUsuariosEquipeCobranca() {
  const dados = await chamar('/equipe-cobranca')
  return Array.isArray(dados?.opcoes?.usuarios) ? dados.opcoes.usuarios : []
}

/** Os 10 Polos de Cobrança reais (código, rótulo, UFs cobertas). */
export async function buscarMapaPolos() {
  const dados = await chamar('/equipe-cobranca/mapa-polos')
  return Array.isArray(dados?.opcoes?.polos) ? dados.opcoes.polos : []
}

/** Linhas de cobrador/advogado/polo/dígitos + polos + usuários, já filtrados por visibilidade do solicitante. */
export async function buscarEquipeCobranca(solicitante) {
  const params = paramsSolicitante(solicitante)
  const query = params.toString() ? `?${params.toString()}` : ''
  const dados = await chamar(`/equipe-cobranca${query}`)
  return {
    equipes: Array.isArray(dados?.equipes) ? dados.equipes : [],
    polos: Array.isArray(dados?.opcoes?.polos) ? dados.opcoes.polos : [],
    usuarios: Array.isArray(dados?.opcoes?.usuarios) ? dados.opcoes.usuarios : [],
    visibilidadeTotal: Boolean(dados?.visibilidadeTotal),
  }
}

/** Cria (sem id) ou edita (com id) uma linha de equipe de cobrança. */
export async function salvarLinhaEquipe(input, id) {
  const dados = await chamar(id ? `/equipe-cobranca/${id}` : '/equipe-cobranca', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(input),
  })
  return dados?.equipe ?? null
}

/**
 * Autoedição do PRÓPRIO polo ("UF de atuação"), pela aba Configurações — não
 * passa pelo CRUD completo (Colaboradores), restrito aos 4 admins. Só troca
 * `polo`; o backend confere que quem chama é dono da linha (colaboradorId ou
 * advogadoId bate com o solicitante) ou um dos admins.
 */
export async function alterarPoloProprio(id, polo, solicitante) {
  const dados = await chamar(`/equipe-cobranca/${id}/polo`, {
    method: 'PUT',
    body: JSON.stringify({ polo, solicitanteId: solicitante?.id ?? null, solicitanteNome: solicitante?.nome ?? null }),
  })
  return dados?.equipe ?? null
}

export async function excluirLinhaEquipe(id, solicitante) {
  const params = paramsSolicitante(solicitante)
  const query = params.toString() ? `?${params.toString()}` : ''
  const dados = await chamar(`/equipe-cobranca/${id}${query}`, { method: 'DELETE' })
  return Boolean(dados?.success)
}

/** Telas liberadas para o solicitante (painel/colaboradores/tarefas/permissoes) + visibilidadeTotal. */
export async function buscarPermissoesEfetivas(solicitante) {
  const dados = await chamar('/equipe-cobranca/permissoes/efetivas', {
    method: 'POST',
    body: JSON.stringify({ solicitanteId: solicitante?.id ?? null, solicitanteNome: solicitante?.nome ?? null }),
  })
  return dados ?? { podeVer: null, visibilidadeTotal: false }
}

export async function salvarPermissao(usuarioId, payload, solicitante) {
  const params = paramsSolicitante(solicitante)
  const query = params.toString() ? `?${params.toString()}` : ''
  const dados = await chamar(`/equipe-cobranca/permissoes/${usuarioId}${query}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return dados?.permissao ?? null
}

export async function excluirPermissao(usuarioId, solicitante) {
  const params = paramsSolicitante(solicitante)
  const query = params.toString() ? `?${params.toString()}` : ''
  const dados = await chamar(`/equipe-cobranca/permissoes/${usuarioId}${query}`, { method: 'DELETE' })
  return Boolean(dados?.success)
}

/**
 * Tarefas reais já roteadas por polo/dígito de CPF.
 *
 * `escopoEquipeCobranca` só entra quando sabemos QUEM está pedindo: o
 * /snapshot devolve lista VAZIA quando recebe o escopo sem `solicitanteId` e
 * sem visibilidade total (ver server.ts) — era o que zerava todas as métricas
 * do painel. Sem solicitante, pede o snapshot completo; o token de leitura já
 * é o que controla o acesso nesse caso.
 */
export async function buscarTarefasEquipeCobranca(solicitante) {
  const params = paramsSolicitante(solicitante)
  if (solicitante?.id != null) params.set('escopoEquipeCobranca', '1')
  params.set('full', 'true')
  const query = params.toString() ? `?${params.toString()}` : ''
  const dados = await chamar(`/snapshot${query}`)
  return Array.isArray(dados?.tarefas) ? dados.tarefas : []
}
