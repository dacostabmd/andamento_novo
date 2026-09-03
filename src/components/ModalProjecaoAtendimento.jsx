import React, { useEffect } from 'react';
import { IconX, IconExternal } from './Icons.jsx';

export default function ModalProjecaoAtendimento({
  polo,
  poloLabels = {},
  corPolo = {},
  onFechar,
  onVerTarefas,
}) {
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

  if (!polo) return null;

  const codigo = polo.codigo;
  const rotulo = poloLabels[codigo] || polo.rotulo || codigo;
  const cor = corPolo[codigo] || '#5b9bdb';

  const dadosMM = polo.dadosMM || {};
  const mm7 = dadosMM.mm7 || [];
  const mm15 = dadosMM.mm15 || [];
  const mm30 = dadosMM.mm30 || [];

  const val7 = mm7.length > 0 ? mm7[mm7.length - 1] : (polo.taxaResolucao || 0);
  const val15 = mm15.length > 0 ? mm15[mm15.length - 1] : (polo.taxaResolucao || 0);
  const val30 = mm30.length > 0 ? mm30[mm30.length - 1] : (polo.taxaResolucao || 0);

  // Escala SVG detalhada
  const width = 760;
  const height = 240;
  const paddingX = 45;
  const paddingY = 25;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const todosValores = [...mm7, ...mm15, ...mm30];
  const minBase = todosValores.length > 0 ? Math.min(...todosValores) : 0;
  const maxBase = todosValores.length > 0 ? Math.max(...todosValores) : 100;
  const minVal = Math.max(0, Math.floor(minBase - 6));
  const maxVal = Math.min(100, Math.ceil(maxBase + 8));
  const range = Math.max(14, maxVal - minVal);

  function getY(val) {
    const norm = (val - minVal) / range;
    return paddingY + chartH - norm * chartH;
  }

  function getX(idx, totalPontos) {
    if (totalPontos <= 1) return paddingX + chartW / 2;
    return paddingX + (idx / (totalPontos - 1)) * chartW;
  }

  function gerarPath(pontos) {
    if (!pontos || pontos.length === 0) return '';
    return pontos
      .map((val, idx) => {
        const x = getX(idx, pontos.length);
        const y = getY(val);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  function gerarArea(pontos) {
    if (!pontos || pontos.length === 0) return '';
    const line = gerarPath(pontos);
    const lastX = getX(pontos.length - 1, pontos.length);
    const firstX = getX(0, pontos.length);
    const bottomY = paddingY + chartH;
    return `${line} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
  }

  const path7 = gerarPath(mm7);
  const area7 = gerarArea(mm7);
  const path15 = gerarPath(mm15);
  const path30 = gerarPath(mm30);

  const gridLevels = [
    minVal,
    Math.round(minVal + range * 0.33),
    Math.round(minVal + range * 0.66),
    maxVal,
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        animation: 'fadeIn 0.25s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '92vh',
          backgroundColor: '#121212',
          border: '1px solid rgba(245, 221, 144, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header do Modal */}
        <div
          style={{
            padding: '20px 24px 16px 24px',
            borderBottom: '1px solid rgba(199, 199, 199, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(245, 221, 144, 0.05) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                backgroundColor: cor + '24',
                color: cor,
                border: '1px solid ' + cor + '55',
                borderRadius: '8px',
                padding: '4px 12px',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}
            >
              {codigo}
            </span>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#ECE6D8', letterSpacing: '-0.01em' }}>
                Projeção de Atendimento — {rotulo}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(236, 230, 216, 0.55)', marginTop: '2px' }}>
                Simulação preditiva de vazão e prazos ({polo.membros || 0} colaboradores vinculados)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(199,199,199,0.15)',
              borderRadius: '8px',
              color: 'rgba(236,230,216,0.7)',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* 4 Cards de Métricas da Projeção */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {/* 7 dias */}
            <div
              style={{
                background: 'rgba(95, 201, 168, 0.08)',
                border: '1px solid rgba(95, 201, 168, 0.3)',
                borderRadius: '10px',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.6)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#5fc9a8' }} />
                <span>Janela 7 Dias</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#5fc9a8' }}>
                {val7.toFixed(1)}%
              </div>
              <div style={{ fontSize: '10.5px', color: 'rgba(236,230,216,0.5)', marginTop: '2px' }}>
                Previsão de curto prazo
              </div>
            </div>

            {/* 15 dias */}
            <div
              style={{
                background: 'rgba(245, 221, 144, 0.08)',
                border: '1px solid rgba(245, 221, 144, 0.3)',
                borderRadius: '10px',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.6)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f5dd90' }} />
                <span>Janela 15 Dias</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f5dd90' }}>
                {val15.toFixed(1)}%
              </div>
              <div style={{ fontSize: '10.5px', color: 'rgba(236,230,216,0.5)', marginTop: '2px' }}>
                Tendência intermediária
              </div>
            </div>

            {/* 30 dias */}
            <div
              style={{
                background: 'rgba(192, 104, 240, 0.08)',
                border: '1px solid rgba(192, 104, 240, 0.3)',
                borderRadius: '10px',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.6)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#c068f0' }} />
                <span>Janela 30 Dias</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#c068f0' }}>
                {val30.toFixed(1)}%
              </div>
              <div style={{ fontSize: '10.5px', color: 'rgba(236,230,216,0.5)', marginTop: '2px' }}>
                Visão mensal consolidada
              </div>
            </div>

            {/* Taxa de Resolução Atual */}
            <div
              style={{
                background: 'rgba(91, 155, 219, 0.08)',
                border: '1px solid rgba(91, 155, 219, 0.3)',
                borderRadius: '10px',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.6)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#5b9bdb' }} />
                <span>Taxa de Resolução</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#5b9bdb' }}>
                {(polo.taxaResolucao || 0).toFixed(1)}%
              </div>
              <div style={{ fontSize: '10.5px', color: 'rgba(236,230,216,0.5)', marginTop: '2px' }}>
                Concluídas sobre o total
              </div>
            </div>
          </div>

          {/* Gráfico Detalhado SVG */}
          <div
            style={{
              background: '#0d0d0d',
              border: '1px solid rgba(199,199,199,0.12)',
              borderRadius: '12px',
              padding: '16px 12px 12px 12px',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingLeft: '12px', paddingRight: '12px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#ECE6D8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', color: '#5fc9a8' }}>↗</span>
                <span>Curvas de Tendência Temporal</span>
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(236,230,216,0.5)' }}>
                Taxa de resolução estimada por horizonte
              </span>
            </div>

            <svg
              viewBox={`0 0 ${width} ${height}`}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            >
              <defs>
                <linearGradient id="modalGrad7d" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5fc9a8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#5fc9a8" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Linhas de Grade e Rótulos */}
              {gridLevels.map((lvl) => {
                const y = getY(lvl);
                return (
                  <g key={lvl}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={width - paddingX}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fill="rgba(236, 230, 216, 0.4)"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {lvl}%
                    </text>
                  </g>
                );
              })}

              {/* Área 7d */}
              {area7 && <path d={area7} fill="url(#modalGrad7d)" />}

              {/* Curva 30d (violeta) */}
              {path30 && (
                <path
                  d={path30}
                  fill="none"
                  stroke="#c068f0"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Curva 15d (dourada tracejada) */}
              {path15 && (
                <path
                  d={path15}
                  fill="none"
                  stroke="#f5dd90"
                  strokeWidth="2.8"
                  strokeDasharray="6 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Curva 7d (verde esmeralda contínua) */}
              {path7 && (
                <path
                  d={path7}
                  fill="none"
                  stroke="#5fc9a8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Pontos finais destacados */}
              {mm7.length > 0 && (
                <circle
                  cx={getX(mm7.length - 1, mm7.length)}
                  cy={getY(val7)}
                  r="5.5"
                  fill="#5fc9a8"
                  stroke="#121212"
                  strokeWidth="2.5"
                />
              )}
              {mm15.length > 0 && (
                <circle
                  cx={getX(mm15.length - 1, mm15.length)}
                  cy={getY(val15)}
                  r="5"
                  fill="#f5dd90"
                  stroke="#121212"
                  strokeWidth="2.5"
                />
              )}
              {mm30.length > 0 && (
                <circle
                  cx={getX(mm30.length - 1, mm30.length)}
                  cy={getY(val30)}
                  r="5"
                  fill="#c068f0"
                  stroke="#121212"
                  strokeWidth="2.5"
                />
              )}
            </svg>

            {/* Legenda Informativa */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '24px',
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(199, 199, 199, 0.08)',
                fontSize: '11.5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ width: '18px', height: '3.5px', backgroundColor: '#5fc9a8', borderRadius: '2px' }} />
                <span style={{ color: '#5fc9a8', fontWeight: 700 }}>7 Dias ({val7.toFixed(1)}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ width: '18px', height: '3px', borderTop: '2.5px dashed #f5dd90' }} />
                <span style={{ color: '#f5dd90', fontWeight: 700 }}>15 Dias ({val15.toFixed(1)}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ width: '18px', height: '3px', backgroundColor: '#c068f0', borderRadius: '2px' }} />
                <span style={{ color: '#c068f0', fontWeight: 700 }}>30 Dias ({val30.toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          {/* Dados operacionais do polo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(199,199,199,0.08)',
              borderRadius: '10px',
              padding: '12px 18px',
              fontSize: '12px',
            }}
          >
            <div>
              <span style={{ color: 'rgba(236,230,216,0.5)' }}>Total de Tarefas: </span>
              <strong style={{ color: '#ECE6D8' }}>{(polo.total || 0).toLocaleString('pt-BR')}</strong>
            </div>
            <div>
              <span style={{ color: 'rgba(236,230,216,0.5)' }}>Concluídas: </span>
              <strong style={{ color: '#5fc9a8' }}>{(polo.concluidas || 0).toLocaleString('pt-BR')}</strong>
            </div>
            <div>
              <span style={{ color: 'rgba(236,230,216,0.5)' }}>Em Andamento: </span>
              <strong style={{ color: '#5b9bdb' }}>{(polo.noPrazo || 0).toLocaleString('pt-BR')}</strong>
            </div>
            <div>
              <span style={{ color: 'rgba(236,230,216,0.5)' }}>Atrasadas: </span>
              <strong style={{ color: '#e0796f' }}>{(polo.atrasadas || 0).toLocaleString('pt-BR')}</strong>
            </div>
          </div>

        </div>

        {/* Rodapé com Ações */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(199, 199, 199, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              onFechar();
              if (onVerTarefas) onVerTarefas(polo);
            }}
            style={{
              background: 'rgba(91, 155, 219, 0.15)',
              border: '1px solid rgba(91, 155, 219, 0.4)',
              borderRadius: '8px',
              color: '#5b9bdb',
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <IconExternal size={14} />
            <span>Ver Lista de Tarefas deste Polo ({polo.total || 0})</span>
          </button>

          <button
            type="button"
            onClick={onFechar}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(199, 199, 199, 0.2)',
              borderRadius: '8px',
              color: '#ECE6D8',
              padding: '8px 18px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
