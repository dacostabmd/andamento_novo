export const COR_STATUS = { concluida: '#5fc9a8', atrasada: '#e0796f', no_prazo: '#5b9bdb' };
export const STATUS_LABEL = { concluida: 'Concluída', atrasada: 'Atrasada', no_prazo: 'No prazo' };

// ── Limiares e formatação de indicadores ────────────────────────────────
//
// Centralizados aqui porque estavam divergentes entre telas: a mesma taxa de
// atraso virava vermelha a 30% no modal do colaborador e só a 50% no painel,
// então 45% de atraso aparecia verde numa tela e vermelho na outra. Um corte
// de cor é uma afirmação sobre o negócio ("isto é ruim") e não pode depender
// de qual tela o gestor abriu.
export const COR_BOA = '#5fc9a8';
export const COR_ALERTA = '#f5dd90';
export const COR_RUIM = '#e0796f';
export const COR_INDETERMINADA = 'rgba(236,230,216,0.35)';

// Adimplência e conclusão: quanto MAIOR, melhor.
export const LIMIAR_ADIMPLENCIA = { bom: 75, alerta: 50 };
export const LIMIAR_CONCLUSAO = { bom: 40, alerta: 20 };
// Atraso: quanto MENOR, melhor (a escala se inverte).
export const LIMIAR_ATRASO = { bom: 20, alerta: 40 };

// Abaixo deste n, uma taxa percentual não é comparável às demais: 1 tarefa
// adimplente vira "100%" e ficaria colorida igual a quem tem 400 tarefas e
// 92%. Nesses casos a UI mostra o valor em cor neutra e declara o tamanho da
// amostra, em vez de premiar o acaso.
export const N_MINIMO_TAXA = 5;

/** Taxa indeterminada (sem base de cálculo) vira "—", nunca 0% nem 100%. */
export function fmtPct(v, casas = 1) {
  return v === null || v === undefined || isNaN(v) ? '—' : v.toFixed(casas) + '%';
}

/**
 * Cor de uma taxa "maior é melhor". Passe `n` (tamanho da amostra) para que
 * taxas apoiadas em poucos casos saiam neutras em vez de verdes.
 */
export function corTaxa(v, limiar = LIMIAR_ADIMPLENCIA, n = null) {
  if (v === null || v === undefined || isNaN(v)) return COR_INDETERMINADA;
  if (n !== null && n < N_MINIMO_TAXA) return COR_INDETERMINADA;
  if (v >= limiar.bom) return COR_BOA;
  if (v >= limiar.alerta) return COR_ALERTA;
  return COR_RUIM;
}

/** Cor de uma taxa "menor é melhor" (atraso). */
export function corTaxaInversa(v, limiar = LIMIAR_ATRASO, n = null) {
  if (v === null || v === undefined || isNaN(v)) return COR_INDETERMINADA;
  if (n !== null && n < N_MINIMO_TAXA) return COR_INDETERMINADA;
  if (v <= limiar.bom) return COR_BOA;
  if (v <= limiar.alerta) return COR_ALERTA;
  return COR_RUIM;
}

/** true quando a amostra é pequena demais para a taxa ser comparável. */
export function amostraPequena(n) {
  return typeof n === 'number' && n > 0 && n < N_MINIMO_TAXA;
}

export const PERM_COLS = [
  { key: 'painel', label: 'Painel Geral' },
  { key: 'colaboradores', label: 'Colaboradores & Advogados' },
  { key: 'tarefas', label: 'Andamento Processual' },
  { key: 'permissoes', label: 'Permissões' },
];

// Paleta fixa para os polos, indexada pela ordem em que o backend devolve
// `opcoes.polos` (GET /equipe-cobranca/mapa-polos) — o backend não manda cor.
const PALETA_POLO = ['#2f6fb0', '#a44fc0', '#158a6f', '#c96a12', '#d1685f', '#5b9bdb', '#8a6d3b', '#6a5acd', '#3b8a8a', '#b0562f'];

export function corDoPolo(codigo, polos) {
  const indice = polos.findIndex((p) => p.codigo === codigo);
  return PALETA_POLO[indice >= 0 ? indice % PALETA_POLO.length : 0];
}

export function iniciais(nome) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export function pillStyle(cor, active) {
  const base = { fontSize: '12px', fontWeight: 600, padding: '7px 14px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'inherit' };
  if (!cor) {
    return active
      ? { ...base, background: '#846419', color: '#f5eec9', border: '1px solid #846419', fontWeight: 700 }
      : { ...base, background: 'transparent', color: 'rgba(236,230,216,0.65)', border: '1px solid rgba(199,199,199,0.3)' };
  }
  return active
    ? { ...base, background: cor, color: '#ffffff', border: '1px solid ' + cor, fontWeight: 700 }
    : { ...base, background: cor + '1c', color: cor, border: '1px solid ' + cor + '40' };
}

export const BTN_PAG = { background: 'transparent', border: '1px solid rgba(199,199,199,0.3)', color: 'rgba(236,230,216,0.7)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
export const BTN_PAG_OFF = { ...BTN_PAG, opacity: 0.35, cursor: 'not-allowed' };
