import { useState } from 'react';
import { s } from '../style.js';
import { iniciais } from '../data.js';

const LABEL = 'font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:rgba(236,230,216,0.5);display:block;margin-bottom:6px;';
const FIELD = 'width:100%;background:#161616;border:1px solid rgba(199,199,199,0.25);border-radius:8px;padding:10px 12px;color:#ECE6D8;font-family:inherit;font-size:13px;';

/**
 * Autoedição da PRÓPRIA "UF de atuação" (o polo, em equipes_cobranca) — sem
 * passar pelo CRUD completo de Colaboradores, restrito aos 4 admins. Pedido
 * do usuário em 2026-09-02: quem já está cadastrado como cobrador ou
 * advogado pode ajustar só o próprio polo por aqui.
 */
export default function Configuracoes({ minhasLinhas, polos, poloLabels, corPolo, onSalvarPolo }) {
  const [poloEmEdicao, setPoloEmEdicao] = useState({});
  const [salvandoId, setSalvandoId] = useState(null);

  const poloSelecionado = (linha) => poloEmEdicao[linha.id] ?? linha.polo;

  async function salvar(linha) {
    const novoPolo = poloSelecionado(linha);
    if (novoPolo === linha.polo) return;
    setSalvandoId(linha.id);
    await onSalvarPolo(linha, novoPolo);
    setSalvandoId(null);
  }

  return (
    <div style={s('max-width:900px;animation:fadeSlideIn 0.4s ease both;margin:0 auto;')}>
      <div style={s('margin-bottom:20px;')}>
        <div style={s('font-size:22px;font-weight:700;')}>Configurações</div>
        <div style={s('font-size:13px;color:rgba(236,230,216,0.5);margin-top:4px;')}>Ajuste sua própria UF de atuação (o Polo de Cobrança) — nome, dígitos de CPF e advogado continuam só com os administradores.</div>
      </div>

      {minhasLinhas.length === 0 ? (
        <div style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:12px;padding:32px;text-align:center;color:rgba(236,230,216,0.5);font-size:13px;')}>
          Você ainda não está cadastrado(a) como cobrador(a) ou advogado(a) em nenhuma Equipe de Cobrança. Fale com Caio Marques, Handerson Salles, Vagner Rodrigues ou Lorena Pontes para ser incluído(a).
        </div>
      ) : (
        <div style={s('display:flex;flex-direction:column;gap:14px;')}>
          {minhasLinhas.map((linha) => {
            const cor = corPolo[linha.polo];
            const alterado = poloSelecionado(linha) !== linha.polo;
            return (
              <div key={linha.id} style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:12px;padding:18px 20px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;')}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: cor + '30', color: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>{iniciais(linha.colaboradorNome)}</div>
                <div style={s('flex:1;min-width:180px;')}>
                  <div style={s('font-weight:700;font-size:14px;')}>{linha.colaboradorNome}</div>
                  <div style={s('font-size:11.5px;color:rgba(236,230,216,0.45);margin-top:2px;')}>{linha.advogado ? `Advogado(a): ${linha.advogado}` : 'Sem advogado vinculado'}</div>
                </div>
                <div style={s('min-width:240px;')}>
                  <label style={s(LABEL)}>UF de atuação (Polo)</label>
                  <select
                    value={poloSelecionado(linha)}
                    onChange={(e) => setPoloEmEdicao((prev) => ({ ...prev, [linha.id]: e.target.value }))}
                    style={s(FIELD)}
                  >
                    {polos.map((p) => <option key={p} value={p}>{poloLabels[p]}</option>)}
                  </select>
                </div>
                <button
                  className="btn-gold"
                  disabled={!alterado || salvandoId === linha.id}
                  onClick={() => salvar(linha)}
                  style={s(`background:${alterado ? '#846419' : 'rgba(199,199,199,0.15)'};color:${alterado ? '#f5eec9' : 'rgba(236,230,216,0.4)'};border:1px solid ${alterado ? '#846419' : 'rgba(199,199,199,0.2)'};border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:${alterado ? 'pointer' : 'not-allowed'};font-family:inherit;`)}
                >
                  {salvandoId === linha.id ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
