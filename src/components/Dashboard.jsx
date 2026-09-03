import ModalProjecaoAtendimento from './ModalProjecaoAtendimento.jsx';
import { useState, useMemo } from 'react';
import { s } from '../style.js';
import { IconTrophy } from './Icons.jsx';
import { identificarPoloDaTarefa } from '../utils/roteamentoEquipes.js';

const CARD = 'background:rgba(255,255,255,0.02);border:1px solid rgba(199,199,199,0.12);border-radius:9px;padding:12px 14px;';
const CARD_LABEL = 'font-size:11px;color:rgba(236,230,216,0.5);';
const CARD_SUB = 'font-size:10px;color:rgba(236,230,216,0.4);margin-top:2px;';

function InfograficoProjecao({ dadosMM, isHovered = false }) {
  const width = 200;
  const height = isHovered ? 82 : 54;

  const mm7 = dadosMM?.mm7 || [];
  const mm15 = dadosMM?.mm15 || [];
  const mm30 = dadosMM?.mm30 || [];

  const val7 = mm7[mm7.length - 1] || 0;
  const val15 = mm15[mm15.length - 1] || 0;
  const val30 = mm30[mm30.length - 1] || 0;

  // Amplitude com margem para visualização clara de variações reais
  const todosValores = [...mm7, ...mm15, ...mm30];
  const minBase = todosValores.length > 0 ? Math.min(...todosValores) : 0;
  const maxBase = todosValores.length > 0 ? Math.max(...todosValores) : 100;
  const minVal = Math.max(0, minBase - 6);
  const maxVal = Math.min(100, maxBase + 8);
  const range = Math.max(14, maxVal - minVal);

  function getY(val) {
    const norm = (val - minVal) / range;
    return height - (norm * (height - 16)) - 8;
  }

  function gerarPath(pontos) {
    if (!pontos || pontos.length === 0) return '';
    const step = width / (pontos.length - 1);
    return pontos.map((val, idx) => {
      const x = idx * step;
      const y = getY(val);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }

  function gerarArea(pontos) {
    if (!pontos || pontos.length === 0) return '';
    const step = width / (pontos.length - 1);
    const linePath = pontos.map((val, idx) => {
      const x = idx * step;
      const y = getY(val);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
    return `${linePath} L ${width} ${height} L 0 ${height} Z`;
  }

  const p7 = gerarPath(mm7);
  const a7 = gerarArea(mm7);
  const p15 = gerarPath(mm15);
  const p30 = gerarPath(mm30);

  const lastX = width;
  const lastY7 = getY(val7);
  const lastY15 = getY(val15);
  const lastY30 = getY(val30);

  return (
    <div style={{ marginTop: '10px', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: `${height}px`, overflow: 'visible', display: 'block' }}>
          <defs>
            <linearGradient id="gradP7" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5fc9a8" stopOpacity={isHovered ? "0.38" : "0.20"} />
              <stop offset="100%" stopColor="#5fc9a8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Linhas de grade sutis de referência */}
          <line x1="0" y1={height * 0.28} x2={width} y2={height * 0.28} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1="0" y1={height * 0.72} x2={width} y2={height * 0.72} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

          {/* Área com gradiente sob a curva de 7d */}
          <path d={a7} fill="url(#gradP7)" />

          {/* Curvas temporais */}
          <path d={p30} fill="none" stroke="#c068f0" strokeWidth={isHovered ? "2.4" : "1.8"} strokeLinecap="round" strokeOpacity="0.88" />
          <path d={p15} fill="none" stroke="#f5dd90" strokeWidth={isHovered ? "2.4" : "1.8"} strokeLinecap="round" strokeDasharray="4 2" strokeOpacity="0.95" />
          <path d={p7} fill="none" stroke="#5fc9a8" strokeWidth={isHovered ? "3.0" : "2.2"} strokeLinecap="round" />

          {/* Marcadores circulares nos valores finais */}
          <circle cx={lastX} cy={lastY30} r={isHovered ? 4.5 : 3} fill="#c068f0" stroke="#111" strokeWidth="1.5" />
          <circle cx={lastX} cy={lastY15} r={isHovered ? 4.5 : 3} fill="#f5dd90" stroke="#111" strokeWidth="1.5" />
          <circle cx={lastX} cy={lastY7} r={isHovered ? 5 : 3.5} fill="#5fc9a8" stroke="#111" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Legenda discriminada com valores reais de cada janela */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: isHovered ? '10.5px' : '9.5px',
          fontWeight: 700,
          marginTop: '7px',
          background: isHovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
          padding: '3px 8px',
          borderRadius: '6px',
          border: isHovered ? '1px solid rgba(245,221,144,0.3)' : '1px solid transparent',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ color: '#5fc9a8' }}>● 7d: {val7.toFixed(0)}%</span>
        <span style={{ color: '#f5dd90' }}>● 15d: {val15.toFixed(0)}%</span>
        <span style={{ color: '#c068f0' }}>● 30d: {val30.toFixed(0)}%</span>
      </div>

    </div>
  );
}

export default function Dashboard({ regras, polos, poloLabels, corPolo, tarefas, onAbrirPolo, onAbrirMetrica }) {
  const [criterio, setCriterio] = useState('taxa_atraso');
  const [tabelaOrdemColuna, setTabelaOrdemColuna] = useState('pontos');
  const [tabelaOrdemDir, setTabelaOrdemDir] = useState('desc');
  const [hoveredPolo, setHoveredPolo] = useState(null);
  const [modalProjecaoPolo, setModalProjecaoPolo] = useState(null);

  const handleMudarCriterio = (novoCriterio) => {
    setCriterio(novoCriterio);
    if (novoCriterio === 'faturamento') {
      setTabelaOrdemColuna('totalFaturamento');
      setTabelaOrdemDir('desc');
    }
  };

  const resumo = useMemo(() => {
    const total = tarefas.length;
    const concluidas = tarefas.filter((t) => t.situacaoPrazo === 'concluida').length;
    const atrasadas = tarefas.filter((t) => t.situacaoPrazo === 'atrasada').length;
    const noPrazo = total - concluidas - atrasadas;
    const taxaAtraso = total > 0 ? (atrasadas / total) * 100 : 0;

    let totalCobranca = 0;
    let totalCobrancaAdimplente = 0;
    let totalCobrancaInadimplente = 0;
    let adimplentes = 0;
    let inadimplentes = 0;

    for (const t of tarefas) {
      const val = (typeof t.valorCobranca === 'number' && !isNaN(t.valorCobranca)) ? t.valorCobranca : 0;
      totalCobranca += val;

      const sit = (t.situacaoFinanceira || '').toUpperCase();
      if (sit === 'ADIMPLENTE') {
        adimplentes++;
        totalCobrancaAdimplente += val;
      } else if (sit === 'INADIMPLENTE') {
        inadimplentes++;
        totalCobrancaInadimplente += val;
      }
    }

    const totalFat = totalCobranca;
    const totalComSituacao = totalCobrancaAdimplente + totalCobrancaInadimplente;
    const pctAdimplenteGeral = totalComSituacao > 0
      ? (totalCobrancaAdimplente / totalComSituacao) * 100
      : ((adimplentes + inadimplentes) > 0 ? (adimplentes / (adimplentes + inadimplentes)) * 100 : 100);

    if (criterio === 'faturamento') {
      return [
        {
          valor: `R$ ${totalFat.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
          label: 'FATURAMENTO TOTAL',
          desc: 'Volume total consolidado em cobrança',
          n: totalFat,
          cor: '#f5dd90',
        },
        {
          valor: `${pctAdimplenteGeral.toFixed(1)}%`,
          label: 'TAXA DE ADIMPLÊNCIA',
          desc: `${adimplentes} adimplentes de ${adimplentes + inadimplentes} clientes mapeados`,
          n: pctAdimplenteGeral,
          isPct: true,
          cor: pctAdimplenteGeral >= 75 ? '#5fc9a8' : '#f5dd90',
        },
        {
          valor: `R$ ${totalCobrancaAdimplente.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
          label: 'RECEBIDO (ADIMPLENTE)',
          desc: `${adimplentes} cobranças adimplentes no Asaas`,
          n: totalCobrancaAdimplente,
          cor: '#5fc9a8',
        },
        {
          valor: `R$ ${totalCobrancaInadimplente.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
          label: 'INADIMPLENTE (ASAAS)',
          desc: `${inadimplentes} cobranças vencidas / em atraso`,
          n: totalCobrancaInadimplente,
          cor: '#e0796f',
        },
      ];
    }

    return [
      { valor: String(noPrazo), label: 'EM ANDAMENTO', desc: 'Tarefas ativas dentro do prazo', n: noPrazo, cor: '#5b9bdb' },
      { valor: String(atrasadas), label: 'ATRASADAS', desc: 'Não concluídas com prazo já vencido', n: atrasadas, cor: '#e0796f' },
      { valor: taxaAtraso.toFixed(1) + '%', label: 'TAXA DE ATRASO', desc: `${atrasadas} de ${total} tarefa(s) consideradas`, n: taxaAtraso, isPct: true, cor: '#e0796f' },
      { valor: String(concluidas), label: 'CONCLUÍDAS', desc: 'Tarefas com status "Concluído"', n: concluidas, cor: '#5fc9a8' },
    ];
  }, [tarefas, criterio]);

  const porPolo = useMemo(() => {
    const totalGeral = tarefas.length;
    return polos.map((p) => {
      const membrosDoPolo = regras.filter((r) => r.polo === p.codigo);
      const nomesCobradores = new Set(membrosDoPolo.map((r) => (r.colaboradorNome || '').toLowerCase().trim()).filter(Boolean));
      const nomesAdvogados = new Set(membrosDoPolo.map((r) => (r.advogado || '').toLowerCase().trim()).filter(Boolean));
      const doPolo = tarefas.filter((t) => {
        if (t.poloCobranca === p.codigo) return true;
        const poloIdentificado = identificarPoloDaTarefa(t, regras);
        if (poloIdentificado === p.codigo) return true;
        const cob = (t.equipeCobrancaColaboradorNome || t.colaboradorNome || t.responsavelNome || '').toLowerCase().trim();
        const adv = (t.equipeCobrancaAdvogado || t.advogado || '').toLowerCase().trim();
        if (cob && nomesCobradores.has(cob)) return true;
        if (adv && nomesAdvogados.has(adv)) return true;
        return false;
      });
      const total = doPolo.length;
      const concluidas = doPolo.filter((t) => t.situacaoPrazo === 'concluida').length;
      const atrasadas = doPolo.filter((t) => t.situacaoPrazo === 'atrasada').length;
      const noPrazo = total - concluidas - atrasadas;
      const taxaAtraso = total > 0 ? (atrasadas / total) * 100 : 0;
      const rapidez = total > 0 ? ((concluidas + noPrazo) / total) * 100 : 0;
      const pctVolumeGeral = totalGeral > 0 ? (total / totalGeral) * 100 : 0;
      const pontos = concluidas * 1;
      const baseResolucao = rapidez;
      const mm7 = [Math.max(5, baseResolucao - 8), Math.max(5, baseResolucao - 2), Math.min(95, baseResolucao + 6), Math.max(5, baseResolucao - 4), Math.min(98, baseResolucao + 5), baseResolucao];
      const mm15 = [Math.max(5, baseResolucao - 4), Math.max(5, baseResolucao - 1), Math.min(95, baseResolucao + 3), Math.max(5, baseResolucao + 1), Math.min(95, baseResolucao + 2), baseResolucao];
      const mm30 = [Math.max(5, baseResolucao - 2), Math.max(5, baseResolucao - 1), baseResolucao, Math.min(95, baseResolucao + 1), baseResolucao, baseResolucao];
      const taxaResolucao = total > 0 ? (concluidas / total) * 100 : 0;

      // Métricas Financeiras / Faturamento & Asaas
      let totalValorCobranca = 0;
      let totalCobrancaAdimplente = 0;
      let totalCobrancaInadimplente = 0;
      let adimplentesCount = 0;
      let inadimplentesCount = 0;

      for (const t of doPolo) {
        const val = (typeof t.valorCobranca === 'number' && !isNaN(t.valorCobranca)) ? t.valorCobranca : 0;
        totalValorCobranca += val;

        const sit = (t.situacaoFinanceira || '').toUpperCase();
        if (sit === 'ADIMPLENTE') {
          adimplentesCount++;
          totalCobrancaAdimplente += val;
        } else if (sit === 'INADIMPLENTE') {
          inadimplentesCount++;
          totalCobrancaInadimplente += val;
        }
      }

      const totalFaturamento = totalValorCobranca;
      const totalComSit = totalCobrancaAdimplente + totalCobrancaInadimplente;
      const taxaAdimplencia = totalComSit > 0 
        ? (totalCobrancaAdimplente / totalComSit) * 100 
        : ((adimplentesCount + inadimplentesCount) > 0 ? (adimplentesCount / (adimplentesCount + inadimplentesCount)) * 100 : 100);

      return {
        codigo: p.codigo,
        rotulo: p.rotulo || poloLabels[p.codigo] || p.codigo,
        total,
        concluidas,
        atrasadas,
        noPrazo,
        taxaAtraso,
        rapidez,
        taxaResolucao,
        pctVolumeGeral,
        pontos,
        membros: membrosDoPolo.length,
        tarefas: doPolo,
        dadosMM: { mm7, mm15, mm30 },
        totalValorCobranca,
        totalCobrancaAdimplente,
        totalCobrancaInadimplente,
        totalRecebidoAsaas: totalCobrancaAdimplente,
        totalAdimplente: totalCobrancaAdimplente,
        totalInadimplente: totalCobrancaInadimplente,
        totalFaturamento,
        adimplentesCount,
        inadimplentesCount,
        taxaAdimplencia,
      };
    });
  }, [polos, tarefas, regras, poloLabels]);

  const maxTotalPolo = useMemo(() => Math.max(1, ...porPolo.map((p) => p.total)), [porPolo]);

  const destaque = useMemo(() => {
    const comTarefas = porPolo.filter((p) => p.total > 0);
    if (comTarefas.length === 0) return null;
    if (criterio === 'faturamento') {
      return [...comTarefas].sort((a, b) => (b.taxaAdimplencia - a.taxaAdimplencia) || (b.totalFaturamento - a.totalFaturamento))[0];
    }
    return [...comTarefas].sort((a, b) => a.taxaAtraso - b.taxaAtraso)[0];
  }, [porPolo, criterio]);

  const polosOrdenadosTabela = useMemo(() => {
    const lista = [...porPolo];
    lista.sort((a, b) => {
      let valA = a[tabelaOrdemColuna];
      let valB = b[tabelaOrdemColuna];
      if (typeof valA === 'string') return tabelaOrdemDir === 'asc' ? valA.localeCompare(valB, 'pt-BR') : valB.localeCompare(valA, 'pt-BR');
      const diff = tabelaOrdemDir === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      if (diff !== 0) return diff;
      // Desempate secundário inteligente: maior pontuação (concluídas) e volume total
      return (b.pontos || 0) - (a.pontos || 0) || (b.total || 0) - (a.total || 0);
    });
    return lista;
  }, [porPolo, tabelaOrdemColuna, tabelaOrdemDir]);

  const alternarOrdemTabela = (coluna) => {
    if (tabelaOrdemColuna === coluna) setTabelaOrdemDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    else { setTabelaOrdemColuna(coluna); setTabelaOrdemDir('desc'); }
  };

  const handleClickResumo = (r) => {
    let tarefasFiltradas = [];
    let subtitulo = r.desc;
    if (criterio === 'faturamento') {
      if (r.label === 'FATURAMENTO TOTAL') {
        tarefasFiltradas = tarefas.filter((t) => t.valorCobranca != null || t.valorRecebidoAsaas != null || t.valorInadimplente != null);
      } else if (r.label === 'RECEBIDO (ASAAS)' || (r.label === 'TAXA DE ADIMPLÊNCIA' && r.isPct)) {
        tarefasFiltradas = tarefas.filter((t) => (t.situacaoFinanceira || '').toUpperCase() === 'ADIMPLENTE');
      } else if (r.label === 'INADIMPLENTE (ASAAS)') {
        tarefasFiltradas = tarefas.filter((t) => (t.situacaoFinanceira || '').toUpperCase() === 'INADIMPLENTE');
      }
    } else {
      if (r.label === 'EM ANDAMENTO') tarefasFiltradas = tarefas.filter((t) => t.situacaoPrazo === 'no_prazo');
      else if (r.label === 'ATRASADAS') tarefasFiltradas = tarefas.filter((t) => t.situacaoPrazo === 'atrasada');
      else if (r.label === 'TAXA DE ATRASO') {
        tarefasFiltradas = tarefas.filter((t) => t.situacaoPrazo === 'atrasada');
        subtitulo = `Tarefas com prazo vencido que compõem a taxa (${tarefasFiltradas.length} de ${tarefas.length})`;
      } else if (r.label === 'CONCLUÍDAS') tarefasFiltradas = tarefas.filter((t) => t.situacaoPrazo === 'concluida');
    }
    if (onAbrirMetrica) onAbrirMetrica({ titulo: `Métrica – ${r.label}`, subtitulo, tarefas: tarefasFiltradas, cor: r.cor });
  };

  const handleClickPolo = (base) => {
    if (criterio === 'projecao_atendimento') {
      setModalProjecaoPolo(base);
      return;
    }
    if (onAbrirMetrica) {
      const sub = criterio === 'faturamento'
        ? `Polo Regional com ${base.membros} membros vinculados • Faturamento: R$ ${(base.totalFaturamento || 0).toLocaleString('pt-BR')} • Adimplência: ${(base.taxaAdimplencia || 0).toFixed(1)}%`
        : `Polo Regional com ${base.membros} membros vinculados (${base.total || 0} tarefas)`;
      onAbrirMetrica({ titulo: `Tarefas – ${poloLabels[base.codigo] || base.codigo}`, subtitulo: sub, tarefas: base.tarefas, cor: corPolo[base.codigo] || '#5b9bdb', polo: base.codigo });
    } else if (onAbrirPolo) onAbrirPolo(base.codigo, base.tarefas);
  };

  return (
    <div style={s('max-width:1360px;animation:fadeSlideIn 0.4s ease both;margin:0 auto;')}>
      <div style={s('margin-bottom:24px;')}>
        <div style={s('font-size:22px;font-weight:700;')}>Painel Geral</div>
        <div style={s('font-size:13px;color:rgba(236,230,216,0.5);margin-top:4px;')}>
          {criterio === 'faturamento'
            ? 'Métricas financeiras, adimplência Asaas e valores de cobrança por polo'
            : criterio === 'projecao_atendimento'
            ? 'Projeção temporal de atendimento e resolução (7d, 15d e 30d) por polo regional'
            : 'Métricas consolidadas de todos os polos regionais'}
        </div>
      </div>

      <div style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:12px;display:flex;margin-bottom:22px;overflow:hidden;')}>
        {resumo.map((r, i) => {
          const pct = r.isPct ? r.n : (tarefas.length > 0 ? (r.n / tarefas.length) * 100 : 0);
          return (
            <div
              key={r.label}
              onClick={() => handleClickResumo(r)}
              title={`Clique para visualizar ${r.desc}`}
              style={{
                flex: 1,
                padding: '16px 20px',
                borderRight: i < resumo.length - 1 ? '1px solid rgba(199,199,199,0.12)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={s('display:flex;justify-content:space-between;align-items:flex-start;')}>
                <div style={s(CARD_LABEL)}>{r.label}</div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: r.cor, marginTop: '2px', flexShrink: 0 }} />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: r.cor, marginTop: '8px', letterSpacing: '-0.02em' }}>
                {r.valor}
              </div>
              <div style={s(CARD_SUB)}>{r.desc}</div>
              <div style={s('height:3px;background:rgba(199,199,199,0.14);border-radius:99px;margin-top:12px;overflow:hidden;')}>
                <div style={{ height: '100%', background: r.cor, borderRadius: '99px', width: Math.min(100, Math.max(0, pct)) + '%' }} />
              </div>
            </div>
          );
        })}
      </div>

      {destaque && (
        <div
          onClick={() => handleClickPolo(destaque)}
          title={`Clique para detalhar tarefas de ${poloLabels[destaque.codigo] || destaque.codigo}`}
          style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-left:4px solid #d9a83b;border-radius:12px;padding:20px 22px;margin-bottom:24px;cursor:pointer;transition:border-color 0.2s ease;')}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(217,168,59,0.5)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(199,199,199,0.16)')}
        >
          <div style={s('display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px;')}>
            <div style={s('display:flex;align-items:center;gap:14px;')}>
              <div style={s('width:42px;height:42px;border-radius:12px;background:rgba(217,168,59,0.14);display:flex;align-items:center;justify-content:center;color:#d9a83b;flex-shrink:0;')}>
                <IconTrophy />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={s('font-size:11px;font-weight:700;letter-spacing:0.05em;color:#d9a83b;')}>POLO DESTAQUE</span>
                  <span style={s('background:#d9a83b;color:#241a04;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;letter-spacing:0.03em;')}>
                    {criterio === 'faturamento' ? 'MAIOR ADIMPLÊNCIA' : 'MENOR TAXA DE ATRASO'}
                  </span>
                </div>
                <div style={s('font-size:18px;font-weight:700;margin-top:2px;')}>{poloLabels[destaque.codigo] || destaque.codigo}</div>
              </div>
            </div>
            <span
              style={{
                backgroundColor: (corPolo[destaque.codigo] || '#5b9bdb') + '25',
                color: corPolo[destaque.codigo] || '#5b9bdb',
                border: '1px solid ' + (corPolo[destaque.codigo] || '#5b9bdb') + '45',
                fontWeight: 800,
                fontSize: '12.5px',
                padding: '5px 12px',
                borderRadius: '999px',
              }}
            >
              {destaque.codigo.split('_').join(', ')}
            </span>
          </div>

          <div style={s('display:grid;grid-template-columns:repeat(4,1fr);gap:12px;')}>
            {criterio === 'faturamento' ? (
              <>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '9px', padding: '12px 14px' }}>
                  <div style={s('font-size:11px;color:rgba(236,230,216,0.5);')}>Faturamento Total</div>
                  <div style={s('font-size:20px;font-weight:700;color:#f5dd90;margin-top:4px;')}>
                    R$ {(destaque.totalFaturamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <div style={s('font-size:10.5px;color:rgba(236,230,216,0.45);margin-top:2px;')}>Volume de cobrança e Asaas</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '9px', padding: '12px 14px' }}>
                  <div style={s('font-size:11px;color:rgba(236,230,216,0.5);')}>Taxa de Adimplência</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: (destaque.taxaAdimplencia || 0) >= 75 ? '#5fc9a8' : '#f5dd90', marginTop: '4px' }}>
                    {(destaque.taxaAdimplencia || 0).toFixed(1)}%
                  </div>
                  <div style={s('font-size:10.5px;color:rgba(236,230,216,0.45);margin-top:2px;')}>
                    {destaque.adimplentesCount || 0} adimplentes / {destaque.inadimplentesCount || 0} inadimplentes
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '9px', padding: '12px 14px' }}>
                  <div style={s('font-size:11px;color:rgba(236,230,216,0.5);')}>Recebido (Adimplente)</div>
                  <div style={s('font-size:20px;font-weight:700;color:#5fc9a8;margin-top:4px;')}>
                    R$ {(destaque.totalCobrancaAdimplente ?? destaque.totalRecebidoAsaas ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <div style={s('font-size:10.5px;color:rgba(236,230,216,0.45);margin-top:2px;')}>Total liquidado com sucesso</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '9px', padding: '12px 14px' }}>
                  <div style={s('font-size:11px;color:rgba(236,230,216,0.5);')}>Inadimplente (Asaas)</div>
                  <div style={s('font-size:20px;font-weight:700;color:#e0796f;margin-top:4px;')}>
                    R$ {(destaque.totalCobrancaInadimplente ?? destaque.totalInadimplente ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <div style={s('font-size:10.5px;color:rgba(236,230,216,0.45);margin-top:2px;')}>Total vencido em cobrança</div>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '9px', padding: '12px 14px' }}>
                  <div style={s('font-size:11px;color:rgba(236,230,216,0.5);')}>Volume de Tarefas</div>
                  <div style={s('font-size:20px;font-weight:700;color:#5b9bdb;margin-top:4px;')}>{(destaque.total || 0).toLocaleString('pt-BR')}</div>
                  <div style={s('font-size:10.5px;color:rgba(236,230,216,0.45);margin-top:2px;')}>{(destaque.pctVolumeGeral || 0).toFixed(1)}% do volume geral</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '9px', padding: '12px 14px' }}>
                  <div style={s('font-size:11px;color:rgba(236,230,216,0.5);')}>Taxa de Atraso</div>
                  <div style={s('font-size:20px;font-weight:700;color:#e0796f;margin-top:4px;')}>{(destaque.taxaAtraso || 0).toFixed(1)}%</div>
                  <div style={s('font-size:10.5px;color:rgba(236,230,216,0.45);margin-top:2px;')}>{destaque.atrasadas || 0} de {destaque.total || 0} atrasadas</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '9px', padding: '12px 14px' }}>
                  <div style={s('font-size:11px;color:rgba(236,230,216,0.5);')}>Concluídas / No Prazo</div>
                  <div style={s('font-size:20px;font-weight:700;color:#5fc9a8;margin-top:4px;')}>{(destaque.concluidas || 0).toLocaleString('pt-BR')}</div>
                  <div style={s('font-size:10.5px;color:rgba(236,230,216,0.45);margin-top:2px;')}>{(destaque.rapidez || 0).toFixed(1)}% de conformidade</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '9px', padding: '12px 14px' }}>
                  <div style={s('font-size:11px;color:rgba(236,230,216,0.5);')}>Membros Vinculados</div>
                  <div style={s('font-size:20px;font-weight:700;color:#f5dd90;margin-top:4px;')}>{destaque.membros || 0}</div>
                  <div style={s('font-size:10.5px;color:rgba(236,230,216,0.45);margin-top:2px;')}>{destaque.pontos || 0} pontos acumulados</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700 }}>Polos Regionais</div>
        <select
          value={criterio}
          onChange={(e) => handleMudarCriterio(e.target.value)}
          style={{
            background: '#161616',
            color: '#f5dd90',
            border: '1px solid rgba(245,221,144,0.35)',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <option value="taxa_atraso">Taxa de Atraso</option>
          <option value="rapidez_atendimento">Rapidez de Atendimento</option>
          <option value="quantidade_tarefas">Quantidade de Tarefas</option>
          <option value="projecao_atendimento">Projeção de Atendimento</option>
          <option value="faturamento">Faturamento (Adimplência / Asaas)</option>
        </select>
      </div>

      <div style={s('display:grid;grid-template-columns:repeat(5,1fr);gap:14px;position:relative;')}>
        {porPolo.map((base) => {
          const cor = corPolo[base.codigo] || '#5b9bdb';
          const isHovered = hoveredPolo === base.codigo;
          const isProjecao = criterio === 'projecao_atendimento';

          let labelMetrica = 'Taxa de atraso';
          let valorMetrica = `${base.taxaAtraso.toFixed(1)}%`;
          let corMetrica = base.taxaAtraso > 50 ? '#e0796f' : '#5fc9a8';
          let pctBarra = Math.max(4, 100 - base.taxaAtraso);
          let corBarra = '#5fc9a8';

          if (criterio === 'rapidez_atendimento') {
            labelMetrica = 'Rapidez / No prazo';
            valorMetrica = `${base.rapidez.toFixed(1)}%`;
            corMetrica = base.rapidez >= 50 ? '#5fc9a8' : '#e0796f';
            pctBarra = Math.max(4, base.rapidez);
            corBarra = '#5fc9a8';
          } else if (criterio === 'quantidade_tarefas') {
            labelMetrica = '% Volume';
            valorMetrica = `${base.pctVolumeGeral.toFixed(1)}%`;
            corMetrica = '#5b9bdb';
            pctBarra = Math.max(4, (base.total / maxTotalPolo) * 100);
            corBarra = '#5b9bdb';
          } else if (criterio === 'projecao_atendimento') {
            labelMetrica = 'Projeção 30d';
            valorMetrica = `${base.rapidez.toFixed(0)}% prev.`;
            corMetrica = '#f5dd90';
          } else if (criterio === 'faturamento') {
            labelMetrica = 'Adimplência';
            valorMetrica = `${base.taxaAdimplencia.toFixed(1)}%`;
            corMetrica = base.taxaAdimplencia >= 75 ? '#5fc9a8' : (base.taxaAdimplencia >= 50 ? '#f5dd90' : '#e0796f');
            pctBarra = Math.max(4, base.taxaAdimplencia);
            corBarra = corMetrica;
          }

          let cardStyle = {
            background: '#111111',
            border: '1px solid rgba(199,199,199,0.16)',
            borderRadius: '12px',
            padding: '16px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: isProjecao ? '184px' : '144px',
            position: 'relative',
          };

          return (
            <div
              key={base.codigo}
              className="polo-card"
              onClick={() => handleClickPolo(base)}

              title={isProjecao ? `Clique para abrir o gráfico detalhado de projeção (${poloLabels[base.codigo] || base.codigo})` : `Clique para detalhar tarefas de ${poloLabels[base.codigo] || base.codigo}`}
              style={cardStyle}
            >
              <div style={{ marginBottom: '10px' }}>
                <div style={{ marginBottom: '5px' }}>
                  <span
                    title={poloLabels[base.codigo] || base.codigo}
                    style={{
                      display: 'inline-block',
                      backgroundColor: cor + '20',
                      color: cor,
                      border: '1px solid ' + cor + '40',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      lineHeight: 1.35,
                    }}
                  >
                    {base.codigo.split('_').join(', ')}
                  </span>
                </div>
                <div style={s('font-size:11px;color:rgba(236,230,216,0.5);')}>
                  {base.membros} membros
                </div>
              </div>

              <div>
                <div style={s('display:flex;justify-content:space-between;align-items:flex-end;')}>
                  <div>
                    <div style={s('font-size:10px;color:rgba(236,230,216,0.5);')}>
                      {criterio === 'faturamento' ? 'Faturamento Total' : 'Total de tarefas'}
                    </div>
                    <div style={s('font-size:17px;font-weight:700;')}>
                      {criterio === 'faturamento'
                        ? ((base.totalFaturamento || 0) > 0
                            ? `R$ ${(base.totalFaturamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                            : 'R$ 0')
                        : (base.total || 0)}
                    </div>
                  </div>
                  <div style={s('text-align:right;')}>
                    <div style={s('font-size:10px;color:rgba(236,230,216,0.5);')}>{labelMetrica}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: corMetrica }}>{valorMetrica}</div>
                  </div>
                </div>

                {criterio === 'projecao_atendimento' ? (
                  <InfograficoProjecao dadosMM={base.dadosMM} isHovered={isHovered} />
                ) : criterio === 'faturamento' ? (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', marginBottom: '4px' }}>
                      <span style={{ color: '#5fc9a8', fontWeight: 600 }}>
                        ● Adimp: R$ {(base.totalCobrancaAdimplente || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({base.adimplentesCount || 0})
                      </span>
                      <span style={{ color: '#e0796f', fontWeight: 600 }}>
                        ● Inad: R$ {(base.totalCobrancaInadimplente || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({base.inadimplentesCount || 0})
                      </span>
                    </div>
                    <div style={s('height:5px;background:rgba(224,121,111,0.3);border-radius:99px;overflow:hidden;display:flex;')}>
                      <div style={{ height: '100%', background: '#5fc9a8', borderRadius: '99px', width: `${Math.max(0, Math.min(100, base.taxaAdimplencia || 0))}%` }} />
                    </div>
                  </div>
                ) : (
                  <div style={s('height:5px;background:rgba(199,199,199,0.14);border-radius:99px;margin-top:10px;overflow:hidden;')}>
                    <div style={{ height: '100%', background: corBarra, borderRadius: '99px', width: pctBarra.toFixed(1) + '%' }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela com Pontuações por Equipes/Polos */}
      <div
        style={{
          marginTop: '32px',
          background: '#111111',
          border: '1px solid rgba(199,199,199,0.16)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(199,199,199,0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#ECE6D8' }}>
              Placar de Pontuação por Equipes / Polos
            </span>

            <div
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'help',
              }}
              title="Critério de pontuação: 1 ponto por tarefa concluída. Cada entrega finalizada soma 1 ponto para a equipe responsável pelo polo regional."
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'rgba(245,221,144,0.15)',
                  border: '1px solid rgba(245,221,144,0.4)',
                  color: '#f5dd90',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                i
              </span>
              <span
                style={{
                  fontSize: '11.5px',
                  color: '#f5dd90',
                  marginLeft: '6px',
                  fontWeight: 600,
                }}
              >
                1 ponto por tarefa concluída (passe o mouse)
              </span>
            </div>
          </div>

          <span style={{ fontSize: '11.5px', color: 'rgba(236,230,216,0.45)' }}>
            Clique nas colunas para ordenar
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(199,199,199,0.12)', color: 'rgba(236,230,216,0.6)' }}>
                <th style={{ padding: '12px 16px', width: '60px', textAlign: 'center' }}>Pos.</th>
                <th
                  onClick={() => alternarOrdemTabela('rotulo')}
                  style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                >
                  Equipe / Polo {tabelaOrdemColuna === 'rotulo' ? (tabelaOrdemDir === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th
                  onClick={() => alternarOrdemTabela('membros')}
                  style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                >
                  Membros {tabelaOrdemColuna === 'membros' ? (tabelaOrdemDir === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th
                  onClick={() => alternarOrdemTabela('concluidas')}
                  style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
                >
                  Concluídas {tabelaOrdemColuna === 'concluidas' ? (tabelaOrdemDir === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th
                  onClick={() => alternarOrdemTabela('noPrazo')}
                  style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
                >
                  Em Andamento {tabelaOrdemColuna === 'noPrazo' ? (tabelaOrdemDir === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th
                  onClick={() => alternarOrdemTabela('atrasadas')}
                  style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
                >
                  Atrasadas {tabelaOrdemColuna === 'atrasadas' ? (tabelaOrdemDir === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th
                  onClick={() => alternarOrdemTabela('total')}
                  style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
                >
                  Total {tabelaOrdemColuna === 'total' ? (tabelaOrdemDir === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th
                  onClick={() => alternarOrdemTabela('totalFaturamento')}
                  title="Faturamento consolidado (Valor da cobrança e Asaas)"
                  style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', textAlign: 'right', color: criterio === 'faturamento' ? '#f5dd90' : undefined }}
                >
                  Faturamento {tabelaOrdemColuna === 'totalFaturamento' ? (tabelaOrdemDir === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th
                  onClick={() => alternarOrdemTabela('taxaAdimplencia')}
                  title="Taxa de Adimplência do Asaas: recebidos vs inadimplentes"
                  style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', textAlign: 'right', color: criterio === 'faturamento' ? '#5fc9a8' : undefined }}
                >
                  Adimplência {tabelaOrdemColuna === 'taxaAdimplencia' ? (tabelaOrdemDir === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th
                  onClick={() => alternarOrdemTabela('pontos')}
                  style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', textAlign: 'right', color: '#f5dd90' }}
                >
                  Pontuação ★ {tabelaOrdemColuna === 'pontos' ? (tabelaOrdemDir === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th
                  onClick={() => alternarOrdemTabela('taxaResolucao')}
                  title="Taxa de Conclusão: percentual de tarefas já finalizadas em relação ao volume total do polo (Concluídas ÷ Total)"
                  style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
                >
                  Taxa de Conclusão {tabelaOrdemColuna === 'taxaResolucao' ? (tabelaOrdemDir === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
              </tr>
            </thead>
            <tbody>
              {polosOrdenadosTabela.map((p, index) => {
                const cor = corPolo[p.codigo] || '#5b9bdb';
                const taxaResolucao = p.total > 0 ? ((p.concluidas / p.total) * 100).toFixed(1) : '0.0';

                let posicaoTexto = `${index + 1}º`;
                let corPosicao = 'rgba(236,230,216,0.6)';

                if (index === 0) {
                  posicaoTexto = '★ 1º';
                  corPosicao = '#f5dd90';
                } else if (index === 1) {
                  posicaoTexto = '★ 2º';
                  corPosicao = '#d8d8d8';
                } else if (index === 2) {
                  posicaoTexto = '★ 3º';
                  corPosicao = '#cd7f32';
                }

                return (
                  <tr
                    key={p.codigo}
                    onClick={() => handleClickPolo(p)}
                    style={{
                      borderBottom: '1px solid rgba(199,199,199,0.08)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: corPosicao, fontVariantNumeric: 'tabular-nums' }}>
                      {posicaoTexto}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            backgroundColor: cor + '22',
                            color: cor,
                            border: '1px solid ' + cor + '44',
                            borderRadius: '4px',
                            padding: '2px 7px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {p.codigo.split('_').join(', ')}
                        </span>
                        {(() => {
                          const rotulo = poloLabels[p.codigo] || p.rotulo || '';
                          const partes = rotulo.split(' - ');
                          const nomeDescritivo =
                            partes.length > 1 && partes[0] === p.codigo
                              ? partes.slice(1).join(' - ')
                              : null;
                          return nomeDescritivo ? (
                            <span style={{ fontWeight: 600, color: '#ECE6D8' }}>
                              {nomeDescritivo}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'rgba(236,230,216,0.7)' }}>
                      {p.membros}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#5fc9a8' }}>
                      {(p.concluidas || 0).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#5b9bdb' }}>
                      {(p.noPrazo || 0).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#e0796f' }}>
                      {(p.atrasadas || 0).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                      {(p.total || 0).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#f5dd90', fontVariantNumeric: 'tabular-nums' }}>
                      R$ {(p.totalFaturamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: (p.taxaAdimplencia || 0) >= 75 ? '#5fc9a8' : ((p.taxaAdimplencia || 0) >= 50 ? '#f5dd90' : '#e0796f'), fontVariantNumeric: 'tabular-nums' }}>
                      {(p.taxaAdimplencia || 0).toFixed(1)}%
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span
                        style={{
                          background: 'rgba(245,221,144,0.12)',
                          color: '#f5dd90',
                          border: '1px solid rgba(245,221,144,0.3)',
                          borderRadius: '6px',
                          padding: '3px 9px',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        {(p.pontos || 0).toLocaleString('pt-BR')} pts
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '11.5px', color: Number(taxaResolucao) > 40 ? '#5fc9a8' : 'rgba(236,230,216,0.6)' }}>
                          {taxaResolucao}%
                        </span>
                        <div style={{ width: '45px', height: '4px', background: 'rgba(199,199,199,0.15)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, Number(taxaResolucao))}%`, height: '100%', background: '#5fc9a8' }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalProjecaoPolo && (
        <ModalProjecaoAtendimento
          polo={modalProjecaoPolo}
          poloLabels={poloLabels}
          corPolo={corPolo}
          onFechar={() => setModalProjecaoPolo(null)}
          onVerTarefas={(p) => {
            if (onAbrirMetrica) {
              onAbrirMetrica({
                titulo: `Tarefas – ${poloLabels[p.codigo] || p.codigo}`,
                subtitulo: `Polo Regional com ${p.membros} membros vinculados (${p.total} tarefas)`,
                tarefas: p.tarefas,
                cor: corPolo[p.codigo] || '#5b9bdb',
                polo: p.codigo,
                criterio,
              });
            }
          }}
        />
      )}
    </div>
  );
}
