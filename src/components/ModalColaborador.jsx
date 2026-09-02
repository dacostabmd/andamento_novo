import { useEffect, useState } from 'react';
import { s } from '../style.js';
import { IconX, IconSearch } from './Icons.jsx';
import { buscarUsuariosEquipeCobranca } from '../services/equipeCobrancaApi.js';

const LABEL = 'font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:rgba(236,230,216,0.5);display:block;margin-bottom:6px;';
const FIELD = 'width:100%;background:#161616;border:1px solid rgba(199,199,199,0.25);border-radius:8px;padding:10px 12px;color:#ECE6D8;font-family:inherit;font-size:13px;';

export default function ModalColaborador({ form, setForm, editando, erroNome, onSalvar, onCancelar, onAbrirPicker, advogadosSugeridos, polos, poloLabels }) {
  const patch = (p) => setForm({ ...form, ...p });
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    let cancelado = false;
    buscarUsuariosEquipeCobranca().then((reais) => {
      if (!cancelado) setUsuarios(reais);
    });
    return () => { cancelado = true; };
  }, []);

  const buscaNome = form.nome.trim().toLowerCase();
  const sugestoes = buscaNome ? usuarios.filter((u) => u.nome.toLowerCase().includes(buscaNome)).slice(0, 6) : [];
  const mostrarSugestoes = form.sugestoesVisiveis && sugestoes.length > 0;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancelar();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onCancelar]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
      style={s('position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:50;padding:20px;backdrop-filter:blur(4px);')}
    >
      <div
        className="modal-content"
        style={s('background:#111111;border:1px solid rgba(199,199,199,0.2);border-radius:14px;width:460px;max-height:90vh;overflow-y:auto;padding:24px;')}
      >
        <div style={s('display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;')}>
          <span style={s('font-size:16px;font-weight:700;')}>{editando ? 'Editar Cobrador' : 'Novo Cobrador'}</span>
          <button className="close-btn" onClick={onCancelar} title="Fechar (ESC)" style={s('background:transparent;border:none;color:rgba(236,230,216,0.5);cursor:pointer;padding:4px;')}><IconX /></button>
        </div>

        <div style={s('display:flex;flex-direction:column;gap:16px;')}>
          <div>
            <label style={s(LABEL)}>Cobrador</label>
            <div style={s('position:relative;')}>
              <div style={s('display:flex;gap:8px;')}>
                <input
                  type="text"
                  placeholder="Ex.: Nathalia Leão"
                  value={form.nome}
                  onChange={(e) => patch({ nome: e.target.value, departamento: '', sugestoesVisiveis: true })}
                  onFocus={() => patch({ sugestoesVisiveis: true })}
                  onBlur={() => setTimeout(() => setForm((prev) => ({ ...prev, sugestoesVisiveis: false })), 150)}
                  style={{ ...s(FIELD), flex: 1, width: 'auto' }}
                />
                <button className="icon-btn" onClick={onAbrirPicker} title="Buscar no Bitrix24" style={s('background:transparent;border:1px solid rgba(199,199,199,0.25);color:rgba(236,230,216,0.7);border-radius:8px;padding:0 12px;cursor:pointer;display:flex;align-items:center;')}>
                  <IconSearch />
                </button>
              </div>
              {mostrarSugestoes && (
                <div style={s('position:absolute;top:calc(100% + 4px);left:0;right:52px;background:#1a1a1a;border:1px solid rgba(199,199,199,0.25);border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,0.5);z-index:5;overflow:hidden;')}>
                  {sugestoes.map((u) => (
                    <button key={u.id} className="sug-item" onClick={() => patch({ nome: u.nome, departamento: 'Andamento Processual', sugestoesVisiveis: false })} style={s('display:block;width:100%;text-align:left;background:transparent;border:none;color:#ECE6D8;padding:9px 12px;font-size:12.5px;cursor:pointer;font-family:inherit;')}>{u.nome}</button>
                  ))}
                </div>
              )}
            </div>
            {erroNome && <div style={s('font-size:11px;color:#e0796f;margin-top:5px;')}>{erroNome}</div>}
            {form.departamento && <div style={s('font-size:11px;color:#5fc9a8;margin-top:6px;')}>✓ Departamento Bitrix24 atribuído automaticamente: Andamento Processual</div>}
          </div>

          <div>
            <label style={s(LABEL)}>Polo Regional</label>
            <select value={form.polo} onChange={(e) => patch({ polo: e.target.value })} style={s(FIELD)}>
              {polos.map((p) => <option key={p} value={p}>{poloLabels[p]}</option>)}
            </select>
          </div>

          <div style={s('background:rgba(255,255,255,0.03);border:1px solid rgba(199,199,199,0.16);border-radius:9px;padding:12px 14px;')}>
            <label style={s('display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;cursor:pointer;')}>
              <input type="checkbox" checked={form.eh48h} onChange={() => patch({ eh48h: !form.eh48h })} style={s('width:16px;height:16px;accent-color:#846419;')} />
              Escalão de Contingência (48 Horas)
            </label>
            <div style={s('font-size:11px;color:rgba(236,230,216,0.45);margin-top:5px;margin-left:26px;')}>Quando ativo, o colaborador atende tarefas com mais de 48h desde a criação, sem dígito de CPF fixo.</div>
          </div>

          {!form.eh48h && (
            <div>
              <label style={s('font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:rgba(236,230,216,0.5);display:block;margin-bottom:8px;')}>Dígitos Finais do CPF Atendidos</label>
              <div style={s('display:flex;gap:6px;flex-wrap:wrap;')}>
                {Array.from({ length: 10 }, (_, d) => {
                  const ativo = form.digitosCpf.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => patch({ digitosCpf: ativo ? form.digitosCpf.filter((x) => x !== d) : [...form.digitosCpf, d].sort((a, b) => a - b) })}
                      style={ativo
                        ? { backgroundColor: '#846419', color: '#f5eec9', border: '1px solid #846419', borderRadius: '7px', padding: '7px 12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minWidth: '34px' }
                        : { backgroundColor: 'transparent', color: 'rgba(236,230,216,0.6)', border: '1px solid rgba(199,199,199,0.3)', borderRadius: '7px', padding: '7px 12px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minWidth: '34px' }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label style={s(LABEL)}>Advogado</label>
            <input type="text" list="lista-advogados" placeholder="Selecione ou digite o nome do(a) advogado(a)" value={form.advogado} onChange={(e) => patch({ advogado: e.target.value })} style={s(FIELD)} />
            <datalist id="lista-advogados">
              {advogadosSugeridos.map((a) => <option key={a} value={a} />)}
            </datalist>
          </div>

          <div style={s('display:flex;justify-content:flex-end;gap:10px;margin-top:6px;')}>
            <button onClick={onCancelar} style={s('background:transparent;color:rgba(236,230,216,0.65);border:1px solid rgba(199,199,199,0.3);border-radius:8px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;')}>Cancelar</button>
            <button className="btn-gold" onClick={onSalvar} style={s('background:#846419;color:#f5eec9;border:1px solid #846419;border-radius:8px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;')}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
