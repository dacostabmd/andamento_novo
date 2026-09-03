import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { IconDownload, IconPrinter } from './Icons.jsx';
import { s } from '../style.js';

// Taxas de adimplência podem ser indeterminadas (sem faturamento com situação
// financeira conhecida). Nesse caso exibimos "—" em vez de um 0% ou 100% que
// seriam lidos como desempenho real.
const fmtPct = (v, casas = 1) => (v === null || v === undefined || isNaN(v) ? '—' : v.toFixed(casas) + '%');
const pctParaExcel = (v, casas = 1) => (v === null || v === undefined || isNaN(v) ? '' : Number(v.toFixed(casas)));
// Cor neutra quando a taxa é indeterminada, para não sinalizar sucesso/erro falso.
const corTaxa = (v, limite = 70) =>
  v === null || v === undefined || isNaN(v) ? 'rgba(236,230,216,0.35)' : v >= limite ? '#5fc9a8' : '#f5dd90';

export default function Relatorios({
  tarefas = [],
  regras = [],
  polos = [],
  poloLabels = {},
  corPolo = {},
  onAbrirBitrix,
}) {
  const [diasFiltro, setDiasFiltro] = useState(14); // 7 | 14 | 30 | 0 (todos)
  const [abaAtiva, setAbaAtiva] = useState('polos'); // 'polos' | 'times' | 'colaboradores' | 'tarefas'
  const [buscaTarefa, setBuscaTarefa] = useState('');
  const [paginaTarefas, setPaginaTarefas] = useState(1);

  // 1. Filtrar tarefas pela janela de dias
  const { tarefasFiltradas, dataInicioTexto, dataFimTexto, semDataRef } = useMemo(() => {
    const agora = Date.now();
    const dataFim = new Date(agora).toLocaleDateString('pt-BR');

    if (diasFiltro === 0) {
      return {
        tarefasFiltradas: tarefas,
        dataInicioTexto: 'Início do histórico',
        dataFimTexto: dataFim,
        semDataRef: 0,
      };
    }

    const limiteMs = diasFiltro * 24 * 60 * 60 * 1000;
    const dataCorte = agora - limiteMs;
    const dataInicio = new Date(dataCorte).toLocaleDateString('pt-BR');

    // Tarefas sem data confiável NÃO entram na janela: incluí-las inflava
    // artificialmente qualquer recorte de período (uma tarefa sem data aparecia
    // igualmente em "7 dias" e em "30 dias"). Elas são contabilizadas à parte
    // para que o volume descartado seja auditável na interface.
    let semDataRef = 0;
    const filtradas = tarefas.filter((t) => {
      const dataRef = t.criadoEm || t.atualizadoEm || t.primeiraAtividadeEm;
      const tMs = dataRef ? new Date(dataRef).getTime() : NaN;
      if (!dataRef || isNaN(tMs)) {
        semDataRef++;
        return false;
      }
      return tMs >= dataCorte;
    });

    return {
      tarefasFiltradas: filtradas,
      dataInicioTexto: dataInicio,
      dataFimTexto: dataFim,
      semDataRef,
    };
  }, [tarefas, diasFiltro]);

  // 2. Métricas Consolidadas Globais
  const metricasGerais = useMemo(() => {
    let totalFaturamento = 0;
    let totalAdimplente = 0;
    let totalInadimplente = 0;
    let countAdimplentes = 0;
    let countInadimplentes = 0;

    let concluidas = 0;
    let atrasadas = 0;
    let noPrazo = 0;
    let escalao48h = 0;

    for (const t of tarefasFiltradas) {
      const val = typeof t.valorCobranca === 'number' && !isNaN(t.valorCobranca) ? t.valorCobranca : 0;
      totalFaturamento += val;

      const sit = (t.situacaoFinanceira || '').toUpperCase();
      if (sit === 'ADIMPLENTE') {
        countAdimplentes++;
        totalAdimplente += val;
      } else if (sit === 'INADIMPLENTE') {
        countInadimplentes++;
        totalInadimplente += val;
      }

      if (t.situacaoPrazo === 'concluida') concluidas++;
      else if (t.situacaoPrazo === 'atrasada') atrasadas++;
      else if (t.situacaoPrazo === 'no_prazo') noPrazo++;

      if (t.emEscalao48h || t.ehEscalao48h) escalao48h++;
    }

    const total = tarefasFiltradas.length;
    const totalComSit = totalAdimplente + totalInadimplente;
    const countComSit = countAdimplentes + countInadimplentes;

    // Duas taxas DISTINTAS, nunca intercambiáveis:
    //  - taxaAdimplencia      → ponderada por VALOR (R$ adimplente / R$ com situação)
    //  - taxaAdimplenciaCasos → contagem de CASOS (cards adimplentes / cards com situação)
    // Antes um único número por valor era exibido junto de uma legenda por casos,
    // o que fazia o card afirmar "68,7%" acima de uma evidência de 25%.
    // null = indeterminado (sem base de cálculo); a UI mostra "—", nunca 100%.
    const taxaAdimplencia = totalComSit > 0 ? (totalAdimplente / totalComSit) * 100 : null;
    const taxaAdimplenciaCasos = countComSit > 0 ? (countAdimplentes / countComSit) * 100 : null;

    // Cobertura: fração do faturamento que possui situação financeira conhecida.
    // Sem isso, a taxa de adimplência é lida como se valesse para a carteira toda.
    const coberturaSituacao = totalFaturamento > 0 ? (totalComSit / totalFaturamento) * 100 : 0;
    const faturamentoSemSituacao = totalFaturamento - totalComSit;

    const taxaConclusao = total > 0 ? (concluidas / total) * 100 : 0;
    const taxaAtraso = total > 0 ? (atrasadas / total) * 100 : 0;

    return {
      total,
      concluidas,
      atrasadas,
      noPrazo,
      escalao48h,
      taxaConclusao,
      taxaAtraso,
      totalFaturamento,
      totalAdimplente,
      totalInadimplente,
      countAdimplentes,
      countInadimplentes,
      countComSit,
      taxaAdimplencia,
      taxaAdimplenciaCasos,
      coberturaSituacao,
      faturamentoSemSituacao,
    };
  }, [tarefasFiltradas]);

  // 3. Métricas por Polo Regional
  //
  // A tabela de polos DEVE reconciliar com os cards do topo. Antes, tarefas cujo
  // poloCobranca não resolvia para nenhum código conhecido simplesmente sumiam da
  // tabela enquanto continuavam somando nos KPIs globais — a diferença chegava a
  // 33% do volume e 41% das tarefas atrasadas. Agrupamos essas órfãs numa linha
  // explícita "Sem vínculo regional" para que a soma feche e o passivo apareça.
  const relatorioPolos = useMemo(() => {
    const codigosConhecidos = new Set(polos.map((p) => p.codigo));

    const agregar = (lista) => {
      let totalFaturamento = 0;
      let totalAdimplente = 0;
      let totalInadimplente = 0;
      let countAdimp = 0;
      let countInad = 0;
      let concluidas = 0;
      let atrasadas = 0;
      let noPrazo = 0;
      let escalao48h = 0;

      for (const t of lista) {
        const val = typeof t.valorCobranca === 'number' && !isNaN(t.valorCobranca) ? t.valorCobranca : 0;
        totalFaturamento += val;

        const sit = (t.situacaoFinanceira || '').toUpperCase();
        if (sit === 'ADIMPLENTE') {
          countAdimp++;
          totalAdimplente += val;
        } else if (sit === 'INADIMPLENTE') {
          countInad++;
          totalInadimplente += val;
        }

        if (t.situacaoPrazo === 'concluida') concluidas++;
        else if (t.situacaoPrazo === 'atrasada') atrasadas++;
        else if (t.situacaoPrazo === 'no_prazo') noPrazo++;

        if (t.emEscalao48h || t.ehEscalao48h) escalao48h++;
      }

      const total = lista.length;
      const totalComSit = totalAdimplente + totalInadimplente;

      return {
        total,
        concluidas,
        atrasadas,
        noPrazo,
        escalao48h,
        totalFaturamento,
        totalAdimplente,
        totalInadimplente,
        countAdimp,
        countInad,
        // null quando não há base de cálculo — evita que ausência de dado
        // seja premiada como 100% de adimplência no ranking.
        taxaAdimplencia: totalComSit > 0 ? (totalAdimplente / totalComSit) * 100 : null,
        coberturaSituacao: totalFaturamento > 0 ? (totalComSit / totalFaturamento) * 100 : 0,
        taxaConclusao: total > 0 ? (concluidas / total) * 100 : 0,
        taxaAtraso: total > 0 ? (atrasadas / total) * 100 : 0,
      };
    };

    const linhas = polos.map((p) => {
      const membros = regras.filter((r) => r.polo === p.codigo);
      const tarefasDoPolo = tarefasFiltradas.filter((t) => t.poloCobranca === p.codigo);
      return {
        codigo: p.codigo,
        rotulo: poloLabels[p.codigo] || p.rotulo || p.codigo,
        membros: membros.length,
        semVinculo: false,
        ...agregar(tarefasDoPolo),
      };
    }).sort((a, b) => (b.totalFaturamento - a.totalFaturamento) || (b.concluidas - a.concluidas));

    const orfas = tarefasFiltradas.filter(
      (t) => !t.poloCobranca || !codigosConhecidos.has(t.poloCobranca)
    );

    if (orfas.length > 0) {
      linhas.push({
        codigo: '__SEM_VINCULO__',
        rotulo: 'Sem vínculo regional',
        membros: 0,
        semVinculo: true,
        ...agregar(orfas),
      });
    }

    return linhas;
  }, [polos, regras, tarefasFiltradas, poloLabels]);

  // 4. Métricas por Times (Cobrador ↔ Advogado por CPF)
  const relatorioTimes = useMemo(() => {
    return regras.map((r) => {
      let critTexto = '';
      if (r.ehEscalao48h) {
        critTexto = '48 horas';
      } else if (Array.isArray(r.digitosCpf) && r.digitosCpf.length > 0) {
        critTexto = 'CPF final ' + r.digitosCpf.join(', ');
      } else {
        critTexto = 'Geral';
      }

      const cobrador = r.colaboradorNome || 'Cobrador não definido';
      const advogado = r.advogado || 'Sem advogado';
      const poloRotulo = poloLabels[r.polo] || r.polo;

      const tarefasDoTime = tarefasFiltradas.filter((t) => {
        if (t.poloCobranca !== r.polo) return false;
        if (r.ehEscalao48h) return Boolean(t.emEscalao48h || t.ehEscalao48h);
        if (Array.isArray(r.digitosCpf) && r.digitosCpf.length > 0) {
          if (t.digitoCpfCliente != null && r.digitosCpf.includes(Number(t.digitoCpfCliente))) {
            return true;
          }
        }
        const cobT = (t.equipeCobrancaColaboradorNome || t.colaboradorNome || '').toLowerCase().trim();
        const cobR = (r.colaboradorNome || '').toLowerCase().trim();
        return Boolean(cobR && cobT && (cobT.includes(cobR) || cobR.includes(cobT)));
      });

      let totalFaturamento = 0;
      let totalAdimplente = 0;
      let totalInadimplente = 0;
      let countAdimp = 0;
      let countInad = 0;
      let concluidas = 0;
      let atrasadas = 0;

      for (const t of tarefasDoTime) {
        const val = typeof t.valorCobranca === 'number' && !isNaN(t.valorCobranca) ? t.valorCobranca : 0;
        totalFaturamento += val;

        const sit = (t.situacaoFinanceira || '').toUpperCase();
        if (sit === 'ADIMPLENTE') {
          countAdimp++;
          totalAdimplente += val;
        } else if (sit === 'INADIMPLENTE') {
          countInad++;
          totalInadimplente += val;
        }

        if (t.situacaoPrazo === 'concluida') concluidas++;
        else if (t.situacaoPrazo === 'atrasada') atrasadas++;
      }

      const total = tarefasDoTime.length;
      const totalComSit = totalAdimplente + totalInadimplente;
      // null = sem base de cálculo. Retornar 100% aqui colocava times sem
      // nenhum dado financeiro no topo do ranking de adimplência.
      const taxaAdimplencia = totalComSit > 0 ? (totalAdimplente / totalComSit) * 100 : null;
      const coberturaSituacao = totalFaturamento > 0 ? (totalComSit / totalFaturamento) * 100 : 0;

      const taxaConclusao = total > 0 ? (concluidas / total) * 100 : 0;

      return {
        id: r.id,
        polo: r.polo,
        poloRotulo,
        cobrador,
        advogado,
        critTexto,
        total,
        concluidas,
        atrasadas,
        taxaConclusao,
        totalFaturamento,
        totalAdimplente,
        totalInadimplente,
        countAdimp,
        countInad,
        taxaAdimplencia,
        coberturaSituacao,
      };
    }).sort((a, b) => (b.totalFaturamento - a.totalFaturamento) || (b.total - a.total));
  }, [regras, tarefasFiltradas, poloLabels]);

  // 5. Ranking de Cobradores e Advogados
  const { topCobradores, topAdvogados } = useMemo(() => {
    const mapaCobradores = new Map();
    const mapaAdvogados = new Map();

    for (const t of tarefasFiltradas) {
      const val = typeof t.valorCobranca === 'number' && !isNaN(t.valorCobranca) ? t.valorCobranca : 0;
      const sit = (t.situacaoFinanceira || '').toUpperCase();
      const isAdimp = sit === 'ADIMPLENTE';
      const isInad = sit === 'INADIMPLENTE';
      const isConcluida = t.situacaoPrazo === 'concluida';

      const cobNome = t.equipeCobrancaColaboradorNome || t.colaboradorNome || t.responsavelNome;
      if (cobNome && cobNome !== '—' && cobNome !== 'Cobrador não definido') {
        if (!mapaCobradores.has(cobNome)) {
          mapaCobradores.set(cobNome, { nome: cobNome, faturamento: 0, faturamentoAdimp: 0, faturamentoInad: 0, tarefas: 0, concluidas: 0 });
        }
        const c = mapaCobradores.get(cobNome);
        c.faturamento += val;
        if (isAdimp) c.faturamentoAdimp += val;
        else if (isInad) c.faturamentoInad += val;
        c.tarefas++;
        if (isConcluida) c.concluidas++;
      }

      const advNome = t.equipeCobrancaAdvogado || t.advogado;
      if (advNome && advNome !== '—' && advNome !== 'Sem advogado') {
        if (!mapaAdvogados.has(advNome)) {
          mapaAdvogados.set(advNome, { nome: advNome, faturamento: 0, faturamentoAdimp: 0, faturamentoInad: 0, tarefas: 0, concluidas: 0 });
        }
        const a = mapaAdvogados.get(advNome);
        a.faturamento += val;
        if (isAdimp) a.faturamentoAdimp += val;
        else if (isInad) a.faturamentoInad += val;
        a.tarefas++;
        if (isConcluida) a.concluidas++;
      }
    }

    // A taxa de adimplência deve ter como denominador o faturamento COM situação
    // conhecida, não o faturamento total: dividir pelo total diluía a taxa com
    // valores sem status e a fazia parecer baixa artificialmente. E, sem base,
    // o resultado é null (exibido como "—") em vez de um 100% enganoso.
    const calcTaxas = (item) => {
      const base = item.faturamentoAdimp + item.faturamentoInad;
      return {
        ...item,
        taxaAdimplencia: base > 0 ? (item.faturamentoAdimp / base) * 100 : null,
        coberturaSituacao: item.faturamento > 0 ? (base / item.faturamento) * 100 : 0,
        taxaConclusao: item.tarefas > 0 ? (item.concluidas / item.tarefas) * 100 : 0,
      };
    };

    return {
      topCobradores: Array.from(mapaCobradores.values()).map(calcTaxas).sort((a, b) => b.faturamento - a.faturamento),
      topAdvogados: Array.from(mapaAdvogados.values()).map(calcTaxas).sort((a, b) => b.faturamento - a.faturamento),
    };
  }, [tarefasFiltradas]);

  // 6. Exportação para Excel (XLSX com 5 abas completas)
  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();

    // Aba 1: Resumo Executivo
    const dadosResumo = [
      ['RELATÓRIO GERENCIAL DE DESEMPENHO E ANDAMENTO PROCESSUAL'],
      ['Período Analisado', dataInicioTexto + ' até ' + dataFimTexto + ' (' + (diasFiltro === 0 ? 'Histórico Completo' : 'Últimos ' + diasFiltro + ' dias') + ')'],
      ['Data de Emissão', new Date().toLocaleString('pt-BR')],
      [],
      ['MÉTRICAS FINANCEIRAS CONSOLIDADAS', 'VALOR'],
      ['Faturamento Total Consolidado (R$)', metricasGerais.totalFaturamento],
      ['Faturamento Adimplente (R$)', metricasGerais.totalAdimplente],
      ['Faturamento Inadimplente (R$)', metricasGerais.totalInadimplente],
      ['Taxa de Adimplência Geral — por valor (%)', pctParaExcel(metricasGerais.taxaAdimplencia)],
      ['Taxa de Adimplência Geral — por casos (%)', pctParaExcel(metricasGerais.taxaAdimplenciaCasos)],
      ['Cobertura: % do faturamento com situação conhecida', pctParaExcel(metricasGerais.coberturaSituacao)],
      ['Faturamento sem situação financeira (R$)', metricasGerais.faturamentoSemSituacao],
      ['Clientes/Cards Adimplentes', metricasGerais.countAdimplentes],
      ['Clientes/Cards Inadimplentes', metricasGerais.countInadimplentes],
      [],
      ['MÉTRICAS OPERACIONAIS DE TAREFAS', 'QUANTIDADE'],
      ['Total de Tarefas no Período', metricasGerais.total],
      ['Tarefas Concluídas', metricasGerais.concluidas],
      ['Tarefas em Andamento (No Prazo)', metricasGerais.noPrazo],
      ['Tarefas Atrasadas', metricasGerais.atrasadas],
      ['Taxa de Conclusão (%)', Number(metricasGerais.taxaConclusao.toFixed(1))],
      ['Taxa de Atraso (%)', Number(metricasGerais.taxaAtraso.toFixed(1))],
      ['Tarefas em Escalão 48 Horas', metricasGerais.escalao48h],
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(dadosResumo);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Executivo');

    // Aba 2: Polos Regionais
    const dadosPolos = [
      ['Polo Regional', 'Código', 'Colaboradores', 'Total Tarefas', 'Concluídas', 'Em Andamento', 'Atrasadas', 'Escalão 48h', 'Taxa Conclusão (%)', 'Faturamento Total (R$)', 'Faturamento Adimplente (R$)', 'Faturamento Inadimplente (R$)', 'Taxa Adimplência (%)', 'Cobertura Situação (%)'],
      ...relatorioPolos.map((p) => [
        p.rotulo,
        p.codigo,
        p.membros,
        p.total,
        p.concluidas,
        p.noPrazo,
        p.atrasadas,
        p.escalao48h,
        Number(p.taxaConclusao.toFixed(1)),
        p.totalFaturamento,
        p.totalAdimplente,
        p.totalInadimplente,
        pctParaExcel(p.taxaAdimplencia),
        pctParaExcel(p.coberturaSituacao),
      ]),
    ];
    const wsPolos = XLSX.utils.aoa_to_sheet(dadosPolos);
    XLSX.utils.book_append_sheet(wb, wsPolos, 'Polos Regionais');

    // Aba 3: Times por CPF
    const dadosTimes = [
      ['Polo', 'Cobrador', 'Advogado', 'Regra CPF / Tipo', 'Tarefas', 'Concluídas', 'Taxa Conclusão (%)', 'Faturamento Total (R$)', 'Faturamento Adimplente (R$)', 'Faturamento Inadimplente (R$)', 'Taxa Adimplência (%)'],
      ...relatorioTimes.map((t) => [
        t.poloRotulo,
        t.cobrador,
        t.advogado,
        t.critTexto,
        t.total,
        t.concluidas,
        Number(t.taxaConclusao.toFixed(1)),
        t.totalFaturamento,
        t.totalAdimplente,
        t.totalInadimplente,
        pctParaExcel(t.taxaAdimplencia),
      ]),
    ];
    const wsTimes = XLSX.utils.aoa_to_sheet(dadosTimes);
    XLSX.utils.book_append_sheet(wb, wsTimes, 'Times por CPF');

    // Aba 4: Colaboradores Individuais
    const dadosColabs = [
      ['TIPO', 'NOME', 'TOTAL TAREFAS', 'CONCLUÍDAS', 'TAXA CONCLUSÃO (%)', 'FATURAMENTO TOTAL (R$)', 'FATURAMENTO ADIMPLENTE (R$)', 'TAXA ADIMPLÊNCIA (%)'],
      ...topCobradores.map((c) => [
        'Cobrador',
        c.nome,
        c.tarefas,
        c.concluidas,
        Number(c.taxaConclusao.toFixed(1)),
        c.faturamento,
        c.faturamentoAdimp,
        pctParaExcel(c.taxaAdimplencia),
      ]),
      ...topAdvogados.map((a) => [
        'Advogado',
        a.nome,
        a.tarefas,
        a.concluidas,
        Number(a.taxaConclusao.toFixed(1)),
        a.faturamento,
        a.faturamentoAdimp,
        pctParaExcel(a.taxaAdimplencia),
      ]),
    ];
    const wsColabs = XLSX.utils.aoa_to_sheet(dadosColabs);
    XLSX.utils.book_append_sheet(wb, wsColabs, 'Colaboradores');

    // Aba 5: Detalhamento de Tarefas
    const dadosTarefas = [
      ['ID', 'Título da Tarefa', 'Cliente', 'CPF', 'Polo', 'Cobrador', 'Advogado', 'Status', 'Situação Prazo', 'Valor Cobrança (R$)', 'Situação Financeira', 'Escalão 48h', 'Data Criação'],
      ...tarefasFiltradas.slice(0, 5000).map((t) => [
        t.id,
        t.titulo,
        t.clienteNome || '—',
        t.cpfCliente || '—',
        poloLabels[t.poloCobranca] || t.poloCobranca || '—',
        t.equipeCobrancaColaboradorNome || t.colaboradorNome || '—',
        t.equipeCobrancaAdvogado || '—',
        t.status,
        t.situacaoPrazo,
        t.valorCobranca || 0,
        t.situacaoFinanceira || '—',
        t.emEscalao48h || t.ehEscalao48h ? 'SIM' : 'NÃO',
        t.criadoEm ? new Date(t.criadoEm).toLocaleDateString('pt-BR') : '—',
      ]),
    ];
    const wsTarefas = XLSX.utils.aoa_to_sheet(dadosTarefas);
    XLSX.utils.book_append_sheet(wb, wsTarefas, 'Tarefas (Amostra)');

    // Salvar arquivo
    const nomeArquivo = 'Relatorio_Andamento_Processual_' + (diasFiltro === 0 ? 'Geral' : diasFiltro + 'd') + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';
    XLSX.writeFile(wb, nomeArquivo);
  };

  // 7. Impressão / Exportação para PDF (A4 Executivo)
  const exportarPdf = () => {
    window.print();
  };

  return (
    <div className="relatorio-screen" style={s('max-width:1360px;animation:fadeSlideIn 0.4s ease both;margin:0 auto;')}>
      
      {/* ─── TOPO DO RELATÓRIO COM FILTROS E EXPORTAÇÃO ─── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px', color: '#f5dd90', display: 'inline-flex', alignItems: 'center' }}>◈</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ECE6D8', letterSpacing: '-0.01em' }}>
              Relatórios Gerenciais & Desempenho
            </div>
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(236,230,216,0.5)', marginTop: '4px' }}>
            Consolidação de Faturamento, Adimplência Asaas, Prazos e Equipes • Janela: <strong style={{ color: '#f5dd90' }}>{dataInicioTexto} até {dataFimTexto}</strong>
          </div>
        </div>

        {/* Controles de Período e Botões de Exportação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Seletor de Período */}
          <div style={{ display: 'inline-flex', background: '#141414', border: '1px solid rgba(199,199,199,0.15)', borderRadius: '8px', padding: '3px' }}>
            {[
              { dias: 7, label: '7 dias' },
              { dias: 14, label: '14 dias' },
              { dias: 30, label: '30 dias' },
              { dias: 0, label: 'Histórico' },
            ].map((p) => {
              const ativo = diasFiltro === p.dias;
              return (
                <button
                  key={p.dias}
                  type="button"
                  onClick={() => setDiasFiltro(p.dias)}
                  style={{
                    background: ativo ? 'rgba(245,221,144,0.18)' : 'transparent',
                    color: ativo ? '#f5dd90' : 'rgba(236,230,216,0.6)',
                    border: ativo ? '1px solid rgba(245,221,144,0.4)' : 'none',
                    borderRadius: '6px',
                    padding: '5px 11px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Botão Exportar Excel */}
          <button
            type="button"
            onClick={exportarExcel}
            title="Baixar planilha Excel (.xlsx) completa com 5 abas"
            style={{
              background: 'rgba(95, 201, 168, 0.15)',
              border: '1px solid rgba(95, 201, 168, 0.45)',
              color: '#5fc9a8',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <IconDownload size={15} />
            <span>Exportar Excel (.xlsx)</span>
          </button>

          {/* Botão Exportar / Imprimir PDF */}
          <button
            type="button"
            onClick={exportarPdf}
            title="Imprimir ou salvar como PDF formatado A4"
            style={{
              background: 'rgba(245, 221, 144, 0.15)',
              border: '1px solid rgba(245, 221, 144, 0.45)',
              color: '#f5dd90',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <IconPrinter size={15} />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* ─── 4 CARDS EXECUTIVOS PRINCIPAIS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '22px' }}>
        {/* Card 1: Faturamento Total */}
        <div style={{ background: '#111', border: '1px solid rgba(199,199,199,0.14)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'rgba(236,230,216,0.6)', letterSpacing: '0.04em' }}>
              FATURAMENTO NO PERÍODO
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f5dd90' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f5dd90' }}>
            R$ {metricasGerais.totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.45)', marginTop: '4px' }}>
            Volume consolidado em cobrança
          </div>
        </div>

        {/* Card 2: Taxa de Adimplência */}
        <div style={{ background: '#111', border: '1px solid rgba(199,199,199,0.14)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'rgba(236,230,216,0.6)', letterSpacing: '0.04em' }}>
              TAXA DE ADIMPLÊNCIA
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: corTaxa(metricasGerais.taxaAdimplencia, 75) }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: corTaxa(metricasGerais.taxaAdimplencia, 75) }}>
            {fmtPct(metricasGerais.taxaAdimplencia)}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.45)', marginTop: '4px' }}>
            por valor · {fmtPct(metricasGerais.taxaAdimplenciaCasos)} por casos ({metricasGerais.countAdimplentes.toLocaleString('pt-BR')} de {metricasGerais.countComSit.toLocaleString('pt-BR')})
          </div>
          <div style={{ fontSize: '10.5px', color: 'rgba(245,221,144,0.75)', marginTop: '3px' }}>
            Base: {fmtPct(metricasGerais.coberturaSituacao, 0)} do faturamento tem situação conhecida
          </div>
        </div>

        {/* Card 3: Faturamento Adimplente */}
        <div style={{ background: '#111', border: '1px solid rgba(199,199,199,0.14)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'rgba(236,230,216,0.6)', letterSpacing: '0.04em' }}>
              FATURAMENTO ADIMPLENTE
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#5fc9a8' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#5fc9a8' }}>
            R$ {metricasGerais.totalAdimplente.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.45)', marginTop: '4px' }}>
            Cobranças com status Adimplente
          </div>
        </div>

        {/* Card 4: Faturamento Inadimplente */}
        <div style={{ background: '#111', border: '1px solid rgba(199,199,199,0.14)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'rgba(236,230,216,0.6)', letterSpacing: '0.04em' }}>
              FATURAMENTO INADIMPLENTE
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e0796f' }} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#e0796f' }}>
            R$ {metricasGerais.totalInadimplente.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.45)', marginTop: '4px' }}>
            Cobranças em atraso / vencidas
          </div>
        </div>
      </div>

      {/* ─── RESUMO OPERACIONAL DE PRAZOS ─── */}
      <div
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(199,199,199,0.1)',
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <span style={{ color: 'rgba(236,230,216,0.5)', fontSize: '12px' }}>Total de Tarefas no Período: </span>
          <strong style={{ color: '#ECE6D8', fontSize: '14px' }}>{metricasGerais.total.toLocaleString('pt-BR')}</strong>
        </div>
        <div>
          <span style={{ color: 'rgba(236,230,216,0.5)', fontSize: '12px' }}>Concluídas: </span>
          <strong style={{ color: '#5fc9a8', fontSize: '14px' }}>{metricasGerais.concluidas.toLocaleString('pt-BR')}</strong>
          <span style={{ color: 'rgba(95,201,168,0.7)', fontSize: '11px', marginLeft: '5px' }}>({metricasGerais.taxaConclusao.toFixed(1)}%)</span>
        </div>
        <div>
          <span style={{ color: 'rgba(236,230,216,0.5)', fontSize: '12px' }}>Em Andamento: </span>
          <strong style={{ color: '#5b9bdb', fontSize: '14px' }}>{metricasGerais.noPrazo.toLocaleString('pt-BR')}</strong>
        </div>
        <div>
          <span style={{ color: 'rgba(236,230,216,0.5)', fontSize: '12px' }}>Atrasadas: </span>
          <strong style={{ color: '#e0796f', fontSize: '14px' }}>{metricasGerais.atrasadas.toLocaleString('pt-BR')}</strong>
          <span style={{ color: 'rgba(224,121,111,0.7)', fontSize: '11px', marginLeft: '5px' }}>({metricasGerais.taxaAtraso.toFixed(1)}%)</span>
        </div>
        <div>
          <span style={{ color: 'rgba(236,230,216,0.5)', fontSize: '12px' }}>Escalão 48h: </span>
          <strong style={{ color: '#f5dd90', fontSize: '14px' }}>{metricasGerais.escalao48h.toLocaleString('pt-BR')}</strong>
        </div>
        {semDataRef > 0 && (
          <div
            title="Tarefas sem data de referência confiável. Ficam fora de qualquer recorte por período para não inflar a janela selecionada."
            style={{ color: 'rgba(236,230,216,0.4)', fontSize: '11px' }}
          >
            <span>Fora do período (sem data): </span>
            <strong style={{ color: 'rgba(236,230,216,0.6)' }}>{semDataRef.toLocaleString('pt-BR')}</strong>
          </div>
        )}
      </div>

      {/* ─── NAVEGAÇÃO ENTRE ABAS DE RELATÓRIO ─── */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(199,199,199,0.12)', paddingBottom: '10px', marginBottom: '18px' }}>
        {[
          { key: 'polos', label: 'Polos Regionais (' + relatorioPolos.length + ')' },
          { key: 'times', label: 'Times por CPF (' + relatorioTimes.length + ')' },
          { key: 'colaboradores', label: 'Cobradores & Advogados' },
          { key: 'tarefas', label: 'Amostra de Tarefas (' + tarefasFiltradas.length + ')' },
        ].map((tab) => {
          const ativo = abaAtiva === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setAbaAtiva(tab.key)}
              style={{
                background: ativo ? 'rgba(245, 221, 144, 0.16)' : 'transparent',
                color: ativo ? '#f5dd90' : 'rgba(236,230,216,0.6)',
                border: ativo ? '1px solid rgba(245, 221, 144, 0.35)' : '1px solid transparent',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── ABA 1: POLOS REGIONAIS ─── */}
      {abaAtiva === 'polos' && (
        <div style={{ background: '#111', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(199,199,199,0.1)', color: 'rgba(236,230,216,0.6)' }}>
                <th style={{ padding: '12px 16px' }}>Polo Regional</th>
                <th style={{ padding: '12px 10px', textAlign: 'center' }}>Membros</th>
                <th style={{ padding: '12px 12px', textAlign: 'right' }}>Total Tarefas</th>
                <th style={{ padding: '12px 12px', textAlign: 'right' }}>Concluídas</th>
                <th style={{ padding: '12px 12px', textAlign: 'right' }}>Atrasadas</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', color: '#f5dd90' }}>Faturamento Total</th>
                <th style={{ padding: '12px 12px', textAlign: 'right', color: '#5fc9a8' }}>Adimplente</th>
                <th style={{ padding: '12px 12px', textAlign: 'right', color: '#e0796f' }}>Inadimplente</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Taxa Adimplência</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Taxa Conclusão</th>
              </tr>
            </thead>
            <tbody>
              {relatorioPolos.map((p, idx) => (
                <tr
                  key={p.codigo}
                  style={{
                    borderBottom: '1px solid rgba(199,199,199,0.06)',
                    background: p.semVinculo
                      ? 'rgba(245,221,144,0.06)'
                      : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#ECE6D8' }}>
                    <span style={{ color: p.semVinculo ? '#f5dd90' : (corPolo[p.codigo] || '#5b9bdb'), marginRight: '6px' }}>
                      {p.semVinculo ? '▲' : '●'}
                    </span>
                    <span>{p.rotulo}</span>
                    {p.semVinculo && (
                      <span
                        title="Tarefas cujo polo regional não pôde ser resolvido. Aparecem aqui para que a tabela feche com os totais do topo."
                        style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 700, color: '#f5dd90', background: 'rgba(245,221,144,0.12)', border: '1px solid rgba(245,221,144,0.3)', borderRadius: '4px', padding: '2px 6px' }}
                      >
                        NÃO ROTEADO
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: 'rgba(236,230,216,0.6)' }}>{p.semVinculo ? '—' : p.membros}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600 }}>{p.total.toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', color: '#5fc9a8', fontWeight: 600 }}>{p.concluidas.toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', color: '#e0796f', fontWeight: 600 }}>{p.atrasadas.toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#f5dd90' }}>
                    R$ {p.totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', color: '#5fc9a8', fontWeight: 600 }}>
                    R$ {p.totalAdimplente.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', color: '#e0796f', fontWeight: 600 }}>
                    R$ {p.totalInadimplente.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: corTaxa(p.taxaAdimplencia) }}>
                    {fmtPct(p.taxaAdimplencia)}
                    <div style={{ fontSize: '9.5px', fontWeight: 600, color: 'rgba(236,230,216,0.4)', marginTop: '2px' }}>
                      base {fmtPct(p.coberturaSituacao, 0)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: 'rgba(236,230,216,0.85)' }}>
                    {p.taxaConclusao.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── ABA 2: TIMES POR CPF ─── */}
      {abaAtiva === 'times' && (
        <div style={{ background: '#111', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(199,199,199,0.1)', color: 'rgba(236,230,216,0.6)' }}>
                <th style={{ padding: '12px 14px', width: '50px' }}>Pos.</th>
                <th style={{ padding: '12px 14px' }}>Polo Regional</th>
                <th style={{ padding: '12px 14px' }}>Cobrador ↔ Advogado</th>
                <th style={{ padding: '12px 12px' }}>Regra CPF</th>
                <th style={{ padding: '12px 12px', textAlign: 'right' }}>Tarefas</th>
                <th style={{ padding: '12px 12px', textAlign: 'right' }}>Concluídas</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', color: '#f5dd90' }}>Faturamento Total</th>
                <th style={{ padding: '12px 12px', textAlign: 'right', color: '#5fc9a8' }}>Adimplente</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Adimplência (%)</th>
              </tr>
            </thead>
            <tbody>
              {relatorioTimes.map((t, idx) => {
                const medalha = idx === 0 ? '★ 1º' : idx === 1 ? '★ 2º' : idx === 2 ? '★ 3º' : (idx + 1) + 'º';
                const corMedalha = idx === 0 ? '#f5dd90' : idx === 1 ? '#d8d8d8' : idx === 2 ? '#cd7f32' : 'rgba(236,230,216,0.6)';
                return (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: '1px solid rgba(199,199,199,0.06)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'center', color: corMedalha }}>{medalha}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#ECE6D8' }}>{t.poloRotulo}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#ECE6D8' }}><span style={{ color: '#5b9bdb', marginRight: '6px' }}>◈</span>{t.cobrador}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.5)', marginTop: '2px' }}><span style={{ color: '#f5dd90', marginRight: '6px', fontWeight: 700 }}>§</span>{t.advogado}</div>
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <span style={{ background: 'rgba(245,221,144,0.1)', color: '#f5dd90', border: '1px solid rgba(245,221,144,0.25)', borderRadius: '4px', padding: '2px 7px', fontSize: '10.5px', fontWeight: 700 }}>
                        {t.critTexto}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600 }}>{t.total}</td>
                    <td style={{ padding: '12px 12px', textAlign: 'right', color: '#5fc9a8', fontWeight: 600 }}>{t.concluidas}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#f5dd90' }}>
                      R$ {t.totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'right', color: '#5fc9a8', fontWeight: 600 }}>
                      R$ {t.totalAdimplente.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: corTaxa(t.taxaAdimplencia) }}>
                      {fmtPct(t.taxaAdimplencia)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── ABA 3: COBRADORES & ADVOGADOS ─── */}
      {abaAtiva === 'colaboradores' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Top Cobradores */}
          <div style={{ background: '#111', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#ECE6D8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#5b9bdb', fontSize: '14px' }}>◈</span>
              <span>Top Cobradores no Período</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {topCobradores.map((cob, idx) => (
                <div
                  key={cob.nome}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(199,199,199,0.08)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#ECE6D8', fontSize: '12.5px' }}>
                      <span style={{ color: '#f5dd90', marginRight: '6px', fontWeight: 800 }}>{idx + 1}º</span>
                      {cob.nome}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'rgba(236,230,216,0.5)', marginTop: '2px' }}>
                      {cob.tarefas} tarefas • {cob.concluidas} concluídas ({cob.taxaConclusao.toFixed(0)}%)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#f5dd90' }}>
                      R$ {cob.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontSize: '10px', color: corTaxa(cob.taxaAdimplencia), marginTop: '2px' }}>
                      {fmtPct(cob.taxaAdimplencia, 0)} adimplência
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Advogados */}
          <div style={{ background: '#111', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#ECE6D8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#f5dd90', fontSize: '14px', fontWeight: 700 }}>§</span>
              <span>Top Advogados no Período</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {topAdvogados.map((adv, idx) => (
                <div
                  key={adv.nome}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(199,199,199,0.08)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#ECE6D8', fontSize: '12.5px' }}>
                      <span style={{ color: '#f5dd90', marginRight: '6px', fontWeight: 800 }}>{idx + 1}º</span>
                      {adv.nome}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'rgba(236,230,216,0.5)', marginTop: '2px' }}>
                      {adv.tarefas} tarefas • {adv.concluidas} concluídas ({adv.taxaConclusao.toFixed(0)}%)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#f5dd90' }}>
                      R$ {adv.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontSize: '10px', color: corTaxa(adv.taxaAdimplencia), marginTop: '2px' }}>
                      {fmtPct(adv.taxaAdimplencia, 0)} adimplência
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 4: TAREFAS DETALHADAS ─── */}
      {abaAtiva === 'tarefas' && (
        <div style={{ background: '#111', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ECE6D8' }}>
              Amostra das Tarefas da Janela ({tarefasFiltradas.length} total)
            </div>
            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                placeholder="Buscar por cliente, título, CPF..."
                value={buscaTarefa}
                onChange={(e) => {
                  setBuscaTarefa(e.target.value);
                  setPaginaTarefas(1);
                }}
                style={{
                  width: '100%',
                  background: '#161616',
                  color: '#ECE6D8',
                  border: '1px solid rgba(199,199,199,0.15)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11.5px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(199,199,199,0.1)', color: 'rgba(236,230,216,0.5)' }}>
                  <th style={{ padding: '8px 10px' }}>Cliente / Tarefa</th>
                  <th style={{ padding: '8px 10px' }}>Polo</th>
                  <th style={{ padding: '8px 10px' }}>Cobrador</th>
                  <th style={{ padding: '8px 10px' }}>Advogado</th>
                  <th style={{ padding: '8px 10px' }}>Status Prazo</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Valor Cobrança</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Situação Asaas</th>
                </tr>
              </thead>
              <tbody>
                {tarefasFiltradas
                  .filter((t) => {
                    if (!buscaTarefa) return true;
                    const b = buscaTarefa.toLowerCase();
                    return (
                      (t.clienteNome || '').toLowerCase().includes(b) ||
                      (t.titulo || '').toLowerCase().includes(b) ||
                      (t.cpfCliente || '').includes(b)
                    );
                  })
                  .slice((paginaTarefas - 1) * 20, paginaTarefas * 20)
                  .map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => onAbrirBitrix && onAbrirBitrix(t)}
                      style={{ borderBottom: '1px solid rgba(199,199,199,0.06)', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#ECE6D8' }}>
                        {t.clienteNome || t.titulo}
                      </td>
                      <td style={{ padding: '8px 10px', color: corPolo[t.poloCobranca] || '#5b9bdb' }}>
                        {poloLabels[t.poloCobranca] || t.poloCobranca || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'rgba(236,230,216,0.8)' }}>
                        {t.equipeCobrancaColaboradorNome || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'rgba(236,230,216,0.6)' }}>
                        {t.equipeCobrancaAdvogado || '—'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ fontSize: '10.5px', padding: '2px 7px', borderRadius: '4px', background: t.situacaoPrazo === 'concluida' ? 'rgba(95,201,168,0.18)' : (t.situacaoPrazo === 'atrasada' ? 'rgba(224,121,111,0.18)' : 'rgba(91,155,219,0.18)'), color: t.situacaoPrazo === 'concluida' ? '#5fc9a8' : (t.situacaoPrazo === 'atrasada' ? '#e0796f' : '#5b9bdb') }}>
                          {t.situacaoPrazo}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#f5dd90' }}>
                        {t.valorCobranca != null ? ('R$ ' + Number(t.valorCobranca).toLocaleString('pt-BR')) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {t.situacaoFinanceira ? (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: t.situacaoFinanceira.toUpperCase() === 'ADIMPLENTE' ? 'rgba(95,201,168,0.18)' : 'rgba(224,121,111,0.18)', color: t.situacaoFinanceira.toUpperCase() === 'ADIMPLENTE' ? '#5fc9a8' : '#e0796f' }}>
                            {t.situacaoFinanceira}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '14px' }}>
            <button
              type="button"
              disabled={paginaTarefas <= 1}
              onClick={() => setPaginaTarefas((p) => Math.max(1, p - 1))}
              style={{ background: '#1a1a1a', border: '1px solid rgba(199,199,199,0.15)', color: '#ECE6D8', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: paginaTarefas <= 1 ? 'not-allowed' : 'pointer' }}
            >
              Anterior
            </button>
            <span style={{ fontSize: '11px', color: 'rgba(236,230,216,0.6)', alignSelf: 'center' }}>
              Página {paginaTarefas} de {Math.max(1, Math.ceil(tarefasFiltradas.length / 20))}
            </span>
            <button
              type="button"
              disabled={paginaTarefas >= Math.ceil(tarefasFiltradas.length / 20)}
              onClick={() => setPaginaTarefas((p) => p + 1)}
              style={{ background: '#1a1a1a', border: '1px solid rgba(199,199,199,0.15)', color: '#ECE6D8', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: paginaTarefas >= Math.ceil(tarefasFiltradas.length / 20) ? 'not-allowed' : 'pointer' }}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
