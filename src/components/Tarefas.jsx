import React, { useState, useMemo } from 'react';
import { s } from '../style.js';
import { IconFilter, IconExternal } from './Icons.jsx';
import { COR_STATUS, STATUS_LABEL, BTN_PAG, BTN_PAG_OFF } from '../data.js';

const TH = 'text-align:left;padding:12px 16px;font-weight:700;font-size:11.5px;color:rgba(236,230,216,0.6);border-bottom:1px solid rgba(199,199,199,0.16);';
const LABEL = 'font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:rgba(236,230,216,0.5);display:block;margin-bottom:6px;';
const FIELD = 'width:100%;background:#161616;border:1px solid rgba(199,199,199,0.25);border-radius:8px;padding:10px 12px;color:#ECE6D8;font-family:inherit;font-size:13px;';
const PAGE_SIZE = 20;

function formatarPrazo(prazoFinal) {
  if (!prazoFinal) return '—';
  const data = new Date(prazoFinal);
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR');
}

const COLUNAS_TABELA = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'polo', label: 'Polo' },
  { key: 'cobrador', label: 'Cobrador' },
  { key: 'advogado', label: 'Advogado' },
  { key: 'criterio', label: 'Critério' },
  { key: 'status', label: 'Status' },
  { key: 'prazo', label: 'Prazo' },
];

export default function Tarefas({
  tarefas,
  poloLabels,
  corPolo,
  filtros,
  setFiltros,
  pagina,
  setPagina,
  onAbrirBitrix,
  advogados,
}) {
  const [colunaOrdem, setColunaOrdem] = useState('prazo');
  const [direcaoOrdem, setDirecaoOrdem] = useState('asc'); // 'asc' | 'desc'

  const patch = (p) => {
    setFiltros({ ...filtros, ...p });
    setPagina(1);
  };

  const alternarOrdem = (colKey) => {
    if (colunaOrdem === colKey) {
      setDirecaoOrdem((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setColunaOrdem(colKey);
      setDirecaoOrdem('asc');
    }
  };

  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (filtros.advogado !== 'todos' && t.equipeCobrancaAdvogado !== filtros.advogado) return false;
      if (filtros.escalao48h === 'ate_48h' && t.emEscalao48h) return false;
      if (filtros.escalao48h === 'mais_48h' && !t.emEscalao48h) return false;
      if (filtros.digitoCpf !== 'todos' && String(t.digitoCpfCliente) !== filtros.digitoCpf) return false;
      if (filtros.apenasConcluidas && t.situacaoPrazo !== 'concluida') return false;
      if (filtros.buscaTexto.trim()) {
        const alvo = [
          t.clienteNome || '',
          t.titulo || '',
          t.equipeCobrancaColaboradorNome || '',
          String(t.digitoCpfCliente ?? ''),
          t.equipeCobrancaAdvogado || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!alvo.includes(filtros.buscaTexto.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [tarefas, filtros]);

  const ordenadas = useMemo(() => {
    return [...filtradas].sort((a, b) => {
      let vA, vB;
      switch (colunaOrdem) {
        case 'cliente':
          vA = (a.clienteNome || a.titulo || '').toLowerCase();
          vB = (b.clienteNome || b.titulo || '').toLowerCase();
          return direcaoOrdem === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
        case 'polo':
          vA = (poloLabels[a.poloCobranca] || a.poloCobranca || '').toLowerCase();
          vB = (poloLabels[b.poloCobranca] || b.poloCobranca || '').toLowerCase();
          return direcaoOrdem === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
        case 'cobrador':
          vA = (a.equipeCobrancaColaboradorNome || '').toLowerCase();
          vB = (b.equipeCobrancaColaboradorNome || '').toLowerCase();
          return direcaoOrdem === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
        case 'advogado':
          vA = (a.equipeCobrancaAdvogado || '').toLowerCase();
          vB = (b.equipeCobrancaAdvogado || '').toLowerCase();
          return direcaoOrdem === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
        case 'criterio':
          vA = a.emEscalao48h ? 99 : (a.digitoCpfCliente ?? -1);
          vB = b.emEscalao48h ? 99 : (b.digitoCpfCliente ?? -1);
          return direcaoOrdem === 'asc' ? vA - vB : vB - vA;
        case 'status': {
          const pesos = { atrasada: 3, no_prazo: 2, concluida: 1 };
          vA = pesos[a.situacaoPrazo] || 0;
          vB = pesos[b.situacaoPrazo] || 0;
          return direcaoOrdem === 'asc' ? vB - vA : vA - vB;
        }
        case 'prazo':
        default: {
          const tA = a.prazoFinal ? new Date(a.prazoFinal).getTime() : 0;
          const tB = b.prazoFinal ? new Date(b.prazoFinal).getTime() : 0;
          return direcaoOrdem === 'asc' ? tA - tB : tB - tA;
        }
      }
    });
  }, [filtradas, colunaOrdem, direcaoOrdem, poloLabels]);

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / PAGE_SIZE));
  const atual = Math.min(pagina, totalPaginas);
  const lista = ordenadas.slice((atual - 1) * PAGE_SIZE, (atual - 1) * PAGE_SIZE + PAGE_SIZE);

  return (
    <div style={s('max-width:1360px;animation:fadeSlideIn 0.4s ease both;margin:0 auto;')}>
      <div style={s('margin-bottom:20px;')}>
        <div style={s('font-size:22px;font-weight:700;')}>Andamento Processual</div>
        <div style={s('font-size:13px;color:rgba(236,230,216,0.5);margin-top:4px;')}>
          Lista de tarefas por cliente, roteada automaticamente pelo dígito final do CPF/CNPJ.
        </div>
      </div>

      <div style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:12px;padding:18px;margin-bottom:18px;')}>
        <div style={s('display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px;')}>
          <div>
            <label style={s(LABEL)}>Advogado Responsável</label>
            <select value={filtros.advogado} onChange={(e) => patch({ advogado: e.target.value })} style={s(FIELD)}>
              <option value="todos">Todos os advogados</option>
              {advogados.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={s(LABEL)}>Escalão 48 Horas</label>
            <select value={filtros.escalao48h} onChange={(e) => patch({ escalao48h: e.target.value })} style={s(FIELD)}>
              <option value="todos">Todas as tarefas</option>
              <option value="ate_48h">1º Nível (roteamento por CPF)</option>
              <option value="mais_48h">Escalão 48h</option>
            </select>
          </div>
          <div>
            <label style={s(LABEL)}>Dígito Final do CPF</label>
            <select value={filtros.digitoCpf} onChange={(e) => patch({ digitoCpf: e.target.value })} style={s(FIELD)}>
              <option value="todos">Todos os dígitos</option>
              {Array.from({ length: 10 }, (_, d) => (
                <option key={d} value={String(d)}>
                  CPF Final {d}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={s('margin-bottom:14px;')}>
          <label style={s(LABEL)}>Tarefa (individual por nome, CPF ou data)</label>
          <input
            type="text"
            placeholder="Digite para buscar por nome da tarefa, CPF, ID ou data..."
            value={filtros.buscaTexto}
            onChange={(e) => patch({ buscaTexto: e.target.value })}
            style={s(FIELD)}
          />
        </div>
        <div style={s('display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;')}>
          <label style={s('display:flex;align-items:center;gap:8px;font-size:12.5px;color:rgba(236,230,216,0.75);cursor:pointer;')}>
            <input
              type="checkbox"
              checked={filtros.apenasConcluidas}
              onChange={() => patch({ apenasConcluidas: !filtros.apenasConcluidas })}
              style={s('width:16px;height:16px;accent-color:#846419;')}
            />
            Filtrar apenas concluídas
          </label>
          <button
            className="btn-ghost"
            onClick={() => {
              setFiltros({ advogado: 'todos', escalao48h: 'todos', digitoCpf: 'todos', buscaTexto: '', apenasConcluidas: false });
              setPagina(1);
            }}
            style={s(
              'display:flex;align-items:center;gap:8px;background:transparent;color:rgba(236,230,216,0.65);border:1px solid rgba(199,199,199,0.3);border-radius:8px;padding:9px 16px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;'
            )}
          >
            <IconFilter />
            Limpar filtros
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={s('font-size:11.5px;color:rgba(236,230,216,0.4);')}>
          Mostrando {filtradas.length} de {tarefas.length} tarefas (ordenadas por {COLUNAS_TABELA.find((c) => c.key === colunaOrdem)?.label} {direcaoOrdem === 'asc' ? '▲' : '▼'})
        </div>
      </div>

      <div style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:12px;overflow:hidden;')}>
        <table style={s('width:100%;border-collapse:collapse;font-size:13px;')}>
          <thead>
            <tr style={s('background:rgba(255,255,255,0.03);')}>
              {COLUNAS_TABELA.map((col) => {
                const ativo = colunaOrdem === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => alternarOrdem(col.key)}
                    title={`Clique para ordenar por ${col.label} (${ativo && direcaoOrdem === 'asc' ? 'Decrescente' : 'Crescente'})`}
                    style={{
                      ...s(TH),
                      cursor: 'pointer',
                      userSelect: 'none',
                      color: ativo ? '#f5dd90' : 'rgba(236,230,216,0.65)',
                      background: ativo ? 'rgba(245,221,144,0.05)' : 'transparent',
                      transition: 'color 0.15s, background 0.15s',
                    }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span>{col.label}</span>
                      <span style={{ fontSize: '10px', color: ativo ? '#f5dd90' : 'rgba(236,230,216,0.25)' }}>
                        {ativo ? (direcaoOrdem === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </div>
                  </th>
                );
              })}
              <th style={{ ...s(TH), textAlign: 'center' }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'rgba(236,230,216,0.45)' }}>
                  Nenhuma tarefa encontrada com os filtros selecionados.
                </td>
              </tr>
            ) : (
              lista.map((t) => {
                const corPoloAtual = t.poloCobranca ? corPolo[t.poloCobranca] : '#718096';
                const corStatus = COR_STATUS[t.situacaoPrazo];
                return (
                  <tr
                    key={t.id}
                    className="task-row"
                    onClick={() => onAbrirBitrix(t)}
                    style={s('border-bottom:1px solid rgba(199,199,199,0.08);cursor:pointer;')}
                  >
                    <td style={s('padding:10px 16px;font-weight:600;')}>{t.clienteNome || t.titulo}</td>
                    <td style={s('padding:10px 16px;')}>
                      <span
                        style={{
                          backgroundColor: corPoloAtual + '20',
                          color: corPoloAtual,
                          border: '1px solid ' + corPoloAtual + '40',
                          borderRadius: '6px',
                          padding: '3px 9px',
                          fontSize: '11px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.poloCobranca ? poloLabels[t.poloCobranca] : 'Sem vínculo'}
                      </span>
                    </td>
                    <td style={s('padding:10px 16px;font-weight:600;')}>{t.equipeCobrancaColaboradorNome || '—'}</td>
                    <td style={s('padding:10px 16px;color:rgba(236,230,216,0.85);')}>{t.equipeCobrancaAdvogado || 'Sem advogado'}</td>
                    <td style={s('padding:10px 16px;font-size:11.5px;color:rgba(236,230,216,0.55);')}>
                      {t.emEscalao48h ? '48 HORAS' : t.digitoCpfCliente != null ? 'CPF final ' + t.digitoCpfCliente : '—'}
                    </td>
                    <td style={s('padding:10px 16px;')}>
                      <span
                        style={{
                          backgroundColor: corStatus + '22',
                          color: corStatus,
                          border: '1px solid ' + corStatus + '44',
                          borderRadius: '999px',
                          padding: '3px 11px',
                          fontSize: '11px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {STATUS_LABEL[t.situacaoPrazo]}
                      </span>
                    </td>
                    <td style={s('padding:10px 16px;color:rgba(236,230,216,0.55);font-size:12px;')}>{formatarPrazo(t.prazoFinal)}</td>
                    <td style={s('padding:10px 16px;text-align:center;')}>
                      <button
                        className="icon-btn"
                        title="Abrir no Bitrix24"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAbrirBitrix(t);
                        }}
                        style={s(
                          'background:transparent;border:1px solid rgba(199,199,199,0.25);color:rgba(236,230,216,0.6);border-radius:6px;padding:6px;cursor:pointer;display:inline-flex;'
                        )}
                      >
                        <IconExternal />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div style={s('display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-top:1px solid rgba(199,199,199,0.12);')}>
          <span style={s('font-size:11.5px;color:rgba(236,230,216,0.45);')}>
            Página {atual} de {totalPaginas}
          </span>
          <div style={s('display:flex;gap:8px;')}>
            <button onClick={() => setPagina(Math.max(1, atual - 1))} style={atual <= 1 ? BTN_PAG_OFF : BTN_PAG}>
              Anterior
            </button>
            <button onClick={() => setPagina(Math.min(totalPaginas, atual + 1))} style={atual >= totalPaginas ? BTN_PAG_OFF : BTN_PAG}>
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
