import React from 'react';
import { motion } from 'motion/react';
import { IconDash, IconUsers, IconClipboard, IconShield, IconSettings } from './Icons.jsx';
import { s } from '../style.js';
import { iniciais } from '../data.js';

const ITENS = [
  { key: 'dashboard', label: 'Painel Geral', Icon: IconDash },
  { key: 'colaboradores', label: 'Cobradores & Advogados', Icon: IconUsers },
  { key: 'tarefas', label: 'Andamento Processual', Icon: IconClipboard },
  { key: 'permissoes', label: 'Permissões', Icon: IconShield, apenasAdmin: true },
  { key: 'configuracoes', label: 'Configurações', Icon: IconSettings },
];

export default function Sidebar({ screen, setScreen, usuario, ehAdmin = true, onToggleSimulacao }) {
  return (
    <aside
      style={s(
        'width:264px;flex-shrink:0;background:#0a0a0a;border-right:1px solid rgba(199,199,199,0.14);display:flex;flex-direction:column;justify-content:space-between;padding:20px 14px;position:sticky;top:0;height:100vh;animation:sidebarSlide 0.5s cubic-bezier(0.16,1,0.3,1) both;'
      )}
    >
      <div>
        <div style={s('padding:6px 10px 20px;')}>
          <div style={s('font-size:15px;font-weight:700;letter-spacing:0.01em;')}>Andamento Processual</div>
          <div style={s('font-size:9.5px;color:rgba(236,230,216,0.5);font-weight:600;letter-spacing:0.05em;margin-top:3px;')}>
            SISTEMA DE ACOMPANHAMENTO
          </div>
        </div>

        <div style={s('font-size:10.5px;font-weight:700;color:rgba(236,230,216,0.4);text-transform:uppercase;letter-spacing:0.06em;padding:0 10px;margin-bottom:8px;')}>
          Navegação
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
          {ITENS.map(({ key, label, Icon, apenasAdmin }) => {
            const isActive = screen === key;
            const bloqueado = apenasAdmin && !ehAdmin;

            return (
              <div
                key={key}
                className="nav-item"
                onClick={() => setScreen(key)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 12px',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: isActive ? '#f5dd90' : 'rgba(236,230,216,0.6)',
                  transition: 'color 0.2s ease',
                  userSelect: 'none',
                }}
              >
                {/* Indicador animado com slide up e slide down suave via layoutId */}
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarIndicator"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(245, 221, 144, 0.1)',
                      border: '1px solid rgba(245, 221, 144, 0.28)',
                      borderRadius: '9px',
                      zIndex: 0,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 32,
                      mass: 0.8,
                    }}
                  />
                )}

                <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center' }}>
                  <Icon />
                </span>
                <span style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {label}
                </span>

                {bloqueado && (
                  <span
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      fontSize: '9px',
                      fontWeight: 700,
                      color: 'rgba(236,230,216,0.4)',
                      background: 'rgba(199,199,199,0.1)',
                      padding: '2px 5px',
                      borderRadius: '4px',
                    }}
                  >
                    Restrito
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={s('border-top:1px solid rgba(199,199,199,0.14);padding-top:14px;display:flex;flex-direction:column;gap:10px;')}>
        {/* Identificação do Usuário Conectado */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(199,199,199,0.12)',
            borderRadius: '9px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: ehAdmin ? 'rgba(217,168,59,0.18)' : 'rgba(91,155,219,0.18)',
              color: ehAdmin ? '#d9a83b' : '#5b9bdb',
              border: '1px solid ' + (ehAdmin ? 'rgba(217,168,59,0.4)' : 'rgba(91,155,219,0.4)'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {iniciais(usuario?.nome || 'Caio Marques')}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              title={usuario?.nome || 'Caio Marques'}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#ECE6D8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {usuario?.nome || 'Caio Marques'}
            </div>
            <div
              style={{
                fontSize: '10px',
                color: ehAdmin ? '#d9a83b' : 'rgba(236,230,216,0.45)',
                fontWeight: 600,
                marginTop: '1px',
              }}
            >
              {ehAdmin ? '★ Admin Permissões' : 'Colaborador'}
            </div>
          </div>
          {onToggleSimulacao && (
            <button
              type="button"
              onClick={onToggleSimulacao}
              title={ehAdmin ? 'Alternar para visão de Colaborador sem acesso a Permissões' : 'Alternar para visão de Admin (Caio Marques)'}
              style={{
                background: 'transparent',
                border: '1px solid rgba(199,199,199,0.2)',
                color: 'rgba(236,230,216,0.5)',
                borderRadius: '5px',
                padding: '3px 6px',
                fontSize: '9.5px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Trocar
            </button>
          )}
        </div>

        <div style={s('background:rgba(245,221,144,0.08);border:1px solid rgba(245,221,144,0.25);color:#f5dd90;font-size:10px;font-weight:700;text-align:center;padding:5px 8px;border-radius:999px;')}>
          10 Polos de Cobrança
        </div>
      </div>
    </aside>
  );
}
