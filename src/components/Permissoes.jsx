import React, { useState, useMemo } from 'react';
import { s } from '../style.js';
import { IconPlus, IconX, IconShield, IconSearch } from './Icons.jsx';
import { PERM_COLS, iniciais } from '../data.js';

export default function Permissoes({
  usuarios = [],
  ehAdmin = true,
  onToggle,
  onRemover,
  onAdicionar,
}) {
  const [busca, setBusca] = useState('');

  const buscaNorm = busca.trim().toLowerCase();

  // Filtra colaboradores com "Andamento" no departamento
  const colaboradoresAndamento = useMemo(() => {
    return usuarios.filter((u) => {
      const dep = (u.departamento || '').toLowerCase();
      // Deve ter "Andamento" no departamento (ou na ausência de campo, lista se for do escopo)
      const ehAndamento = dep.includes('andamento') || dep === '' || !u.departamento;
      if (!ehAndamento) return false;

      if (buscaNorm) {
        const nome = (u.nome || '').toLowerCase();
        return nome.includes(buscaNorm);
      }
      return true;
    });
  }, [usuarios, buscaNorm]);

  // Se o usuário logado não for um dos 4 admins autorizados
  if (!ehAdmin) {
    return (
      <div style={s('max-width:800px;animation:fadeSlideIn 0.4s ease both;margin:60px auto;text-align:center;')}>
        <div
          style={{
            background: '#111111',
            border: '1px solid rgba(224,121,111,0.3)',
            borderRadius: '16px',
            padding: '40px 32px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(224,121,111,0.12)',
              color: '#e0796f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <IconShield />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ECE6D8', margin: '0 0 8px 0' }}>
            Acesso Restrito
          </h2>
          <p style={{ fontSize: '13.5px', color: 'rgba(236,230,216,0.6)', maxWidth: '480px', margin: '0 auto 20px auto', lineHeight: 1.6 }}>
            Esta seção de permissões é estritamente restrita aos administradores autorizados do sistema:
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {['Caio Marques', 'Lorena Pontes', 'Vagner Rodrigues', 'Handerson Sales'].map((nome) => (
              <span
                key={nome}
                style={{
                  background: 'rgba(245,221,144,0.1)',
                  border: '1px solid rgba(245,221,144,0.3)',
                  color: '#f5dd90',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                ★ {nome}
              </span>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(236,230,216,0.4)' }}>
            Se você precisa de acesso a esta área, solicite permissão a um dos administradores acima.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s('max-width:1360px;animation:fadeSlideIn 0.4s ease both;margin:0 auto;')}>
      <div style={s('margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;')}>
        <div>
          <div style={s('font-size:22px;font-weight:700;')}>Permissões de Acesso</div>
          <div style={s('font-size:13px;color:rgba(236,230,216,0.5);margin-top:4px;')}>
            Controle de visualização para todos os colaboradores do departamento com &quot;Andamento&quot;.
          </div>
        </div>
        {onAdicionar && (
          <button
            className="btn-gold"
            onClick={onAdicionar}
            style={s(
              'display:flex;align-items:center;gap:8px;background:#846419;color:#f5eec9;border:1px solid #846419;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;'
            )}
          >
            <IconPlus />
            Adicionar Colaborador
          </button>
        )}
      </div>

      {/* Nota de Governança e Administradores Autorizados */}
      <div
        style={{
          background: 'rgba(245,221,144,0.06)',
          border: '1px solid rgba(245,221,144,0.25)',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '18px',
          fontSize: '12.5px',
          color: 'rgba(236,230,216,0.75)',
          lineHeight: 1.5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ color: '#f5dd90', fontWeight: 700 }}>★ Acesso Administrativo Exclusivo:</span>
          <span style={{ color: '#f5dd90' }}>Caio Marques, Lorena Pontes, Vagner Rodrigues e Handerson Sales.</span>
        </div>
        <div>
          Gerencie abaixo o que cada colaborador do departamento <strong>Andamento Processual</strong> pode acessar nas abas do sistema (Painel Geral, Colaboradores &amp; Advogados, Tarefas e Permissões).
        </div>
      </div>

      {/* Barra de Busca de Colaboradores */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div style={{ position: 'relative', width: '360px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'rgba(236,230,216,0.4)', pointerEvents: 'none' }}>
            <IconSearch size={14} />
          </span>
          <input
            type="text"
            placeholder="Buscar colaborador de Andamento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: '100%',
              background: '#161616',
              border: '1px solid rgba(199,199,199,0.22)',
              borderRadius: '8px',
              padding: '9px 12px 9px 34px',
              color: '#ECE6D8',
              fontFamily: 'inherit',
              fontSize: '12.5px',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(236,230,216,0.45)' }}>
          {colaboradoresAndamento.length} colaboradores listados
        </div>
      </div>

      {/* Tabela de Colaboradores e Matriz de Permissões */}
      <div style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:12px;overflow:hidden;')}>
        <table style={s('width:100%;border-collapse:collapse;font-size:13px;')}>
          <thead>
            <tr style={s('background:rgba(255,255,255,0.03);')}>
              <th style={s('text-align:left;padding:12px 18px;font-weight:700;font-size:11.5px;color:rgba(236,230,216,0.6);border-bottom:1px solid rgba(199,199,199,0.16);')}>
                Colaborador (Andamento)
              </th>
              {PERM_COLS.map((c) => (
                <th key={c.key} style={s('text-align:center;padding:12px 16px;font-weight:700;font-size:11px;color:rgba(236,230,216,0.6);border-bottom:1px solid rgba(199,199,199,0.16);')}>
                  {c.label}
                </th>
              ))}
              {onRemover && <th style={s('width:40px;border-bottom:1px solid rgba(199,199,199,0.16);')}></th>}
            </tr>
          </thead>
          <tbody>
            {colaboradoresAndamento.length === 0 ? (
              <tr>
                <td colSpan={PERM_COLS.length + (onRemover ? 2 : 1)} style={{ padding: '32px', textAlign: 'center', color: 'rgba(236,230,216,0.45)' }}>
                  Nenhum colaborador encontrado para o filtro informado.
                </td>
              </tr>
            ) : (
              colaboradoresAndamento.map((u) => (
                <tr key={u.id || u.nome} style={s('border-bottom:1px solid rgba(199,199,199,0.08);')}>
                  <td style={s('padding:12px 18px;')}>
                    <div style={s('display:flex;align-items:center;gap:12px;')}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(245,221,144,0.12)',
                          color: '#f5dd90',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {iniciais(u.nome)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#ECE6D8' }}>{u.nome}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              background: 'rgba(91,155,219,0.14)',
                              color: '#5b9bdb',
                              border: '1px solid rgba(91,155,219,0.3)',
                              borderRadius: '4px',
                              padding: '1px 6px',
                              fontWeight: 600,
                            }}
                          >
                            {u.departamento || 'Andamento Processual'}
                          </span>
                          {u.polo && (
                            <span style={{ fontSize: '10px', color: 'rgba(236,230,216,0.4)' }}>
                              Polo {u.polo}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  {PERM_COLS.map((c) => {
                    const ativo = !!u.permissoes?.[c.key];
                    return (
                      <td key={c.key} style={s('padding:12px 16px;text-align:center;')}>
                        <button
                          type="button"
                          onClick={() => onToggle(u.id || u.nome, c.key)}
                          title={`${ativo ? 'Desativar' : 'Ativar'} acesso a ${c.label}`}
                          style={{
                            width: '40px',
                            height: '22px',
                            borderRadius: '999px',
                            position: 'relative',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            background: ativo ? '#846419' : 'rgba(199,199,199,0.22)',
                            transition: 'background 0.2s ease',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: '2px',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: ativo ? '#f5eec9' : '#ECE6D8',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                              transition: 'transform 0.15s ease',
                              transform: ativo ? 'translateX(18px)' : 'translateX(0)',
                            }}
                          />
                        </button>
                      </td>
                    );
                  })}
                  {onRemover && (
                    <td style={s('padding:12px 16px;text-align:center;')}>
                      <button
                        className="rm-btn"
                        onClick={() => onRemover(u.id || u.nome)}
                        title="Remover da lista"
                        style={s('background:transparent;border:none;color:rgba(236,230,216,0.4);cursor:pointer;padding:4px;')}
                      >
                        <IconX size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
