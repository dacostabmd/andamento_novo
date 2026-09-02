import { useMemo } from 'react';
import { s } from '../style.js';
import { IconTrophy } from './Icons.jsx';
import { identificarPoloDaTarefa } from '../utils/roteamentoEquipes.js';

const CARD = 'background:rgba(255,255,255,0.02);border:1px solid rgba(199,199,199,0.12);border-radius:9px;padding:12px 14px;';
const CARD_LABEL = 'font-size:11px;color:rgba(236,230,216,0.5);';
const CARD_SUB = 'font-size:10px;color:rgba(236,230,216,0.4);margin-top:2px;';

export default function Dashboard({ regras, polos, poloLabels, corPolo, tarefas, onAbrirPolo, onAbrirMetrica }) {
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
    return polos.map((p) => {
      const membrosDoPolo = regras.filter((r) => r.polo === p.codigo);
      const nomesCobradores = new Set(
        membrosDoPolo.map((r) => (r.colaboradorNome || '').toLowerCase().trim()).filter(Boolean)
      );
      const nomesAdvogados = new Set(
        membrosDoPolo.map((r) => (r.advogado || '').toLowerCase().trim()).filter(Boolean)
      );

      // Pessoas que atendem tal polo entram na métrica deste polo com suas tarefas
      const doPolo = tarefas.filter((t) => {
        // 1. Diretamente pelo código do polo
        if (t.poloCobranca === p.codigo) return true;

        // 2. Pelo mapeamento de estado/UF da tarefa para este polo
        const poloIdentificado = identificarPoloDaTarefa(t, regras);
        if (poloIdentificado === p.codigo) return true;

        // 3. Pelas pessoas que atendem este polo (Cobrador ou Advogado)
        const cob = (t.equipeCobrancaColaboradorNome || t.colaboradorNome || t.responsavelNome || '').toLowerCase().trim();
        const adv = (t.equipeCobrancaAdvogado || t.advogado || '').toLowerCase().trim();
        if (cob && nomesCobradores.has(cob)) return true;
        if (adv && nomesAdvogados.has(adv)) return true;

        return false;
      });

      const atrasadas = doPolo.filter((t) => t.situacaoPrazo === 'atrasada').length;
      return {
        codigo: p.codigo,
        total: doPolo.length,
        taxaAtraso: doPolo.length > 0 ? (atrasadas / doPolo.length) * 100 : 0,
        membros: membrosDoPolo.length,
        tarefas: doPolo,
      };
    });
  }, [polos, tarefas, regras]);

  const destaque = useMemo(() => {
    const comTarefas = porPolo.filter((p) => p.total > 0);
    if (comTarefas.length === 0) return null;
    return [...comTarefas].sort((a, b) => a.taxaAtraso - b.taxaAtraso)[0];
  }, [porPolo]);

  const handleClickResumo = (r) => {
    let tarefasFiltradas = [];
    let subtitulo = r.desc;
    if (r.label === 'EM ANDAMENTO') {
      tarefasFiltradas = tarefas.filter((t) => t.situacaoPrazo === 'no_prazo');
    } else if (r.label === 'ATRASADAS') {
      tarefasFiltradas = tarefas.filter((t) => t.situacaoPrazo === 'atrasada');
    } else if (r.label === 'TAXA DE ATRASO') {
      tarefasFiltradas = tarefas.filter((t) => t.situacaoPrazo === 'atrasada');
      subtitulo = `Tarefas com prazo vencido que compõem a taxa (${tarefasFiltradas.length} de ${tarefas.length})`;
    } else if (r.label === 'CONCLUÍDAS') {
      tarefasFiltradas = tarefas.filter((t) => t.situacaoPrazo === 'concluida');
    }

    if (onAbrirMetrica) {
      onAbrirMetrica({
        titulo: `Métrica — ${r.label}`,
        subtitulo,
        tarefas: tarefasFiltradas,
        cor: r.cor,
      });
    }
  };

  const handleClickPolo = (base) => {
    const doPolo = base.tarefas || tarefas.filter((t) => t.poloCobranca === base.codigo);
    if (onAbrirMetrica) {
      onAbrirMetrica({
        titulo: `Tarefas — ${poloLabels[base.codigo] || base.codigo}`,
        subtitulo: `Polo Regional com ${base.membros} membros vinculados (${base.total} tarefas)`,
        tarefas: doPolo,
        cor: corPolo[base.codigo] || '#5b9bdb',
        polo: base.codigo,
      });
    } else if (onAbrirPolo) {
      onAbrirPolo(base.codigo, doPolo);
    }
  };

  return (
    <div style={s('max-width:1360px;animation:fadeSlideIn 0.4s ease both;margin:0 auto;')}>
      <div style={s('margin-bottom:24px;')}>
        <div style={s('font-size:22px;font-weight:700;')}>Painel Geral</div>
        <div style={s('font-size:13px;color:rgba(236,230,216,0.5);margin-top:4px;')}>Métricas consolidadas de todos os polos regionais (clique em qualquer métrica ou polo para detalhar as tarefas)</div>
      </div>

      {/* Cards de Métricas Consolidadas do Topo (Clicáveis) */}
      <div style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:12px;display:flex;margin-bottom:22px;overflow:hidden;')}>
        {resumo.map((r, i) => {
          const pct = r.isPct ? r.n : (tarefas.length > 0 ? (r.n / tarefas.length) * 100 : 0);
          return (
            <div
              key={r.label}
              className="metric-card"
              onClick={() => handleClickResumo(r)}
              title={`Clique para visualizar as tarefas de "${r.label}"`}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '18px 22px',
                borderRight: i < resumo.length - 1 ? '1px solid rgba(199,199,199,0.14)' : 'none',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={s('font-size:24px;font-weight:700;')}>{r.valor}</div>
                <span style={{ fontSize: '10px', color: 'rgba(236,230,216,0.35)', fontWeight: 600 }}>VER TAREFAS ↗</span>
              </div>
              <div style={s('font-size:11px;font-weight:700;letter-spacing:0.03em;margin-top:6px;')}>{r.label}</div>
              <div style={s('font-size:11px;color:rgba(236,230,216,0.45);margin-top:3px;')}>{r.desc}</div>
              <div style={s('height:4px;background:rgba(199,199,199,0.14);border-radius:99px;overflow:hidden;margin-top:12px;')}>
                <div style={{ height: '100%', background: r.cor, borderRadius: '99px', width: pct.toFixed(1) + '%' }} />
              </div>
            </div>
          );
        })}
      </div>

      {destaque && (
        <div
          className="metric-card"
          onClick={() => handleClickPolo(destaque)}
          title={`Clique para visualizar tarefas do polo ${poloLabels[destaque.codigo] || destaque.codigo}`}
          style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-left:4px solid #d9a83b;border-radius:12px;padding:20px 22px;margin-bottom:22px;cursor:pointer;')}
        >
          <div style={s('display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px;')}>
            <div style={s('display:flex;gap:14px;align-items:flex-start;')}>
              <div style={s('width:42px;height:42px;border-radius:12px;background:rgba(217,168,59,0.14);display:flex;align-items:center;justify-content:center;color:#d9a83b;flex-shrink:0;')}>
                <IconTrophy />
              </div>
              <div>
                <div style={s('display:flex;gap:10px;align-items:center;')}>
                  <span style={s('font-size:16px;font-weight:700;')}>Polo Destaque do Período</span>
                  <span style={s('background:#d9a83b;color:#241a04;font-size:10px;font-weight:800;padding:3px 8px;border-radius:5px;letter-spacing:0.03em;')}>MENOR TAXA DE ATRASO</span>
                </div>
                <div style={s('font-size:12.5px;color:rgba(236,230,216,0.5);margin-top:3px;')}>Polo com a menor taxa de atraso entre os que têm tarefas no recorte atual (clique para detalhar).</div>
              </div>
            </div>
            <span style={s('background:rgba(47,111,176,0.18);color:#5b9bdb;border:1px solid rgba(47,111,176,0.4);font-weight:800;font-size:13px;padding:6px 14px;border-radius:999px;')}>{(poloLabels[destaque.codigo] || destaque.codigo).toUpperCase()}</span>
          </div>
          <div style={s('display:grid;grid-template-columns:repeat(3,1fr);gap:14px;')}>
            <div style={s(CARD)}>
              <div style={s(CARD_LABEL)}>Volume de Tarefas</div>
              <div style={s('font-size:20px;font-weight:700;color:#5b9bdb;margin-top:4px;')}>{destaque.total}</div>
              <div style={s(CARD_SUB)}>Tarefas no polo</div>
            </div>
            <div style={s(CARD)}>
              <div style={s(CARD_LABEL)}>Taxa de Atraso</div>
              <div style={s('font-size:20px;font-weight:700;color:#e0796f;margin-top:4px;')}>{destaque.taxaAtraso.toFixed(1)}%</div>
              <div style={s(CARD_SUB)}>Do total de tarefas do polo</div>
            </div>
            <div style={s(CARD)}>
              <div style={s(CARD_LABEL)}>Membros</div>
              <div style={s('font-size:20px;font-weight:700;color:#5fc9a8;margin-top:4px;')}>{destaque.membros}</div>
              <div style={s(CARD_SUB)}>Cobradores/advogados vinculados</div>
            </div>
          </div>
        </div>
      )}

      {/* Grid com os 10 Polos Regionais (Clicáveis) */}
      <div style={s('display:grid;grid-template-columns:repeat(5,1fr);gap:14px;')}>
        {porPolo.map((base) => {
          const cor = corPolo[base.codigo];
          return (
            <div
              key={base.codigo}
              className="polo-card"
              onClick={() => handleClickPolo(base)}
              title={`Clique para visualizar tarefas de ${poloLabels[base.codigo] || base.codigo}`}
              style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:12px;padding:16px;cursor:pointer;transition:transform 0.15s ease, border-color 0.2s ease;display:flex;flex-direction:column;justify-content:space-between;min-height:135px;')}
            >
              <div style={{ marginBottom: '14px' }}>
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
                    <div style={s('font-size:10.5px;color:rgba(236,230,216,0.5);')}>Total de tarefas</div>
                    <div style={s('font-size:17px;font-weight:700;')}>{base.total}</div>
                  </div>
                <div style={s('text-align:right;')}>
                  <div style={s('font-size:10.5px;color:rgba(236,230,216,0.5);')}>Taxa de atraso</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: base.taxaAtraso > 50 ? '#e0796f' : '#5fc9a8' }}>{base.taxaAtraso.toFixed(1)}%</div>
                </div>
              </div>
              <div style={s('height:5px;background:rgba(199,199,199,0.14);border-radius:99px;margin-top:10px;overflow:hidden;')}>
                <div style={{ height: '100%', background: '#5fc9a8', borderRadius: '99px', width: Math.max(4, 100 - base.taxaAtraso) + '%' }} />
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

