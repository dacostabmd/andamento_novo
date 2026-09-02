import { useState } from 'react';
import { s } from '../style.js';
import { IconX } from './Icons.jsx';
import { COR_STATUS, STATUS_LABEL, BTN_PAG, BTN_PAG_OFF } from '../data.js';

const TH = 'text-align:left;padding:8px 10px;font-size:10.5px;color:rgba(236,230,216,0.5);border-bottom:1px solid rgba(199,199,199,0.14);';
const PAGE_SIZE = 6;

function formatarPrazo(prazoFinal) {
  if (!prazoFinal) return '—';
  const data = new Date(prazoFinal);
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR');
}

export default function ModalPolo({ polo, poloLabels, tarefas, onFechar }) {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');
  const [pagina, setPagina] = useState(1);

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

  const buscaNorm = busca.trim().toLowerCase();
  const filtradas = tarefas.filter((t) => {
    if (t.poloCobranca !== polo) return false;
    if (status !== 'todos' && t.situacaoPrazo !== status) return false;
    if (buscaNorm) {
      const alvo = [t.clienteNome || '', t.equipeCobrancaColaboradorNome || '', t.equipeCobrancaAdvogado || ''].join(' ').toLowerCase();
      if (!alvo.includes(buscaNorm)) return false;
    }
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const atual = Math.min(pagina, totalPaginas);
  const lista = filtradas.slice((atual - 1) * PAGE_SIZE, (atual - 1) * PAGE_SIZE + PAGE_SIZE);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
      style={s('position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:65;padding:20px;backdrop-filter:blur(4px);')}
    >
      <div
        className="modal-content"
        style={s('background:#111111;border:1px solid rgba(199,199,199,0.2);border-radius:14px;width:640px;max-height:85vh;display:flex;flex-direction:column;')}
      >
        <div style={s('display:flex;justify-content:space-between;align-items:center;padding:20px;')}>
          <span style={s('font-size:16px;font-weight:700;')}>Tarefas — {poloLabels[polo]}</span>
          <button className="close-btn" onClick={onFechar} title="Fechar (ESC)" style={s('background:transparent;border:none;color:rgba(236,230,216,0.5);cursor:pointer;padding:4px;')}><IconX /></button>
        </div>
        <div style={s('display:flex;gap:10px;padding:0 20px 16px;')}>
          <input type="text" placeholder="Buscar por cliente ou colaborador..." value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} style={s('flex:1;background:#161616;border:1px solid rgba(199,199,199,0.25);border-radius:8px;padding:9px 12px;color:#ECE6D8;font-family:inherit;font-size:12.5px;')} />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPagina(1); }} style={s('background:#161616;border:1px solid rgba(199,199,199,0.25);border-radius:8px;padding:9px 12px;color:#ECE6D8;font-family:inherit;font-size:12.5px;')}>
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
                {['Cliente', 'Colaborador', 'Advogado', 'Status', 'Prazo'].map((h) => <th key={h} style={s(TH)}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {lista.map((t) => {
                const cor = COR_STATUS[t.situacaoPrazo];
                return (
                  <tr key={t.id} style={s('border-bottom:1px solid rgba(199,199,199,0.08);')}>
                    <td style={s('padding:8px 10px;font-weight:600;')}>{t.clienteNome || t.titulo}</td>
                    <td style={s('padding:8px 10px;')}>{t.equipeCobrancaColaboradorNome || '—'}</td>
                    <td style={s('padding:8px 10px;color:rgba(236,230,216,0.7);')}>{t.equipeCobrancaAdvogado || 'Sem advogado'}</td>
                    <td style={s('padding:8px 10px;')}>
                      <span style={{ backgroundColor: cor + '22', color: cor, border: '1px solid ' + cor + '44', borderRadius: '999px', padding: '3px 11px', fontSize: '11px', fontWeight: 700 }}>{STATUS_LABEL[t.situacaoPrazo]}</span>
                    </td>
                    <td style={s('padding:8px 10px;color:rgba(236,230,216,0.55);')}>{formatarPrazo(t.prazoFinal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={s('display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-top:1px solid rgba(199,199,199,0.12);')}>
          <span style={s('font-size:11px;color:rgba(236,230,216,0.4);')}>Página {atual} de {totalPaginas}</span>
          <div style={s('display:flex;gap:8px;')}>
            <button onClick={() => setPagina(Math.max(1, atual - 1))} style={atual <= 1 ? BTN_PAG_OFF : BTN_PAG}>Anterior</button>
            <button onClick={() => setPagina(Math.min(totalPaginas, atual + 1))} style={atual >= totalPaginas ? BTN_PAG_OFF : BTN_PAG}>Próxima</button>
          </div>
        </div>
      </div>
    </div>
  );
}
