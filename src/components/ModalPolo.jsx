import React, { useState, useEffect, useMemo } from 'react';
import { s } from '../style.js';
import { IconX } from './Icons.jsx';
import { COR_STATUS, STATUS_LABEL, BTN_PAG, BTN_PAG_OFF } from '../data.js';

const TH = 'text-align:left;padding:8px 10px;font-size:11px;color:rgba(236,230,216,0.6);border-bottom:1px solid rgba(199,199,199,0.14);';
const PAGE_SIZE = 20;

function formatarPrazo(prazoFinal) {
  if (!prazoFinal) return '—';
  const data = new Date(prazoFinal);
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR');
}

const COLUNAS_POLO = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'cobrador', label: 'Cobrador' },
  { key: 'advogado', label: 'Advogado' },
  { key: 'status', label: 'Status' },
  { key: 'prazo', label: 'Prazo' },
];

export default function ModalPolo({ polo, poloLabels, tarefas, onAbrirBitrix, onFechar }) {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [colunaOrdem, setColunaOrdem] = useState('prazo');
  const [direcaoOrdem, setDirecaoOrdem] = useState('asc'); // 'asc' | 'desc'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onFechar();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onFechar]);

  const alternarOrdem = (colKey) => {
    if (colunaOrdem === colKey) {
      setDirecaoOrdem((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setColunaOrdem(colKey);
      setDirecaoOrdem('asc');
    }
  };

  const buscaNorm = busca.trim().toLowerCase();
  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (t.poloCobranca !== polo) return false;
      if (status !== 'todos' && t.situacaoPrazo !== status) return false;
      if (buscaNorm) {
        const alvo = [t.clienteNome || '', t.equipeCobrancaColaboradorNome || '', t.equipeCobrancaAdvogado || '']
          .join(' ')
          .toLowerCase();
        if (!alvo.includes(buscaNorm)) return false;
      }
      return true;
    });
  }, [tarefas, polo, status, buscaNorm]);

  const ordenadas = useMemo(() => {
    return [...filtradas].sort((a, b) => {
      let vA, vB;
      switch (colunaOrdem) {
        case 'cliente':
          vA = (a.clienteNome || a.titulo || '').toLowerCase();
          vB = (b.clienteNome || b.titulo || '').toLowerCase();
          return direcaoOrdem === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
        case 'cobrador':
          vA = (a.equipeCobrancaColaboradorNome || '').toLowerCase();
          vB = (b.equipeCobrancaColaboradorNome || '').toLowerCase();
          return direcaoOrdem === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
        case 'advogado':
          vA = (a.equipeCobrancaAdvogado || '').toLowerCase();
          vB = (b.equipeCobrancaAdvogado || '').toLowerCase();
          return direcaoOrdem === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
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
  }, [filtradas, colunaOrdem, direcaoOrdem]);

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / PAGE_SIZE));
  const atual = Math.min(pagina, totalPaginas);
  const lista = ordenadas.slice((atual - 1) * PAGE_SIZE, (atual - 1) * PAGE_SIZE + PAGE_SIZE);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
      style={s(
        'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:65;padding:20px;backdrop-filter:blur(4px);'
      )}
    >
      <div
        className="modal-content"
        style={s(
          'background:#111111;border:1px solid rgba(199,199,199,0.2);border-radius:14px;width:850px;max-width:95vw;max-height:88vh;display:flex;flex-direction:column;'
        )}
      >
        <div style={s('display:flex;justify-content:space-between;align-items:center;padding:20px;')}>
          <span style={s('font-size:16px;font-weight:700;')}>Tarefas — {poloLabels[polo]}</span>
          <button
            className="close-btn"
            onClick={onFechar}
            title="Fechar (ESC)"
            style={s('background:transparent;border:none;color:rgba(236,230,216,0.5);cursor:pointer;padding:4px;')}
          >
            <IconX />
          </button>
        </div>
        <div style={s('display:flex;gap:10px;padding:0 20px 16px;')}>
          <input
            type="text"
            placeholder="Buscar por cliente, cobrador ou advogado..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
            style={s(
              'flex:1;background:#161616;border:1px solid rgba(199,199,199,0.25);border-radius:8px;padding:9px 12px;color:#ECE6D8;font-family:inherit;font-size:12.5px;'
            )}
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPagina(1);
            }}
            style={s(
              'background:#161616;border:1px solid rgba(199,199,199,0.25);border-radius:8px;padding:9px 12px;color:#ECE6D8;font-family:inherit;font-size:12.5px;'
            )}
          >
            <option value="todos">Todos os status</option>
            <option value="concluida">Concluída</option>
            <option value="atrasada">Atrasada</option>
            <option value="no_prazo">No prazo</option>
          </select>
        </div>
        <div style={s('flex:1;overflow-y:auto;padding:0 20px;')}>
          <table style={s('width:100%;border-collapse:collapse;font-size:12.5px;')}>
            <thead>
              <tr>
                {COLUNAS_POLO.map((col) => {
                  const ativo = colunaOrdem === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => alternarOrdem(col.key)}
                      title={`Clique para ordenar por ${col.label}`}
                      style={{
                        ...s(TH),
                        cursor: 'pointer',
                        userSelect: 'none',
                        color: ativo ? '#f5dd90' : 'rgba(236,230,216,0.65)',
                        background: ativo ? 'rgba(245,221,144,0.05)' : 'transparent',
                        transition: 'color 0.15s',
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>{col.label}</span>
                        <span style={{ fontSize: '9px', color: ativo ? '#f5dd90' : 'rgba(236,230,216,0.25)' }}>
                          {ativo ? (direcaoOrdem === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'rgba(236,230,216,0.45)' }}>
                    Nenhuma tarefa encontrada.
                  </td>
                </tr>
              ) : (
                lista.map((t) => {
                  const cor = COR_STATUS[t.situacaoPrazo];
                  return (
                    <tr
                      key={t.id}
                      className="task-row"
                      onClick={() => onAbrirBitrix && onAbrirBitrix(t)}
                      style={s('border-bottom:1px solid rgba(199,199,199,0.08);cursor:pointer;')}
                      title="Clique para abrir no Bitrix24"
                    >
                      <td style={s('padding:8px 10px;font-weight:600;')}>
                        <div>{t.clienteNome || t.titulo}</div>
                        {(t.valorCobranca != null || t.situacaoFinanceira) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', fontSize: '10.5px' }}>
                            {t.valorCobranca != null && (
                              <span style={{ color: '#f5dd90', fontWeight: 600 }}>
                                R$ {Number(t.valorCobranca).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            )}
                            {t.situacaoFinanceira && (
                              <span
                                style={{
                                  backgroundColor: t.situacaoFinanceira.toUpperCase() === 'ADIMPLENTE' ? 'rgba(95,201,168,0.18)' : 'rgba(224,121,111,0.18)',
                                  color: t.situacaoFinanceira.toUpperCase() === 'ADIMPLENTE' ? '#5fc9a8' : '#e0796f',
                                  borderRadius: '3px',
                                  padding: '1px 5px',
                                  fontWeight: 700,
                                  fontSize: '9.5px',
                                }}
                              >
                                {t.situacaoFinanceira}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={s('padding:8px 10px;font-weight:600;')}>{t.equipeCobrancaColaboradorNome || '—'}</td>
                      <td style={s('padding:8px 10px;color:rgba(236,230,216,0.85);')}>{t.equipeCobrancaAdvogado || 'Sem advogado'}</td>
                      <td style={s('padding:8px 10px;')}>
                        <span
                          style={{
                            backgroundColor: cor + '22',
                            color: cor,
                            border: '1px solid ' + cor + '44',
                            borderRadius: '999px',
                            padding: '3px 11px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {STATUS_LABEL[t.situacaoPrazo]}
                        </span>
                      </td>
                      <td style={s('padding:8px 10px;color:rgba(236,230,216,0.55);')}>{formatarPrazo(t.prazoFinal)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div style={s('display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-top:1px solid rgba(199,199,199,0.12);')}>
          <span style={s('font-size:11px;color:rgba(236,230,216,0.4);')}>
            Página {atual} de {totalPaginas} ({ordenadas.length} tarefas)
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
