import React, { useState, useMemo } from 'react';
import { s } from '../style.js';
import { IconSearch, IconPlus, IconFire, IconScale, IconEdit, IconTrash } from './Icons.jsx';
import { iniciais, pillStyle } from '../data.js';

const TH = 'text-align:left;padding:12px 14px;font-weight:700;font-size:11.5px;color:rgba(236,230,216,0.6);border-bottom:1px solid rgba(199,199,199,0.16);';
const INPUT = 'background:#161616;border:1px solid rgba(199,199,199,0.25);border-radius:8px;padding:10px 12px;color:#ECE6D8;font-family:inherit;font-size:13px;';

const ORDEM_POLOS = {
  RJ: 1,
  SP: 2,
  DF_PA_MS: 3,
  MG_AM: 4,
  BA: 5,
  GO_RS_MT: 6,
  PR_RR: 7,
  AC_AL_AP_PI_RO_SC_SE_TO: 8,
  MA_ES_PE: 9,
  RN_PB_CE: 10,
};

function pesoCriterio(item) {
  if (item.ehEscalao48h) return 999;
  if (Array.isArray(item.digitosCpf) && item.digitosCpf.length > 0) {
    return item.digitosCpf[0];
  }
  return 500;
}

function formatarCriterioTexto(item) {
  if (item.ehEscalao48h) return '48 horas';
  const d = item.digitosCpf || [];
  if (d.length === 0) return '—';
  if (d.length === 1) return `CPF ${d[0]}`;
  if (d.length === 5 && d[0] === 0 && d[4] === 4) return 'CPF final 0 a 4';
  if (d.length === 5 && d[0] === 5 && d[4] === 9) return 'CPF final 5 a 9';
  if (d.length === 2) return `CPF ${d[0]} e ${d[1]}`;
  if (d.length === 3) return `CPF ${d[0]}, ${d[1]} e ${d[2]}`;
  if (d.length === 4) return `CPF ${d[0]}, ${d[1]}, ${d[2]} e ${d[3]}`;
  return `CPF ${d.join(', ')}`;
}

const COLUNAS_COBRADORES = [
  { key: 'polo', label: 'Polo Regional' },
  { key: 'cobrador', label: 'Cobrador(a)' },
  { key: 'email', label: 'E-mail' },
  { key: 'criterio', label: 'Critério (CPF)' },
  { key: 'advogado', label: 'Advogado(a)' },
];

export default function Colaboradores({
  regras,
  polos,
  poloLabels,
  corPolo,
  podeEditar,
  busca,
  setBusca,
  filtroPolo,
  setFiltroPolo,
  onNovo,
  onEditar,
  onExcluir,
}) {
  const [colunaOrdem, setColunaOrdem] = useState(null);
  const [direcaoOrdem, setDirecaoOrdem] = useState('asc'); // 'asc' | 'desc'

  const alternarOrdem = (colKey) => {
    if (colunaOrdem === colKey) {
      if (direcaoOrdem === 'asc') {
        setDirecaoOrdem('desc');
      } else {
        setColunaOrdem(null);
        setDirecaoOrdem('asc');
      }
    } else {
      setColunaOrdem(colKey);
      setDirecaoOrdem('asc');
    }
  };

  const buscaNorm = busca.trim().toLowerCase();
  const filtradas = useMemo(() => {
    return regras.filter((r) => {
      if (filtroPolo !== 'todos' && r.polo !== filtroPolo) return false;
      if (buscaNorm) {
        const alvo = [
          r.colaboradorNome,
          r.email || '',
          r.advogado || '',
          poloLabels[r.polo] || '',
          formatarCriterioTexto(r),
        ]
          .concat((r.digitosCpf || []).map(String))
          .join(' ')
          .toLowerCase();
        if (!alvo.includes(buscaNorm)) return false;
      }
      return true;
    });
  }, [regras, filtroPolo, buscaNorm, poloLabels]);

  const ordenadas = useMemo(() => {
    return [...filtradas].sort((a, b) => {
      // ORDEM OFICIAL DO ANEXO 2 (PADRÃO):
      // 1. Polo na ordem oficial
      // 2. Dígitos de CPF (0 -> 9, depois 48h)
      if (!colunaOrdem) {
        const pA = ORDEM_POLOS[a.polo] || 99;
        const pB = ORDEM_POLOS[b.polo] || 99;
        if (pA !== pB) return pA - pB;
        const cA = pesoCriterio(a);
        const cB = pesoCriterio(b);
        if (cA !== cB) return cA - cB;
        return (a.id || 0) - (b.id || 0);
      }

      let vA, vB;
      switch (colunaOrdem) {
        case 'polo': {
          const pA = ORDEM_POLOS[a.polo] || 99;
          const pB = ORDEM_POLOS[b.polo] || 99;
          const pDiff = direcaoOrdem === 'asc' ? pA - pB : pB - pA;
          if (pDiff !== 0) return pDiff;
          return pesoCriterio(a) - pesoCriterio(b);
        }
        case 'cobrador':
          vA = (a.colaboradorNome || '').toLowerCase();
          vB = (b.colaboradorNome || '').toLowerCase();
          return direcaoOrdem === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
        case 'email':
          vA = (a.email || '').toLowerCase();
          vB = (b.email || '').toLowerCase();
          return direcaoOrdem === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
        case 'advogado':
          vA = (a.advogado || '').toLowerCase();
          vB = (b.advogado || '').toLowerCase();
          return direcaoOrdem === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
        case 'criterio': {
          const cA = pesoCriterio(a);
          const cB = pesoCriterio(b);
          return direcaoOrdem === 'asc' ? cA - cB : cB - cA;
        }
        default:
          return 0;
      }
    });
  }, [filtradas, colunaOrdem, direcaoOrdem]);

  const pills = [{ key: 'todos', label: 'Todos', count: regras.length, cor: null }].concat(
    polos.map((p) => {
      const codigo = typeof p === 'string' ? p : p.codigo;
      const rotulo = typeof p === 'string' ? (poloLabels[codigo] || codigo) : (poloLabels[codigo] || p.rotulo || codigo);
      return {
        key: codigo,
        label: rotulo,
        count: regras.filter((r) => r.polo === codigo).length,
        cor: corPolo[codigo],
      };
    })
  );

  return (
    <div style={s('max-width:1360px;animation:fadeSlideIn 0.4s ease both;margin:0 auto;')}>
      <div style={s('margin-bottom:20px;')}>
        <div style={s('font-size:22px;font-weight:700;')}>Cobradores &amp; Advogados</div>
        <div style={s('font-size:13px;color:rgba(236,230,216,0.5);margin-top:4px;')}>
          Associação oficial entre cobradores do financeiro e advogados do jurídico por polo regional e faixa de CPF.
        </div>
      </div>

      <div style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:12px;padding:16px;margin-bottom:18px;')}>
        <div style={s('display:flex;gap:12px;flex-wrap:wrap;align-items:center;')}>
          <div style={s('flex:1;min-width:260px;position:relative;')}>
            <span style={s('position:absolute;left:12px;top:50%;transform:translateY(-50%);color:rgba(236,230,216,0.4);')}>
              <IconSearch />
            </span>
            <input
              type="text"
              placeholder="Buscar cobrador, e-mail, advogado, polo ou dígito de CPF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ ...s(INPUT), width: '100%', paddingLeft: '36px' }}
            />
          </div>
          {podeEditar && (
            <button
              className="btn-gold"
              onClick={onNovo}
              style={s(
                'display:flex;align-items:center;gap:8px;background:#846419;color:#f5eec9;border:1px solid #846419;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;'
              )}
            >
              <IconPlus />
              Novo Cobrador
            </button>
          )}
        </div>

        <div style={s('display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;')}>
          {pills.map((p) => (
            <button key={p.key} onClick={() => setFiltroPolo(p.key)} style={pillStyle(p.cor, filtroPolo === p.key)}>
              {p.label} ({p.count})
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={s('font-size:11.5px;color:rgba(236,230,216,0.4);')}>
          Mostrando {filtradas.length} de {regras.length} regras{' '}
          {colunaOrdem
            ? `(ordenadas por ${COLUNAS_COBRADORES.find((c) => c.key === colunaOrdem)?.label} ${direcaoOrdem === 'asc' ? '▲' : '▼'})`
            : '(ordem oficial do Anexo 2: Polo → Dígitos 0-9 → 48h)'}
        </div>
        {colunaOrdem && (
          <button
            onClick={() => {
              setColunaOrdem(null);
              setDirecaoOrdem('asc');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f5dd90',
              fontSize: '11px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Restaurar ordem do Anexo 2
          </button>
        )}
      </div>

      <div style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:12px;overflow:hidden;')}>
        <table style={s('width:100%;border-collapse:collapse;font-size:13px;')}>
          <thead>
            <tr style={s('background:rgba(255,255,255,0.03);')}>
              {COLUNAS_COBRADORES.map((col) => {
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
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span>{col.label}</span>
                      <span style={{ fontSize: '10px', color: ativo ? '#f5dd90' : 'rgba(236,230,216,0.25)' }}>
                        {ativo ? (direcaoOrdem === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </div>
                  </th>
                );
              })}
              <th style={{ ...s(TH), textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((item) => {
              const cor = corPolo[item.polo] || '#718096';
              return (
                <tr key={item.id} style={s('border-bottom:1px solid rgba(199,199,199,0.08);')}>
                  <td style={s('padding:11px 14px;')}>
                    <span
                      style={{
                        backgroundColor: cor + '20',
                        color: cor,
                        border: '1px solid ' + cor + '40',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {poloLabels[item.polo] || item.polo}
                    </span>
                  </td>
                  <td style={s('padding:11px 14px;')}>
                    <div style={s('display:flex;align-items:center;gap:10px;')}>
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          backgroundColor: cor + '30',
                          color: cor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {iniciais(item.colaboradorNome)}
                      </div>
                      <span style={s('font-weight:700;color:#ECE6D8;')}>{item.colaboradorNome}</span>
                    </div>
                  </td>
                  <td style={s('padding:11px 14px;color:rgba(236,230,216,0.6);font-size:12px;font-family:inherit;')}>
                    {item.email || <span style={{ color: 'rgba(236,230,216,0.25)' }}>—</span>}
                  </td>
                  <td style={s('padding:11px 14px;')}>
                    {item.ehEscalao48h ? (
                      <span
                        style={s(
                          'background:rgba(224,121,111,0.16);color:#e0796f;border:1px solid rgba(224,121,111,0.4);font-weight:700;font-size:11px;padding:4px 9px;border-radius:6px;display:inline-flex;align-items:center;gap:5px;'
                        )}
                      >
                        <IconFire />
                        48 horas
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(167, 139, 250, 0.14)',
                          color: '#c4b5fd',
                          border: '1px solid rgba(167, 139, 250, 0.35)',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '6px',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatarCriterioTexto(item)}
                      </span>
                    )}
                  </td>
                  <td style={s('padding:11px 14px;')}>
                    {item.advogado ? (
                      <div style={s('display:flex;align-items:center;gap:6px;')}>
                        <IconScale />
                        <span style={{ fontWeight: 700, color: '#5fc9a8' }}>{item.advogado}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11.5px', color: '#e0796f', fontStyle: 'italic', opacity: 0.75 }}>
                        Sem advogado
                      </span>
                    )}
                  </td>
                  <td style={s('padding:11px 14px;text-align:center;')}>
                    {podeEditar ? (
                      <div style={s('display:flex;gap:6px;justify-content:center;')}>
                        <button
                          className="icon-btn"
                          onClick={() => onEditar(item)}
                          style={s(
                            'background:transparent;border:1px solid rgba(199,199,199,0.25);color:rgba(236,230,216,0.7);border-radius:6px;padding:6px;cursor:pointer;display:flex;'
                          )}
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="icon-btn-danger"
                          onClick={() => onExcluir(item)}
                          style={s(
                            'background:transparent;border:1px solid rgba(199,199,199,0.25);color:rgba(236,230,216,0.7);border-radius:6px;padding:6px;cursor:pointer;display:flex;'
                          )}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    ) : (
                      <span style={s('font-size:11px;color:rgba(236,230,216,0.3);')}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
