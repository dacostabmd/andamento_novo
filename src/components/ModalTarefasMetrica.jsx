import React, { useState, useMemo, useEffect } from 'react';
import { s } from '../style.js';
import { IconX, IconSearch, IconExternal } from './Icons.jsx';
import { COR_STATUS, STATUS_LABEL, BTN_PAG, BTN_PAG_OFF } from '../data.js';
import AnimatedList from './AnimatedList.jsx';

const PAGE_SIZE = 5;

const COLUNAS_ORDENACAO = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'status', label: 'Status' },
  { key: 'polo', label: 'Polo' },
  { key: 'cobrador', label: 'Cobrador' },
  { key: 'advogado', label: 'Advogado' },
  { key: 'cpf', label: 'CPF' },
  { key: 'prazo', label: 'Prazo' },
];

function formatarPrazo(prazoFinal) {
  if (!prazoFinal) return '—';
  const data = new Date(prazoFinal);
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR');
}

export default function ModalTarefasMetrica({
  titulo = 'Tarefas',
  subtitulo = '',
  tarefas = [],
  poloLabels = {},
  corPolo = {},
  corDestaque = '#5b9bdb',
  onAbrirBitrix,
  onFechar,
}) {
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [ordemColuna, setOrdemColuna] = useState('cliente');
  const [ordemDirecao, setOrdemDirecao] = useState('asc'); // 'asc' | 'desc'

  // Fecha modal ao apertar a tecla ESC (fase de captura para interceptar mesmo com foco em input)
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

  const alternarOrdem = (colunaKey) => {
    if (ordemColuna === colunaKey) {
      setOrdemDirecao((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrdemColuna(colunaKey);
      setOrdemDirecao('asc');
    }
    setPagina(1);
  };

  const buscaNorm = busca.trim().toLowerCase();
  const buscaNumeros = busca.replace(/\D/g, '');

  const tarefasFiltradas = useMemo(() => {
    if (!buscaNorm) return tarefas;
    return tarefas.filter((t) => {
      // 1. Advogado
      const adv = (t.equipeCobrancaAdvogado || '').toLowerCase();
      if (adv.includes(buscaNorm)) return true;

      // 2. Cobrador
      const colab = (t.equipeCobrancaColaboradorNome || '').toLowerCase();
      if (colab.includes(buscaNorm)) return true;

      // 3. Polo (código e rótulo)
      const poloCod = (t.poloCobranca || '').toLowerCase();
      const poloRot = (poloLabels[t.poloCobranca] || '').toLowerCase();
      if (poloCod.includes(buscaNorm) || poloRot.includes(buscaNorm)) return true;

      // 4. Nome da tarefa / Cliente
      const tituloTarefa = (t.titulo || '').toLowerCase();
      const cliente = (t.clienteNome || '').toLowerCase();
      if (tituloTarefa.includes(buscaNorm) || cliente.includes(buscaNorm)) return true;

      // 5. CPF (formatado, dígitos puros ou dígito final)
      const cpf = (t.cpfCliente || '').toLowerCase();
      if (cpf.includes(buscaNorm)) return true;
      if (buscaNumeros) {
        const cpfNumeros = (t.cpfCliente || '').replace(/\D/g, '');
        if (cpfNumeros && cpfNumeros.includes(buscaNumeros)) return true;
        if (t.digitoCpfCliente != null && String(t.digitoCpfCliente) === buscaNumeros) return true;
      }

      return false;
    });
  }, [tarefas, buscaNorm, buscaNumeros, poloLabels]);

  // Ordenação por coluna
  const tarefasOrdenadas = useMemo(() => {
    const lista = [...tarefasFiltradas];
    if (!ordemColuna) return lista;

    lista.sort((a, b) => {
      let valA;
      let valB;

      switch (ordemColuna) {
        case 'cliente':
          valA = (a.clienteNome || a.titulo || '').toLowerCase();
          valB = (b.clienteNome || b.titulo || '').toLowerCase();
          break;
        case 'status': {
          const pesos = { atrasada: 1, no_prazo: 2, concluida: 3 };
          valA = pesos[a.situacaoPrazo] ?? 99;
          valB = pesos[b.situacaoPrazo] ?? 99;
          break;
        }
        case 'polo':
          valA = (poloLabels[a.poloCobranca] || a.poloCobranca || '').toLowerCase();
          valB = (poloLabels[b.poloCobranca] || b.poloCobranca || '').toLowerCase();
          break;
        case 'cobrador':
          valA = (a.equipeCobrancaColaboradorNome || '').toLowerCase();
          valB = (b.equipeCobrancaColaboradorNome || '').toLowerCase();
          break;
        case 'advogado':
          valA = (a.equipeCobrancaAdvogado || '').toLowerCase();
          valB = (b.equipeCobrancaAdvogado || '').toLowerCase();
          break;
        case 'cpf':
          valA = a.digitoCpfCliente != null ? a.digitoCpfCliente : (a.cpfCliente || '');
          valB = b.digitoCpfCliente != null ? b.digitoCpfCliente : (b.cpfCliente || '');
          break;
        case 'prazo': {
          valA = a.prazoFinal ? new Date(a.prazoFinal).getTime() : 0;
          valB = b.prazoFinal ? new Date(b.prazoFinal).getTime() : 0;
          break;
        }
        default:
          return 0;
      }

      if (valA < valB) return ordemDirecao === 'asc' ? -1 : 1;
      if (valA > valB) return ordemDirecao === 'asc' ? 1 : -1;
      return 0;
    });

    return lista;
  }, [tarefasFiltradas, ordemColuna, ordemDirecao, poloLabels]);

  const totalPaginas = Math.max(1, Math.ceil(tarefasOrdenadas.length / PAGE_SIZE));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const tarefasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * PAGE_SIZE;
    return tarefasOrdenadas.slice(inicio, inicio + PAGE_SIZE);
  }, [tarefasOrdenadas, paginaAtual]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
      style={s(
        'position:fixed;inset:0;background:rgba(0,0,0,0.78);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;z-index:70;padding:16px;'
      )}
    >
      <div
        className="modal-content"
        style={{
          width: '40vw',
          height: '60vh',
          minWidth: '420px',
          minHeight: '440px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          background: '#111111',
          border: '1px solid rgba(199,199,199,0.22)',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7), 0 0 25px rgba(245,221,144,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(199,199,199,0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              style={{
                width: '10px',
                height: '24px',
                borderRadius: '4px',
                background: corDestaque,
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#ECE6D8',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {titulo}
                </span>
                <span
                  style={{
                    background: 'rgba(199,199,199,0.12)',
                    color: 'rgba(236,230,216,0.85)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  {tarefasFiltradas.length} {tarefasFiltradas.length === 1 ? 'tarefa' : 'tarefas'}
                </span>
              </div>
              {subtitulo && (
                <div style={{ fontSize: '11.5px', color: 'rgba(236,230,216,0.45)', marginTop: '2px' }}>
                  {subtitulo}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onFechar}
            title="Fechar (ESC)"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(236,230,216,0.6)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Barra de Busca Multifiltro */}
        <div style={{ padding: '12px 20px 8px 20px', flexShrink: 0 }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '12px',
                color: 'rgba(236,230,216,0.4)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <IconSearch size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar por Advogado, Cobrador, Polo, Tarefa ou CPF..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              style={{
                width: '100%',
                background: '#161616',
                border: '1px solid rgba(199,199,199,0.22)',
                borderRadius: '8px',
                padding: '9px 12px 9px 34px',
                color: '#ECE6D8',
                fontFamily: 'inherit',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
            {busca && (
              <button
                type="button"
                onClick={() => {
                  setBusca('');
                  setPagina(1);
                }}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(236,230,216,0.4)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <IconX size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Barra de Ordenação por Colunas */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            padding: '0 20px 10px 20px',
            marginTop: '5px',
            marginBottom: '5px',
            scrollbarWidth: 'none',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '11px', color: 'rgba(236,230,216,0.45)', fontWeight: 600, flexShrink: 0, marginRight: '2px' }}>
            Ordenar:
          </span>
          {COLUNAS_ORDENACAO.map((col) => {
            const ativa = ordemColuna === col.key;
            return (
              <button
                key={col.key}
                type="button"
                onClick={() => alternarOrdem(col.key)}
                title={`Ordenar por ${col.label} (${ativa && ordemDirecao === 'asc' ? 'Decrescente' : 'Crescente'})`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 9px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: ativa ? 700 : 500,
                  background: ativa ? 'rgba(245,221,144,0.12)' : 'rgba(255,255,255,0.03)',
                  color: ativa ? '#f5dd90' : 'rgba(236,230,216,0.65)',
                  border: '1px solid ' + (ativa ? 'rgba(245,221,144,0.4)' : 'rgba(199,199,199,0.15)'),
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span>{col.label}</span>
                {ativa ? (
                  <span style={{ fontSize: '9px', fontWeight: 800 }}>{ordemDirecao === 'asc' ? '▲' : '▼'}</span>
                ) : (
                  <span style={{ fontSize: '9px', opacity: 0.35 }}>⇅</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lista de Tarefas com Animação AnimatedList */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative', padding: '0 8px' }}>
          {tarefasPaginadas.length === 0 ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(236,230,216,0.45)',
                fontSize: '13px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: 0 }}>Nenhuma tarefa encontrada com os filtros informados.</p>
              {busca && (
                <button
                  type="button"
                  onClick={() => {
                    setBusca('');
                    setPagina(1);
                  }}
                  className="btn-ghost"
                  style={{
                    marginTop: '12px',
                    background: 'transparent',
                    border: '1px solid rgba(199,199,199,0.3)',
                    color: '#ECE6D8',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Limpar busca
                </button>
              )}
            </div>
          ) : (
            <AnimatedList
              items={tarefasPaginadas}
              onItemSelect={(t) => {
                if (onAbrirBitrix) onAbrirBitrix(t);
              }}
              renderItem={(t, idx, isSelected) => {
                const corStatus = COR_STATUS[t.situacaoPrazo] || '#5b9bdb';
                const corPoloAtual = t.poloCobranca ? corPolo[t.poloCobranca] : '#718096';

                return (
                  <div
                    className={`item ${isSelected ? 'selected' : ''}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      background: isSelected ? 'rgba(245,221,144,0.08)' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                    >
                      {/* Dados principais da Tarefa */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            title={t.clienteNome || t.titulo}
                            style={{
                              fontWeight: 700,
                              fontSize: '13px',
                              color: '#ECE6D8',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%',
                            }}
                          >
                            {t.clienteNome || t.titulo}
                          </span>
                          <span
                            style={{
                              backgroundColor: corStatus + '22',
                              color: corStatus,
                              border: '1px solid ' + corStatus + '44',
                              borderRadius: '999px',
                              padding: '2px 8px',
                              fontSize: '10px',
                              fontWeight: 700,
                            }}
                          >
                            {STATUS_LABEL[t.situacaoPrazo] || t.situacaoPrazo}
                          </span>
                        </div>

                        {/* Metadados: Polo, Cobrador, Advogado, CPF, Prazo */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginTop: '6px',
                            fontSize: '11px',
                            color: 'rgba(236,230,216,0.65)',
                            flexWrap: 'wrap',
                          }}
                        >
                          {t.poloCobranca && (
                            <span
                              style={{
                                backgroundColor: (corPoloAtual || '#718096') + '20',
                                color: corPoloAtual || '#718096',
                                border: '1px solid ' + (corPoloAtual || '#718096') + '40',
                                borderRadius: '4px',
                                padding: '1px 6px',
                                fontWeight: 700,
                                fontSize: '10px',
                              }}
                            >
                              {poloLabels[t.poloCobranca] || t.poloCobranca}
                            </span>
                          )}

                          <span>
                            <strong style={{ color: 'rgba(236,230,216,0.45)' }}>Cobrador:</strong>{' '}
                            {t.equipeCobrancaColaboradorNome || '—'}
                          </span>

                          <span>
                            <strong style={{ color: 'rgba(236,230,216,0.45)' }}>Adv:</strong>{' '}
                            {t.equipeCobrancaAdvogado || '—'}
                          </span>

                          {t.cpfCliente ? (
                            <span>
                              <strong style={{ color: 'rgba(236,230,216,0.45)' }}>CPF:</strong>{' '}
                              {t.cpfCliente}
                            </span>
                          ) : t.digitoCpfCliente != null ? (
                            <span>
                              <strong style={{ color: 'rgba(236,230,216,0.45)' }}>Final CPF:</strong>{' '}
                              {t.digitoCpfCliente}
                            </span>
                          ) : null}

                          <span>
                            <strong style={{ color: 'rgba(236,230,216,0.45)' }}>Prazo:</strong>{' '}
                            {formatarPrazo(t.prazoFinal)}
                          </span>
                        </div>
                      </div>

                      {/* Coluna de ação para abrir no Bitrix */}
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="icon-btn"
                          title={t.linkTarefa ? 'Abrir tarefa no Bitrix24' : 'Link do Bitrix indisponível'}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onAbrirBitrix) onAbrirBitrix(t);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: t.linkTarefa ? 'rgba(91,155,219,0.12)' : 'rgba(255,255,255,0.04)',
                            border:
                              '1px solid ' +
                              (t.linkTarefa ? 'rgba(91,155,219,0.35)' : 'rgba(199,199,199,0.18)'),
                            color: t.linkTarefa ? '#5b9bdb' : 'rgba(236,230,216,0.45)',
                            borderRadius: '6px',
                            padding: '5px 9px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: t.linkTarefa ? 'pointer' : 'default',
                            fontFamily: 'inherit',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <IconExternal />
                          <span>Bitrix</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          )}
        </div>

        {/* Rodapé com Paginação e Informação de Ordenação */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            borderTop: '1px solid rgba(199,199,199,0.12)',
            background: 'rgba(255,255,255,0.015)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', color: 'rgba(236,230,216,0.45)' }}>
              Página {paginaAtual} de {totalPaginas} ({tarefasOrdenadas.length}{' '}
              {tarefasOrdenadas.length === 1 ? 'tarefa' : 'tarefas'})
            </span>
            <span style={{ fontSize: '10.5px', color: 'rgba(245,221,144,0.7)', background: 'rgba(245,221,144,0.08)', padding: '2px 6px', borderRadius: '4px' }}>
              Ord: {COLUNAS_ORDENACAO.find((c) => c.key === ordemColuna)?.label} ({ordemDirecao === 'asc' ? 'Crescente ▲' : 'Decrescente ▼'})
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaAtual <= 1}
              style={paginaAtual <= 1 ? BTN_PAG_OFF : BTN_PAG}
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual >= totalPaginas}
              style={paginaAtual >= totalPaginas ? BTN_PAG_OFF : BTN_PAG}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
