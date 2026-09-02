import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Estilos utilitários inline
const s = (str) => {
  const obj = {};
  str.split(';').forEach((pair) => {
    const [k, v] = pair.split(':');
    if (k && v) {
      const camel = k.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      obj[camel] = v.trim();
    }
  });
  return obj;
};

function formatarData(dataStr) {
  if (!dataStr) return '—';
  try {
    const d = new Date(dataStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatarDuracao(ms) {
  if (!ms || ms <= 0 || Number.isNaN(ms)) return '—';
  const min = Math.round(ms / (1000 * 60));
  if (min < 60) return `${min}m`;
  const horas = Math.floor(min / 60);
  const minRest = min % 60;
  if (horas < 24) return `${horas}h ${minRest}m`;
  const dias = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
  return `${dias} dias`;
}

export default function ModalDesempenhoColaborador({
  colaborador,
  tarefas = [],
  poloLabels = {},
  corPolo = {},
  onClose,
  onAbrirBitrix,
}) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 15;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!colaborador) return null;

  // 1. Filtra as tarefas deste colaborador/advogado respeitando polo, regras de CPF e 48h
  const tarefasDoColaborador = useMemo(() => {
    const nomeNorm = (colaborador.nome || '').toLowerCase().trim();
    const papel = (colaborador.papel || '').toLowerCase();
    const polo = colaborador.polo;
    const ehEscalao48h = Boolean(colaborador.ehEscalao48h);
    const digitosCpf = Array.isArray(colaborador.digitosCpf) ? colaborador.digitosCpf : [];

    return tarefas.filter((t) => {
      // Se a regra pertence a um polo específico, tarefa deve ser desse polo
      if (polo && t.poloCobranca && t.poloCobranca !== polo) {
        return false;
      }

      const cobradorNome = (
        t.equipeCobrancaColaboradorNome ||
        t.colaboradorNome ||
        ''
      ).toLowerCase().trim();

      const advogadoNome = (
        t.equipeCobrancaAdvogado ||
        t.advogado ||
        ''
      ).toLowerCase().trim();

      if (papel.includes('advogad')) {
        if (advogadoNome && (advogadoNome.includes(nomeNorm) || nomeNorm.includes(advogadoNome))) {
          return true;
        }
        if (digitosCpf.length > 0 && t.digitoCpfCliente != null && digitosCpf.includes(Number(t.digitoCpfCliente))) {
          return true;
        }
        return false;
      }

      // Cobrador(a):
      // A) Nome atribuído bate diretamente com o cobrador
      if (cobradorNome && (cobradorNome.includes(nomeNorm) || nomeNorm.includes(cobradorNome))) {
        return true;
      }

      // B) Regra de contingência 48 horas
      if (ehEscalao48h) {
        return Boolean(t.emEscalao48h || t.ehEscalao48h);
      }

      // C) Regra por dígitos de CPF
      if (digitosCpf.length > 0 && t.digitoCpfCliente != null && digitosCpf.includes(Number(t.digitoCpfCliente))) {
        return true;
      }

      // D) Fallback por responsavelNome somente se NÃO houver critério de CPF ou 48h
      if (digitosCpf.length === 0 && !ehEscalao48h) {
        const resp = (t.responsavelNome || '').toLowerCase().trim();
        if (resp && (resp.includes(nomeNorm) || nomeNorm.includes(resp))) {
          return true;
        }
      }

      return false;
    });
  }, [tarefas, colaborador]);

  // 2. Métricas de Desempenho
  const metricas = useMemo(() => {
    const total = tarefasDoColaborador.length;
    const concluidas = tarefasDoColaborador.filter((t) => t.situacaoPrazo === 'concluida');
    const atrasadas = tarefasDoColaborador.filter((t) => t.situacaoPrazo === 'atrasada');
    const noPrazo = tarefasDoColaborador.filter((t) => t.situacaoPrazo === 'no_prazo');

    const taxaConclusao = total > 0 ? (concluidas.length / total) * 100 : 0;
    const taxaAtraso = total > 0 ? (atrasadas.length / total) * 100 : 0;

    // Conclusão desde a criação da tarefa (tempo médio)
    let somaTempoConclusaoMs = 0;
    let qtdTarefasConcluidasComDatas = 0;

    concluidas.forEach((t) => {
      const inicio = t.criadoEm ? new Date(t.criadoEm).getTime() : null;
      const fim = t.finalizadoEm
        ? new Date(t.finalizadoEm).getTime()
        : t.atualizadoEm
        ? new Date(t.atualizadoEm).getTime()
        : t.atendidoEm
        ? new Date(t.atendidoEm).getTime()
        : null;

      if (inicio && fim && fim >= inicio) {
        somaTempoConclusaoMs += fim - inicio;
        qtdTarefasConcluidasComDatas++;
      }
    });

    const tempoMedioConclusaoMs =
      qtdTarefasConcluidasComDatas > 0
        ? somaTempoConclusaoMs / qtdTarefasConcluidasComDatas
        : null;

    // Média de tempo entre as atividades da tarefa (intervalo de atendimento)
    let somaTempoAtividadesMs = 0;
    let qtdTarefasComAtividade = 0;

    tarefasDoColaborador.forEach((t) => {
      const inicio = t.criadoEm ? new Date(t.criadoEm).getTime() : null;
      const atividade = t.atendidoEm
        ? new Date(t.atendidoEm).getTime()
        : t.atualizadoEm && t.atualizadoEm !== t.criadoEm
        ? new Date(t.atualizadoEm).getTime()
        : t.finalizadoEm
        ? new Date(t.finalizadoEm).getTime()
        : null;

      if (inicio && atividade && atividade >= inicio) {
        somaTempoAtividadesMs += atividade - inicio;
        qtdTarefasComAtividade++;
      }
    });

    const tempoMedioAtividadesMs =
      qtdTarefasComAtividade > 0
        ? somaTempoAtividadesMs / qtdTarefasComAtividade
        : null;

    return {
      total,
      concluidasCount: concluidas.length,
      atrasadasCount: atrasadas.length,
      noPrazoCount: noPrazo.length,
      taxaConclusao,
      taxaAtraso,
      tempoMedioConclusaoMs,
      tempoMedioAtividadesMs,
    };
  }, [tarefasDoColaborador]);

  // 3. Filtragem de tarefas por busca de texto e status
  const tarefasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return tarefasDoColaborador.filter((t) => {
      if (filtroStatus === 'concluida' && t.situacaoPrazo !== 'concluida') return false;
      if (filtroStatus === 'atrasada' && t.situacaoPrazo !== 'atrasada') return false;
      if (filtroStatus === 'no_prazo' && t.situacaoPrazo !== 'no_prazo') return false;

      if (q) {
        const texto = [
          t.clienteNome || '',
          t.titulo || '',
          String(t.id || ''),
          t.cpfCliente || '',
          String(t.digitoCpfCliente ?? ''),
          t.poloCobranca || '',
        ]
          .join(' ')
          .toLowerCase();

        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [tarefasDoColaborador, busca, filtroStatus]);

  const totalPaginas = Math.max(1, Math.ceil(tarefasFiltradas.length / ITENS_POR_PAGINA));
  const tarefasPaginadas = useMemo(() => {
    const inicio = (pagina - 1) * ITENS_POR_PAGINA;
    return tarefasFiltradas.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [tarefasFiltradas, pagina]);

  const corBadge = corPolo[colaborador.polo] || '#5b9bdb';

  const modalNode = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#111111',
          border: '1px solid rgba(199, 199, 199, 0.18)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1040px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          color: '#ECE6D8',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(199, 199, 199, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: corBadge + '25',
                color: corBadge,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                fontWeight: 800,
                border: '1px solid ' + corBadge + '45',
              }}
            >
              {(colaborador.nome || 'C')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0].toUpperCase())
                .join('')}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '18px', fontWeight: 700 }}>
                  {colaborador.nome}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(245, 221, 144, 0.15)',
                    color: '#f5dd90',
                    border: '1px solid rgba(245, 221, 144, 0.3)',
                  }}
                >
                  {colaborador.papel || 'Cobrador(a)'}
                </span>
                {colaborador.polo && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: corBadge + '20',
                      color: corBadge,
                      border: '1px solid ' + corBadge + '40',
                    }}
                  >
                    {poloLabels[colaborador.polo] || colaborador.polo}
                  </span>
                )}
                {colaborador.criterio && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'rgba(236,230,216,0.6)',
                      background: 'rgba(255,255,255,0.04)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {colaborador.criterio}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(236,230,216,0.5)', marginTop: '3px' }}>
                Desempenho individual e histórico de tarefas
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(236, 230, 216, 0.5)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '8px',
              lineHeight: 1,
            }}
            title="Fechar (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Cards de Métricas */}
        <div
          style={{
            padding: '18px 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            borderBottom: '1px solid rgba(199, 199, 199, 0.1)',
            background: 'rgba(0,0,0,0.15)',
          }}
        >
          {/* Card 1: Quantidade de Tarefas */}
          <div
            style={{
              background: '#161616',
              border: '1px solid rgba(199, 199, 199, 0.12)',
              borderRadius: '10px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.5)', fontWeight: 600 }}>
              QUANTIDADE DE TAREFAS
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#ECE6D8' }}>
              {metricas.total}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.5)', marginTop: '6px', display: 'flex', gap: '8px' }}>
              <span style={{ color: '#5fc9a8' }}>✓ {metricas.concluidasCount}</span>
              <span style={{ color: '#5b9bdb' }}>● {metricas.noPrazoCount}</span>
              <span style={{ color: '#e0796f' }}>▲ {metricas.atrasadasCount}</span>
            </div>
          </div>

          {/* Card 2: Conclusão desde a criação da tarefa */}
          <div
            style={{
              background: '#161616',
              border: '1px solid rgba(199, 199, 199, 0.12)',
              borderRadius: '10px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.5)', fontWeight: 600 }}>
              CONCLUSÃO DESDE A CRIAÇÃO
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#5fc9a8' }}>
              {metricas.taxaConclusao.toFixed(1)}%
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.6)', marginTop: '6px' }}>
              Média:{' '}
              <strong style={{ color: '#ECE6D8' }}>
                {formatarDuracao(metricas.tempoMedioConclusaoMs)}
              </strong>
            </div>
          </div>

          {/* Card 3: Média de tempo entre atividades */}
          <div
            style={{
              background: '#161616',
              border: '1px solid rgba(199, 199, 199, 0.12)',
              borderRadius: '10px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.5)', fontWeight: 600 }}>
              TEMPO ENTRE ATIVIDADES
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#f5dd90' }}>
              {formatarDuracao(metricas.tempoMedioAtividadesMs)}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.5)', marginTop: '6px' }}>
              Intervalo médio de resposta
            </div>
          </div>

          {/* Card 4: Taxa de atraso */}
          <div
            style={{
              background: '#161616',
              border: '1px solid rgba(199, 199, 199, 0.12)',
              borderRadius: '10px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.5)', fontWeight: 600 }}>
              TAXA DE ATRASO
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 800,
                marginTop: '4px',
                color: metricas.taxaAtraso > 30 ? '#e0796f' : '#5fc9a8',
              }}
            >
              {metricas.taxaAtraso.toFixed(1)}%
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.5)', marginTop: '6px' }}>
              {metricas.atrasadasCount} de {metricas.total} atrasadas
            </div>
          </div>
        </div>

        {/* Barra de Busca e Filtros das Tarefas */}
        <div
          style={{
            padding: '14px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            background: 'rgba(255,255,255,0.01)',
            borderBottom: '1px solid rgba(199, 199, 199, 0.1)',
          }}
        >
          {/* Campo de Busca em Tempo Real */}
          <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar por cliente, título, CPF ou ID da tarefa..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              style={{
                width: '100%',
                background: '#161616',
                border: '1px solid rgba(199, 199, 199, 0.2)',
                borderRadius: '8px',
                padding: '8px 12px 8px 34px',
                color: '#ECE6D8',
                fontSize: '12.5px',
                outline: 'none',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(236,230,216,0.4)',
                fontSize: '13px',
              }}
            >
              🔍
            </span>
            {busca && (
              <button
                onClick={() => setBusca('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(236,230,216,0.5)',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros rápidos de status */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'todas', label: `Todas (${metricas.total})` },
              { id: 'atrasada', label: `Atrasadas (${metricas.atrasadasCount})`, cor: '#e0796f' },
              { id: 'no_prazo', label: `No Prazo (${metricas.noPrazoCount})`, cor: '#5b9bdb' },
              { id: 'concluida', label: `Concluídas (${metricas.concluidasCount})`, cor: '#5fc9a8' },
            ].map((f) => {
              const ativo = filtroStatus === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setFiltroStatus(f.id);
                    setPagina(1);
                  }}
                  style={{
                    background: ativo ? 'rgba(245, 221, 144, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: ativo ? (f.cor || '#f5dd90') : 'rgba(236,230,216,0.6)',
                    border: `1px solid ${ativo ? (f.cor || '#f5dd90') : 'rgba(199, 199, 199, 0.12)'}`,
                    borderRadius: '6px',
                    padding: '6px 11px',
                    fontSize: '11.5px',
                    fontWeight: ativo ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabela de Tarefas */}
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px' }}>
          {tarefasFiltradas.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(236,230,216,0.5)' }}>
              Nenhuma tarefa encontrada com os filtros selecionados.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    position: 'sticky',
                    top: 0,
                    background: '#161616',
                    zIndex: 1,
                    borderBottom: '1px solid rgba(199, 199, 199, 0.14)',
                    color: 'rgba(236,230,216,0.6)',
                    fontSize: '11.5px',
                  }}
                >
                  <th style={{ padding: '10px 16px' }}>Cliente / Tarefa</th>
                  <th style={{ padding: '10px 16px' }}>Polo</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                  <th style={{ padding: '10px 16px' }}>Criação</th>
                  <th style={{ padding: '10px 16px' }}>Prazo / Conclusão</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {tarefasPaginadas.map((t) => {
                  let corStatus = '#5b9bdb';
                  let rotuloStatus = 'No Prazo';
                  if (t.situacaoPrazo === 'concluida') {
                    corStatus = '#5fc9a8';
                    rotuloStatus = 'Concluída';
                  } else if (t.situacaoPrazo === 'atrasada') {
                    corStatus = '#e0796f';
                    rotuloStatus = 'Atrasada';
                  }

                  const poloCod = t.poloCobranca || t.estadoUf || '';
                  const corPoloItem = corPolo[poloCod] || '#5b9bdb';

                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: '1px solid rgba(199, 199, 199, 0.07)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Cliente / Título */}
                      <td style={{ padding: '10px 16px', maxWidth: '300px' }}>
                        <div style={{ fontWeight: 600, color: '#ECE6D8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.clienteNome || t.titulo}
                        </div>
                        {t.clienteNome && t.titulo && t.clienteNome !== t.titulo && (
                          <div style={{ fontSize: '11px', color: 'rgba(236,230,216,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.titulo}
                          </div>
                        )}
                        {t.digitoCpfCliente != null && (
                          <span style={{ fontSize: '10.5px', color: 'rgba(236,230,216,0.4)' }}>
                            CPF final {t.digitoCpfCliente}
                          </span>
                        )}
                      </td>

                      {/* Polo */}
                      <td style={{ padding: '10px 16px' }}>
                        {poloCod ? (
                          <span
                            style={{
                              backgroundColor: corPoloItem + '20',
                              color: corPoloItem,
                              border: '1px solid ' + corPoloItem + '40',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                            }}
                          >
                            {poloLabels[poloCod] || poloCod}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            backgroundColor: corStatus + '20',
                            color: corStatus,
                            border: '1px solid ' + corStatus + '45',
                            borderRadius: '99px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {rotuloStatus}
                        </span>
                      </td>

                      {/* Criação */}
                      <td style={{ padding: '10px 16px', color: 'rgba(236,230,216,0.7)', fontSize: '11px' }}>
                        {formatarData(t.criadoEm)}
                      </td>

                      {/* Prazo ou Conclusão */}
                      <td style={{ padding: '10px 16px', fontSize: '11px', color: 'rgba(236,230,216,0.7)' }}>
                        {t.situacaoPrazo === 'concluida' ? (
                          <span style={{ color: '#5fc9a8' }}>
                            Concluída: {formatarData(t.finalizadoEm || t.atualizadoEm)}
                          </span>
                        ) : t.prazoFinal ? (
                          <span style={{ color: t.situacaoPrazo === 'atrasada' ? '#e0796f' : 'inherit' }}>
                            Prazo: {formatarData(t.prazoFinal)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Ação */}
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => onAbrirBitrix && onAbrirBitrix(t)}
                          title="Abrir tarefa no Bitrix24 (pop-up)"
                          style={{
                            background: 'rgba(245, 221, 144, 0.1)',
                            border: '1px solid rgba(245, 221, 144, 0.3)',
                            borderRadius: '6px',
                            color: '#f5dd90',
                            padding: '4px 9px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(245, 221, 144, 0.2)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(245, 221, 144, 0.1)')}
                        >
                          Abrir ↗
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé com Paginação */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid rgba(199, 199, 199, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: 'rgba(236,230,216,0.6)',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div>
            Mostrando {tarefasFiltradas.length > 0 ? (pagina - 1) * ITENS_POR_PAGINA + 1 : 0} a{' '}
            {Math.min(pagina * ITENS_POR_PAGINA, tarefasFiltradas.length)} de{' '}
            {tarefasFiltradas.length} tarefas
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(199, 199, 199, 0.2)',
                borderRadius: '6px',
                color: pagina <= 1 ? 'rgba(236,230,216,0.3)' : '#ECE6D8',
                padding: '4px 10px',
                fontSize: '11.5px',
                cursor: pagina <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Anterior
            </button>
            <span>
              Página {pagina} de {totalPaginas}
            </span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(199, 199, 199, 0.2)',
                borderRadius: '6px',
                color: pagina >= totalPaginas ? 'rgba(236,230,216,0.3)' : '#ECE6D8',
                padding: '4px 10px',
                fontSize: '11.5px',
                cursor: pagina >= totalPaginas ? 'not-allowed' : 'pointer',
              }}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalNode, document.body);
  }

  return modalNode;
}
