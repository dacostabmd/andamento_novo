import { s } from '../style.js';
import { IconSearch, IconPlus, IconFire, IconScale, IconEdit, IconTrash } from './Icons.jsx';
import { iniciais, pillStyle } from '../data.js';

const TH = 'text-align:left;padding:12px 16px;font-weight:700;font-size:11.5px;color:rgba(236,230,216,0.6);border-bottom:1px solid rgba(199,199,199,0.16);';
const INPUT = 'background:#161616;border:1px solid rgba(199,199,199,0.25);border-radius:8px;padding:10px 12px;color:#ECE6D8;font-family:inherit;font-size:13px;';

export default function Colaboradores({ regras, polos, poloLabels, corPolo, podeEditar, busca, setBusca, filtroPolo, setFiltroPolo, onNovo, onEditar, onExcluir }) {
  const buscaNorm = busca.trim().toLowerCase();
  const filtradas = regras.filter((r) => {
    if (filtroPolo !== 'todos' && r.polo !== filtroPolo) return false;
    if (buscaNorm) {
      const alvo = [r.colaboradorNome, r.advogado || '', poloLabels[r.polo] || ''].concat(r.digitosCpf.map(String)).join(' ').toLowerCase();
      if (!alvo.includes(buscaNorm)) return false;
    }
    return true;
  });

  const pills = [{ key: 'todos', label: 'Todos', count: regras.length, cor: null }].concat(
    polos.map((p) => ({ key: p, label: poloLabels[p], count: regras.filter((r) => r.polo === p).length, cor: corPolo[p] }))
  );

  return (
    <div style={s('max-width:1360px;animation:fadeSlideIn 0.4s ease both;margin:0 auto;')}>
      <div style={s('margin-bottom:20px;')}>
        <div style={s('font-size:22px;font-weight:700;')}>Colaboradores &amp; Advogados</div>
        <div style={s('font-size:13px;color:rgba(236,230,216,0.5);margin-top:4px;')}>Associação entre cobradores do financeiro e advogados do jurídico, por polo regional e critério de roteamento de CPF.</div>
      </div>

      <div style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:12px;padding:16px;margin-bottom:18px;')}>
        <div style={s('display:flex;gap:12px;flex-wrap:wrap;align-items:center;')}>
          <div style={s('flex:1;min-width:260px;position:relative;')}>
            <span style={s('position:absolute;left:12px;top:50%;transform:translateY(-50%);color:rgba(236,230,216,0.4);')}><IconSearch /></span>
            <input
              type="text"
              placeholder="Buscar colaborador, advogado, polo ou dígito de CPF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ ...s(INPUT), width: '100%', paddingLeft: '36px' }}
            />
          </div>
          {podeEditar && (
            <button className="btn-gold" onClick={onNovo} style={s('display:flex;align-items:center;gap:8px;background:#846419;color:#f5eec9;border:1px solid #846419;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;')}>
              <IconPlus />
              Novo Colaborador
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

      <div style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:12px;overflow:hidden;')}>
        <table style={s('width:100%;border-collapse:collapse;font-size:13px;')}>
          <thead>
            <tr style={s('background:rgba(255,255,255,0.03);')}>
              <th style={s(TH)}>Polo Regional</th>
              <th style={s(TH)}>Cobrador</th>
              <th style={s(TH)}>Critério de Roteamento</th>
              <th style={s(TH)}>Advogado</th>
              <th style={{ ...s(TH), textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((item) => {
              const cor = corPolo[item.polo];
              return (
                <tr key={item.id} style={s('border-bottom:1px solid rgba(199,199,199,0.08);')}>
                  <td style={s('padding:11px 16px;')}>
                    <span style={{ backgroundColor: cor + '20', color: cor, border: '1px solid ' + cor + '40', borderRadius: '6px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 700 }}>{poloLabels[item.polo]}</span>
                  </td>
                  <td style={s('padding:11px 16px;')}>
                    <div style={s('display:flex;align-items:center;gap:10px;')}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: cor + '30', color: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>{iniciais(item.colaboradorNome)}</div>
                      <span style={s('font-weight:600;')}>{item.colaboradorNome}</span>
                    </div>
                  </td>
                  <td style={s('padding:11px 16px;')}>
                    {item.ehEscalao48h ? (
                      <span style={s('background:rgba(224,121,111,0.16);color:#e0796f;border:1px solid rgba(224,121,111,0.4);font-weight:700;font-size:10.5px;padding:4px 9px;border-radius:6px;display:inline-flex;align-items:center;gap:5px;')}>
                        <IconFire />
                        ESCALÃO 48 HORAS
                      </span>
                    ) : (
                      <div style={s('display:flex;align-items:center;gap:5px;flex-wrap:wrap;')}>
                        <span style={s('font-size:10.5px;color:rgba(236,230,216,0.45);')}>CPF final</span>
                        {item.digitosCpf.map((d) => (
                          <span key={d} style={s('background:rgba(91,155,219,0.16);color:#5b9bdb;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:5px;min-width:18px;text-align:center;')}>{d}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={s('padding:11px 16px;')}>
                    {item.advogado ? (
                      <div style={s('display:flex;align-items:center;gap:6px;')}>
                        <IconScale />
                        <span>{item.advogado}</span>
                      </div>
                    ) : (
                      <span style={s('font-size:11.5px;color:rgba(236,230,216,0.35);font-style:italic;')}>Sem advogado vinculado</span>
                    )}
                  </td>
                  <td style={s('padding:11px 16px;text-align:center;')}>
                    {podeEditar ? (
                      <div style={s('display:flex;gap:6px;justify-content:center;')}>
                        <button className="icon-btn" onClick={() => onEditar(item)} style={s('background:transparent;border:1px solid rgba(199,199,199,0.25);color:rgba(236,230,216,0.7);border-radius:6px;padding:6px;cursor:pointer;display:flex;')}>
                          <IconEdit />
                        </button>
                        <button className="icon-btn-danger" onClick={() => onExcluir(item)} style={s('background:transparent;border:1px solid rgba(199,199,199,0.25);color:rgba(236,230,216,0.7);border-radius:6px;padding:6px;cursor:pointer;display:flex;')}>
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
