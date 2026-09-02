import { useState, useMemo } from 'react';
import { s } from '../style.js';
import { IconTrophy } from './Icons.jsx';
import { identificarPoloDaTarefa } from '../utils/roteamentoEquipes.js';

const CARD = 'background:rgba(255,255,255,0.02);border:1px solid rgba(199,199,199,0.12);border-radius:9px;padding:12px 14px;';
const CARD_LABEL = 'font-size:11px;color:rgba(236,230,216,0.5);';
const CARD_SUB = 'font-size:10px;color:rgba(236,230,216,0.4);margin-top:2px;';

function InfograficoProjecao({ dadosMM }) {
  const width = 160;
  const height = 30;
  function gerarPath(pontos) {
    if (!pontos || pontos.length === 0) return '';
    const step = width / (pontos.length - 1);
    return pontos.map((val, idx) => {
      const x = idx * step;
      const y = height - (Math.max(8, Math.min(92, val)) / 100) * (height - 6) - 3;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }
  const p7 = gerarPath(dadosMM.mm7);
  const p15 = gerarPath(dadosMM.mm15);
  const p30 = gerarPath(dadosMM.mm30);
  return (
    <div style={{ marginTop: '8px' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '30px', overflow: 'visible', display: 'block' }}>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 2" />
        <path d={p30} fill="none" stroke="#a44fc0" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.85" />
        <path d={p15} fill="none" stroke="#f5dd90" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.95" />
        <path d={p7} fill="none" stroke="#5fc9a8" strokeWidth="2.0" strokeLinecap="round" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 600, marginTop: '3px' }}>
        <span style={{ color: '#5fc9a8' }}>● 7d</span>
        <span style={{ color: '#f5dd90' }}>● 15d</span>
        <span style={{ color: '#a44fc0' }}>● 30d</span>
      </div>
    </div>
  );
}

export default function Dashboard({ regras, polos, poloLabels, corPolo, tarefas, onAbrirPolo, onAbrirMetrica }) {
  const [criterio, setCriterio] = useState('taxa_atraso');
  const [tabelaOrdemColuna, setTabelaOrdemColuna] = useState('pontos');
  const [tabelaOrdemDir, setTabelaOrdemDir] = useState('desc');

  const resumo = useMemo(() => {
    const total = tarefas.length;
    const concluidas = tarefas.filter((t) => t.situacaoPrazo === 'concluida').length;
    const atrasadas = tarefas.filter((t) => t.situacaoPrazo === 'atrasada').length;
    const noPrazo = total - concluidas - atrasadas;
    const taxaAtraso = total > 0 ? (atrasadas / total) * 100 : 0;
    return [
      { valor: String(noPrazo), label: 'EM ANDAMENTO', desc: 'Tarefas ativas dentro do prazo', n: noPrazo, cor: '#5b9bdb' },
      { valor: String(atrasadas), label: 'ATRASADAS', desc: 'Não concluídas com prazo já vencido', n: atrasadas, cor: '#e0796f' },
      { valor: taxaAtraso.toFixed(1) + '%', label: 'TAXA DE ATRASO', desc: `${atrasadas} de ${total} tarefa(s) consideradas`, n: taxaAtraso, isPct: true, cor: '#e0796f' },
      { valor: String(concluidas), label: 'CONCLUÍDAS', desc: 'Tarefas com status "Concluído"', n: concluidas, cor: '#5fc9a8' },
    ];
  }, [tarefas]);

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
      const taxaResolucao = total > 0 ? (concluidas / total) * 100 : 0;
      return { codigo: p.codigo, rotulo: p.rotulo || poloLabels[p.codigo] || p.codigo, total, concluidas, atrasadas, noPrazo, taxaAtraso, rapidez, taxaResolucao, pctVolumeGeral, pontos, membros: membrosDoPolo.length, tarefas: doPolo, dadosMM: { mm7, mm15, mm30 } };
    });
  }, [polos, tarefas, regras, poloLabels]);

  const maxTotalPolo = useMemo(() => Math.max(1, ...porPolo.map((p) => p.total)), [porPolo]);
  const destaque = useMemo(() => {
    const comTarefas = porPolo.filter((p) => p.total > 0);
    if (comTarefas.length === 0) return null;
    return [...comTarefas].sort((a, b) => a.taxaAtraso - b.taxaAtraso)[0];
  }, [porPolo]);

  const polosOrdenadosTabela = useMemo(() => {
    const lista = [...porPolo];
    lista.sort((a, b) => {
      let valA = a[tabelaOrdemColuna];
      let valB = b[tabelaOrdemColuna];
      if (typeof valA === 'string') return tabelaOrdemDir === 'asc' ? valA.localeCompare(valB, 'pt-BR') : valB.localeCompare(valA, 'pt-BR');
      return tabelaOrdemDir === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
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
    if (r.label === 'EM ANDAMENTO') tarefasFiltradas = tarefas.filter((t) => t.situacaoPrazo === 'no_prazo');
    else if (r.label === 'ATRASADAS') tarefasFiltradas = tarefas.filter((t) => t.situacaoPrazo === 'atrasada');
    else if (r.label === 'TAXA DE ATRASO') {
      tarefasFiltradas = tarefas.filter((t) => t.situacaoPrazo === 'atrasada');
      subtitulo = `Tarefas com prazo vencido que compõem a taxa (${tarefasFiltradas.length} de ${tarefas.length})`;
    } else if (r.label === 'CONCLUÍDAS') tarefasFiltradas = tarefas.filter((t) => t.situacaoPrazo === 'concluida');
    if (onAbrirMetrica) onAbrirMetrica({ titulo: `Métrica — ${r.label}`, subtitulo, tarefas: tarefasFiltradas, cor: r.cor });
  };

  const handleClickPolo = (base) => {
    if (onAbrirMetrica) {
      onAbrirMetrica({ titulo: `Tarefas — ${poloLabels[base.codigo] || base.codigo}`, subtitulo: `Polo Regional com ${base.membros} membros vinculados (${base.total} tarefas)`, tarefas: base.tarefas, cor: corPolo[base.codigo] || '#5b9bdb', polo: base.codigo });
    } else if (onAbrirPolo) onAbrirPolo(base.codigo, base.tarefas);
  };

  return (
    <div style={s('max-width:1360px;animation:fadeSlideIn 0.4s ease both;margin:0 auto;')}>
      <div style={s('margin-bottom:24px;')}>
        <div style={s('font-size:22px;font-weight:700;')}>Painel Geral</div>
        <div style={s('font-size:13px;color:rgba(236,230,216,0.5);margin-top:4px;')}>Métricas consolidadas de todos os polos regionais</div>
      </div>
      <div style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:12px;display:flex;margin-bottom:22px;overflow:hidden;')}>
        {resumo.map((r, i) => {
          const pct = r.isPct ? r.n : (tarefas.length > 0 ? (r.n / tarefas.length) * 100 : 0);
          return (
            <div
              key={r.label}
              onClick={() => handleClickResumo(r)}
              title={`Clique para detalhar tarefas de "${r.label}"`}
              style={{
                flex: 1,
                padding: '18px 22px',
                borderRight: i < resumo.length - 1 ? '1px solid rgba(199,199,199,0.14)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={s('font-size:24px;font-weight:700;')}>{Number(r.valor) ? Number(r.valor).toLocaleString('pt-BR') : r.valor}</div>
                {!r.isPct && (
                  <span style={{ fontSize: '13px', fontWeight: 700, color: r.cor }}>
                    {pct.toFixed(1)}%
                  </span>
                )}
              </div>
              <div style={s('font-size:11px;font-weight:700;letter-spacing:0.03em;margin-top:6px;')}>{r.label}</div>
              <div style={s('font-size:11px;color:rgba(236,230,216,0.45);margin-top:3px;')}>{r.desc}</div>
              <div style={s('height:4px;background:rgba(199,199,199,0.14);border-radius:99px;margin-top:10px;overflow:hidden;')}>
                <div style={{ height: '100%', background: r.cor, borderRadius: '99px', width: pct.toFixed(1) + '%' }} />
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
                  <span style={s('background:#d9a83b;color:#241a04;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;letter-spacing:0.03em;')}>MENOR TAXA DE ATRASO</span>
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
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '9px', padding: '12px 14px' }}>
              <div style={s('font-size:11px;color:rgba(236,230,216,0.5);')}>Volume de Tarefas</div>
              <div style={s('font-size:20px;font-weight:700;color:#5b9bdb;margin-top:4px;')}>{destaque.total.toLocaleString('pt-BR')}</div>
              <div style={s('font-size:10.5px;color:rgba(236,230,216,0.45);margin-top:2px;')}>{destaque.pctVolumeGeral.toFixed(1)}% do volume geral</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '9px', padding: '12px 14px' }}>
              <div style={s('font-size:11px;color:rgba(236,230,216,0.5);')}>Taxa de Atraso</div>
              <div style={s('font-size:20px;font-weight:700;color:#e0796f;margin-top:4px;')}>{destaque.taxaAtraso.toFixed(1)}%</div>
              <div style={s('font-size:10.5px;color:rgba(236,230,216,0.45);margin-top:2px;')}>{destaque.atrasadas} de {destaque.total} atrasadas</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '9px', padding: '12px 14px' }}>
              <div style={s('font-size:11px;color:rgba(236,230,216,0.5);')}>Concluídas / No Prazo</div>
              <div style={s('font-size:20px;font-weight:700;color:#5fc9a8;margin-top:4px;')}>{destaque.concluidas.toLocaleString('pt-BR')}</div>
              <div style={s('font-size:10.5px;color:rgba(236,230,216,0.45);margin-top:2px;')}>{destaque.rapidez.toFixed(1)}% de conformidade</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(199,199,199,0.12)', borderRadius: '9px', padding: '12px 14px' }}>
              <div style={s('font-size:11px;color:rgba(236,230,216,0.5);')}>Membros Vinculados</div>
              <div style={s('font-size:20px;font-weight:700;color:#f5dd90;margin-top:4px;')}>{destaque.membros}</div>
              <div style={s('font-size:10.5px;color:rgba(236,230,216,0.45);margin-top:2px;')}>{destaque.pontos} pontos acumulados</div>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700 }}>Polos Regionais</div>
        <select value={criterio} onChange={(e) => setCriterio(e.target.value)} style={{ background: '#161616', color: '#f5dd90', border: '1px solid rgba(245,221,144,0.35)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
          <option value="taxa_atraso">Taxa de Atraso</option>
          <option value="rapidez_atendimento">Rapidez de Atendimento</option>
          <option value="quantidade_tarefas">Quantidade de Tarefas</option>
          <option value="projecao_atendimento">Projeção de Atendimento</option>
        </select>
      </div>
      <div style={s('display:grid;grid-template-columns:repeat(5,1fr);gap:14px;')}>
        {porPolo.map((base) => {
          const cor = corPolo[base.codigo] || '#5b9bdb';
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
          }

          return (
            <div
              key={base.codigo}
              className="polo-card"
              onClick={() => handleClickPolo(base)}
              title={`Clique para detalhar tarefas de ${poloLabels[base.codigo] || base.codigo}`}
              style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:12px;padding:16px;cursor:pointer;transition:transform 0.15s ease, border-color 0.2s ease;display:flex;flex-direction:column;justify-content:space-between;min-height:144px;')}
            >
              <div style={{ marginBottom: '12px' }}>
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
                    <div style={s('font-size:10px;color:rgba(236,230,216,0.5);')}>Total de tarefas</div>
                    <div style={s('font-size:17px;font-weight:700;')}>{base.total}</div>
                  </div>
                  <div style={s('text-align:right;')}>
                    <div style={s('font-size:10px;color:rgba(236,230,216,0.5);')}>{labelMetrica}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: corMetrica }}>{valorMetrica}</div>
                  </div>
                </div>

                {criterio === 'projecao_atendimento' ? (
                  <InfograficoProjecao dadosMM={base.dadosMM} />
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

      {/* Tabela com Pontuações por Equipes/Polos (1 ponto por tarefa concluída) */}
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

            {/* Tooltip com a regra discriminada de 1 ponto por tarefa concluída */}
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
                      {p.concluidas.toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#5b9bdb' }}>
                      {p.noPrazo.toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#e0796f' }}>
                      {p.atrasadas.toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                      {p.total.toLocaleString('pt-BR')}
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
                        {p.pontos.toLocaleString('pt-BR')} pts
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
    </div>
  );
}
