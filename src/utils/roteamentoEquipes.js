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
 * Extrai a sigla da UF (estado) a partir dos dados da tarefa.
 */
export function extrairEstadoUf(tarefa) {
  if (!tarefa) return null;

  const campos = [
    tarefa.estadoUf,
    tarefa.uf,
    tarefa.clienteEstado,
    tarefa.estado,
    tarefa.ufCliente,
  ];

  for (const c of campos) {
    if (typeof c === 'string' && c.trim().length >= 2) {
      const match = c.trim().match(/\b([A-Za-z]{2})\b/);
      if (match && UF_PARA_POLO[match[1].toUpperCase()]) {
        return match[1].toUpperCase();
      }
    }
  }

  // Tenta extrair do título ou nome do cliente (ex.: "Carlos Eduardo (SP)" ou "Cobrança - BA")
  const texto = `${tarefa.titulo || ''} ${tarefa.clienteNome || ''}`;
  const matchTexto = texto.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i);
  if (matchTexto && UF_PARA_POLO[matchTexto[1].toUpperCase()]) {
    return matchTexto[1].toUpperCase();
  }

  return null;
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
 * Normaliza uma tarefa com resolução O(1) de alta performance.
 */
export function normalizarTarefa(t, indice) {
  if (!t) return t;

  // 1. Resolve o polo
  let polo = t.poloCobranca;
  if (!polo || polo === 'Sem vínculo') {
    const uf = extrairEstadoUf(t);
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
      }
    }
  } else if (UF_PARA_POLO[polo]) {
    polo = UF_PARA_POLO[polo];
  }

  // 2. Resolve o dígito final do CPF
  const digito = extrairDigitoFinalCpf(t);
  const eh48h = Boolean(t.emEscalao48h || t.ehEscalao48h);

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

  return {
    ...t,
    poloCobranca: polo || null,
    digitoCpfCliente: digito !== null ? digito : t.digitoCpfCliente,
    equipeCobrancaColaboradorNome: cobrador || '—',
    equipeCobrancaAdvogado: advogado || 'Sem advogado',
  };
}

/**
 * Normaliza um lote inteiro de tarefas (ex.: 85.000 tarefas em ~15ms).
 */
export function normalizarTarefas(tarefas, regras = MOCK_REGRAS) {
  if (!Array.isArray(tarefas)) return [];
  const indice = criarIndiceRegras(regras);
  const resultado = new Array(tarefas.length);
  for (let i = 0; i < tarefas.length; i++) {
    resultado[i] = normalizarTarefa(tarefas[i], indice);
  }
  return resultado;
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
