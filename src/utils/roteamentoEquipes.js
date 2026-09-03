import { MOCK_REGRAS } from '../mockData.js';

/**
 * Mapeamento oficial das 27 UFs do Brasil para os 10 Polos Regionais de Cobrança.
 */
export const UF_PARA_POLO = {
  // 1. RJ
  RJ: 'RJ',

  // 2. SP
  SP: 'SP',

  // 3. DF, PA, MS
  DF: 'DF_PA_MS',
  PA: 'DF_PA_MS',
  MS: 'DF_PA_MS',

  // 4. MG e AM
  MG: 'MG_AM',
  AM: 'MG_AM',

  // 5. Bahia
  BA: 'BA',

  // 6. GO, RS, MT
  GO: 'GO_RS_MT',
  RS: 'GO_RS_MT',
  MT: 'GO_RS_MT',

  // 7. PR, RR
  PR: 'PR_RR',
  RR: 'PR_RR',

  // 8. AC, AL, AP, PI, RO, SC, SE, TO
  AC: 'AC_AL_AP_PI_RO_SC_SE_TO',
  AL: 'AC_AL_AP_PI_RO_SC_SE_TO',
  AP: 'AC_AL_AP_PI_RO_SC_SE_TO',
  PI: 'AC_AL_AP_PI_RO_SC_SE_TO',
  RO: 'AC_AL_AP_PI_RO_SC_SE_TO',
  SC: 'AC_AL_AP_PI_RO_SC_SE_TO',
  SE: 'AC_AL_AP_PI_RO_SC_SE_TO',
  TO: 'AC_AL_AP_PI_RO_SC_SE_TO',

  // 9. MA, ES, PE
  MA: 'MA_ES_PE',
  ES: 'MA_ES_PE',
  PE: 'MA_ES_PE',

  // 10. RN, PB, CE
  RN: 'RN_PB_CE',
  PB: 'RN_PB_CE',
  CE: 'RN_PB_CE',
};

/**
 * Mapeamento dos 27 departamentos de estado do Bitrix24 (IDs 1431 a 1457)
 * para a respectiva sigla de UF.
 */
export const DEPT_PARA_UF = {
  1431: 'AC', 1432: 'AL', 1433: 'AP', 1434: 'AM', 1435: 'BA',
  1436: 'CE', 1437: 'DF', 1438: 'ES', 1439: 'GO', 1440: 'MA',
  1441: 'MT', 1442: 'MS', 1443: 'MG', 1444: 'PA', 1445: 'PB',
  1446: 'PR', 1447: 'PE', 1448: 'PI', 1449: 'RJ', 1450: 'RN',
  1451: 'RS', 1452: 'RO', 1453: 'RR', 1454: 'SC', 1455: 'SP',
  1456: 'SE', 1457: 'TO',
};

/**
 * Mapeamento de nomes de estados por extenso para siglas de UF.
 */
export const NOMES_ESTADOS_PARA_UF = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', 'amapá': 'AP', amazonas: 'AM',
  bahia: 'BA', ceara: 'CE', 'ceará': 'CE', 'distrito federal': 'DF',
  'espirito santo': 'ES', 'espírito santo': 'ES', goias: 'GO', 'goiás': 'GO',
  maranhao: 'MA', 'maranhão': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', para: 'PA', 'pará': 'PA', paraiba: 'PB', 'paraíba': 'PB',
  parana: 'PR', 'paraná': 'PR', pernambuco: 'PE', piaui: 'PI', 'piauí': 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS',
  rondonia: 'RO', 'rondônia': 'RO', roraima: 'RR', 'santa catarina': 'SC',
  'sao paulo': 'SP', 'são paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
};

/**
 * Extrai a sigla da UF (estado) onde o card se situa a partir de todos os metadados.
 */
export function extrairEstadoUf(tarefa) {
  if (!tarefa) return null;

  // 1. Campos diretos de UF no card
  const camposDiretos = [
    tarefa.estadoUf,
    tarefa.uf,
    tarefa.clienteEstado,
    tarefa.estado,
    tarefa.ufCliente,
  ];

  for (const c of camposDiretos) {
    if (typeof c === 'string' && c.trim().length >= 2) {
      const match = c.trim().match(/\b([A-Za-z]{2})\b/);
      if (match && UF_PARA_POLO[match[1].toUpperCase()]) {
        return match[1].toUpperCase();
      }
      const nomeLimpo = c.trim().toLowerCase();
      if (NOMES_ESTADOS_PARA_UF[nomeLimpo]) {
        return NOMES_ESTADOS_PARA_UF[nomeLimpo];
      }
    }
  }

  // 2. Departamentos de estado associados ao fechador ou responsável (IDs 1431 a 1457)
  const depts = [
    ...(Array.isArray(tarefa.fechadoPorDepartamentos) ? tarefa.fechadoPorDepartamentos : []),
    ...(Array.isArray(tarefa.responsavelDepartamentos) ? tarefa.responsavelDepartamentos : []),
  ];
  for (const did of depts) {
    const num = Number(did);
    if (DEPT_PARA_UF[num]) {
      return DEPT_PARA_UF[num];
    }
  }

  // 3. Nome do grupo/projeto da tarefa (ex.: "Andamento RJ", "Cobrança SP", etc.)
  if (typeof tarefa.projetoNome === 'string') {
    const matchProj = tarefa.projetoNome.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i);
    if (matchProj && UF_PARA_POLO[matchProj[1].toUpperCase()]) {
      return matchProj[1].toUpperCase();
    }
  }

  // 4. Texto livre do título ou nome do cliente (ex.: "Carlos Eduardo (SP)" ou "Cobrança - BA")
  //
  // Sigla em CAIXA ALTA apenas. O flag `i` de antes fazia palavras comuns do
  // português virarem UF: "verificar SE o cliente pagou" resolvia para SE
  // (Sergipe). Como o polo resultante era gravado normalmente, a tarefa ficava
  // indistinguível de um roteamento legítimo — contaminação silenciosa, que é
  // pior do que ficar sem polo (esta ao menos aparece em "Sem vínculo").
  const texto = `${tarefa.titulo || ''} ${tarefa.clienteNome || ''} ${tarefa.projetoNome || ''}`;
  const matchTexto = texto.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/);
  if (matchTexto && UF_PARA_POLO[matchTexto[1]]) {
    return matchTexto[1];
  }

  // 5. Nomes de estados por extenso no texto.
  //
  // Com fronteira de palavra, e sem a chave "para": é preposição corrente em
  // português ("enviar para o cliente") e, por `includes` cru, roteava boa
  // parte do backlog para o polo DF-PA-MS. "Pará" segue reconhecido pela forma
  // acentuada e pela sigla no nível 4.
  const textoMin = texto.toLowerCase();
  for (const [nomeExtenso, uf] of Object.entries(NOMES_ESTADOS_PARA_UF)) {
    if (nomeExtenso === 'para') continue;
    const limite = new RegExp(`(?:^|[^a-zà-ú])${nomeExtenso}(?:$|[^a-zà-ú])`, 'i');
    if (limite.test(textoMin)) {
      return uf;
    }
  }

  return null;
}

/**
 * Determina se a tarefa está no escalão de contingência de 48 horas.
 *
 * Espelha a regra canônica do backend (obterTarefasElegiveisEscalao48h, em
 * backend/src/db.ts): criada há mais de 48h E **nunca atendida**. Escalão é
 * contingência para card que ninguém tocou — não é medida de idade do backlog.
 *
 * A versão anterior caía em `atualizadoEm || primeiraAtividadeEm || criadoEm`
 * e ignorava `atendidoEm`. Como os dois primeiros campos não existem no
 * payload de tarefa, o `dataRef` era sempre `criadoEm` e a condição virava
 * "aberta há mais de 48h" — o que classificava praticamente todo o backlog
 * como escalão (77% da base no painel auditado) e, pior, tinha prioridade
 * sobre o dígito de CPF no roteamento abaixo, concentrando as tarefas na
 * linha de contingência em vez de distribuí-las entre os cobradores.
 */
export function ehTarefaEscalao48h(tarefa) {
  if (!tarefa) return false;

  // Estado persistido pelo backend: uma vez escalada, permanece escalada.
  if (Boolean(tarefa.emEscalao48h || tarefa.ehEscalao48h)) return true;

  if (tarefa.situacaoPrazo === 'concluida') return false;

  // Já atendida (comentário, arquivo ou saída de "aguardando execução") sai da
  // contingência, por mais antiga que seja.
  if (tarefa.atendidoEm) return false;

  if (!tarefa.criadoEm) return false;
  const criadaMs = new Date(tarefa.criadoEm).getTime();
  if (Number.isNaN(criadaMs) || criadaMs <= 0) return false;

  return (Date.now() - criadaMs) / (1000 * 60 * 60) >= 48;
}

/**
 * Extrai o dígito final do CPF do cliente (0 a 9).
 */
export function extrairDigitoFinalCpf(tarefa) {
  if (!tarefa) return null;

  if (tarefa.digitoCpfCliente !== null && tarefa.digitoCpfCliente !== undefined) {
    const d = Number(tarefa.digitoCpfCliente);
    if (!Number.isNaN(d) && d >= 0 && d <= 9) return d;
  }

  if (tarefa.cpfCliente) {
    const nums = String(tarefa.cpfCliente).replace(/\D/g, '');
    if (nums.length >= 1) {
      return parseInt(nums[nums.length - 1], 10);
    }
  }

  const texto = `${tarefa.titulo || ''} ${tarefa.clienteNome || ''}`;
  const matchCpf = texto.match(/\d{3}\.?\d{3}\.?\d{3}[-.]?(\d{2})/);
  if (matchCpf) {
    const dv = matchCpf[1];
    return parseInt(dv[dv.length - 1], 10);
  }

  return null;
}

/**
 * Cria índices em memória O(1) a partir da lista de regras do Anexo 2.
 */
export function criarIndiceRegras(regras = MOCK_REGRAS) {
  const porPoloEDigito = new Map();
  const porPolo48h = new Map();
  const poloPorCobrador = new Map();
  const poloPorAdvogado = new Map();

  for (const r of regras) {
    if (r.ehEscalao48h) {
      if (!porPolo48h.has(r.polo)) {
        porPolo48h.set(r.polo, r);
      }
    }
    if (Array.isArray(r.digitosCpf)) {
      for (const d of r.digitosCpf) {
        porPoloEDigito.set(`${r.polo}:${d}`, r);
      }
    }
    if (r.colaboradorNome) {
      poloPorCobrador.set(r.colaboradorNome.toLowerCase().trim(), r.polo);
    }
    if (r.advogado) {
      poloPorAdvogado.set(r.advogado.toLowerCase().trim(), r.polo);
    }
  }

  return {
    porPoloEDigito,
    porPolo48h,
    poloPorCobrador,
    poloPorAdvogado,
  };
}

/**
 * Sufixos operacionais comuns do Bitrix que identificam tipo de processo
 * mas não diferenciam o cliente.
 */
const RE_SUFIXOS_OPERACIONAIS =
  /\s*[-–—]?\s*(ANDAMENTO MENSAL|ANDAMENTO NEGOCIA[ÇC][ÃA]O|COBRAN[ÇC]A MENSAL|Pessoa F[íi]sica|Pessoa Jur[íi]dica|\(C[óo]pia\)|\(EXECUTADO\)|\(REU\)|\(R[ÉE]U\))\s*/gi;

/**
 * Remove prefixos estranhos comuns inseridos por operadores no Bitrix
 * (como aspas repetidas ''''''''', barras duplas //, pontos, asteriscos, etc.)
 */
export function limparNomeExibicao(texto) {
  if (!texto || typeof texto !== 'string') return texto || '';
  const limpo = texto
    .replace(/^['"`/\\.\-_*#~!?|:;\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return limpo || texto;
}

/**
 * Chave canônica para deduplicação — o TÍTULO da tarefa, não o nome do cliente.
 *
 * A versão anterior usava `clienteNome` e removia os sufixos operacionais, o
 * que fundia processos legitimamente distintos do mesmo cliente: "Fulano —
 * ANDAMENTO MENSAL", "Fulano — COBRANÇA MENSAL", "Fulano (EXECUTADO)" e
 * "Fulano (RÉU)" colapsavam num só registro. Num teste com 4 processos de um
 * mesmo cliente, 55% do faturamento e todas as conclusões desapareciam.
 *
 * Esses sufixos identificam o TIPO de processo (o próprio comentário de
 * RE_SUFIXOS_OPERACIONAIS diz isso) e a posição processual — executado e réu
 * são papéis distintos, com trabalho distinto. Só "(Cópia)" indica duplicata
 * de verdade, então só ele sai da chave.
 *
 * Alinha-se ao backend, que também deduplica por título
 * (deduplicarTarefasPorTitulo, em backend/src/triagem.ts).
 */
const RE_SUFIXO_COPIA = /\s*[-–—]?\s*\(C[óo]pia\)\s*/gi;

export function extrairChaveNomeDeduplicacao(tarefa) {
  if (!tarefa) return '';
  const base = tarefa.titulo || tarefa.clienteNome || '';
  return String(base)
    .replace(/^['"`/\\.\-_*#~!?|:;\s]+/, '')
    .replace(RE_SUFIXO_COPIA, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Normaliza uma tarefa com resolução O(1) de alta performance.
 */
export function normalizarTarefa(t, indice) {
  if (!t) return t;

  // 1. Resolve o polo
  let polo = t.poloCobranca;
  const uf = extrairEstadoUf(t);

  // Caso o polo não tenha nenhum vínculo, adiciona o vínculo do estado onde o card se situa
  if (!polo || polo === 'Sem vínculo') {
    if (uf && UF_PARA_POLO[uf]) {
      polo = UF_PARA_POLO[uf];
    } else {
      const cob = (
        t.equipeCobrancaColaboradorNome ||
        t.colaboradorNome ||
        t.responsavelNome ||
        ''
      ).toLowerCase().trim();
      const adv = (
        t.equipeCobrancaAdvogado ||
        t.advogado ||
        ''
      ).toLowerCase().trim();

      if (cob && indice.poloPorCobrador.has(cob)) {
        polo = indice.poloPorCobrador.get(cob);
      } else if (adv && indice.poloPorAdvogado.has(adv)) {
        polo = indice.poloPorAdvogado.get(adv);
      } else if (uf) {
        polo = uf;
      }
    }
  } else if (UF_PARA_POLO[polo]) {
    polo = UF_PARA_POLO[polo];
  }

  // 2. Resolve o dígito final do CPF e o Escalão 48 Horas
  const digito = extrairDigitoFinalCpf(t);
  const eh48h = ehTarefaEscalao48h(t);

  // 3. Resolve Cobrador e Advogado conforme o Anexo 2
  let cobrador = t.equipeCobrancaColaboradorNome;
  let advogado = t.equipeCobrancaAdvogado;

  if (polo) {
    let regra = null;
    if (eh48h) {
      regra = indice.porPolo48h.get(polo);
    } else if (digito !== null) {
      regra = indice.porPoloEDigito.get(`${polo}:${digito}`);
    }

    if (regra) {
      if (!cobrador || cobrador === '—') {
        cobrador = regra.colaboradorNome;
      }
      if (!advogado || advogado === 'Sem advogado') {
        advogado = regra.advogado || 'Sem advogado';
      }
    }
  }

  // 4. Higieniza nomes estranhos com prefixos de operadores (//, '''''', etc.)
  const nomeLimpo = limparNomeExibicao(t.clienteNome || t.titulo);
  const tituloLimpo = limparNomeExibicao(t.titulo);

  return {
    ...t,
    clienteNome: nomeLimpo,
    titulo: tituloLimpo,
    poloCobranca: polo || (uf ? UF_PARA_POLO[uf] || uf : null),
    estadoUf: uf || t.estadoUf || null,
    emEscalao48h: eh48h,
    ehEscalao48h: eh48h,
    digitoCpfCliente: digito !== null ? digito : t.digitoCpfCliente,
    equipeCobrancaColaboradorNome: cobrador || '—',
    equipeCobrancaAdvogado: advogado || 'Sem advogado',
  };
}

/**
 * Normaliza um lote inteiro de tarefas e aplica a regra de deduplicação:
 * "Tarefas com o mesmo nome só devem aparecer nas listas caso sejam de grupos de tarefas diferentes"
 */
export function normalizarTarefas(tarefas, regras = MOCK_REGRAS) {
  if (!Array.isArray(tarefas)) return [];
  const indice = criarIndiceRegras(regras);

  // Mapa para deduplicação: chave = grupoId::nomeCanonico
  const mapaPorGrupoENome = new Map();

  for (let i = 0; i < tarefas.length; i++) {
    const raw = tarefas[i];
    if (!raw) continue;

    const normalizada = normalizarTarefa(raw, indice);
    const chaveNome = extrairChaveNomeDeduplicacao(normalizada);

    // Se a tarefa não tiver nome identificável, mantém
    if (!chaveNome) {
      mapaPorGrupoENome.set(`sem_nome_${normalizada.id || i}`, normalizada);
      continue;
    }

    // Grupo de trabalho (projetoId / groupId)
    const grupoId = normalizada.projetoId != null ? String(normalizada.projetoId) : 'sem_grupo';
    const chaveUnica = `${grupoId}:::${chaveNome}`;

    const existente = mapaPorGrupoENome.get(chaveUnica);
    if (!existente) {
      mapaPorGrupoENome.set(chaveUnica, normalizada);
      continue;
    }

    // Mesmo título no mesmo grupo: decide qual registro sobrevive.
    //
    // A CONCLUÍDA vence, espelhando deduplicarTarefasPorTitulo no backend
    // (triagem.ts). A regra anterior era a inversa — mantinha a ativa e
    // descartava a concluída —, o que deprimia a taxa de conclusão de todo o
    // painel, com viés maior justamente sobre quem mais entrega. Os dois
    // estágios da mesma pipeline decidiam ao contrário um do outro.
    const exEhConcluida = existente.situacaoPrazo === 'concluida' || existente.status === 5;
    const novaEhConcluida = normalizada.situacaoPrazo === 'concluida' || normalizada.status === 5;

    if (novaEhConcluida && !exEhConcluida) {
      mapaPorGrupoENome.set(chaveUnica, normalizada);
    } else if (exEhConcluida && !novaEhConcluida) {
      // Mantém a concluída já registrada.
    } else {
      // Ambos mesmo status: mantém a de maior ID ou data mais recente
      const idAtual = Number(normalizada.id) || 0;
      const idExistente = Number(existente.id) || 0;
      if (idAtual > idExistente) {
        mapaPorGrupoENome.set(chaveUnica, normalizada);
      }
    }
  }

  return Array.from(mapaPorGrupoENome.values());
}

/**
 * Identifica a qual Polo Regional a tarefa pertence.
 */
export function identificarPoloDaTarefa(tarefa, regras = MOCK_REGRAS) {
  if (!tarefa) return null;
  if (tarefa.poloCobranca && tarefa.poloCobranca !== 'Sem vínculo') {
    if (UF_PARA_POLO[tarefa.poloCobranca]) return UF_PARA_POLO[tarefa.poloCobranca];
    return tarefa.poloCobranca;
  }
  const uf = extrairEstadoUf(tarefa);
  if (uf && UF_PARA_POLO[uf]) return UF_PARA_POLO[uf];
  return null;
}
