import React, { useState, useMemo, useEffect } from 'react';
import { s } from '../style.js';
import { IconX, IconSearch, IconExternal } from './Icons.jsx';
import { COR_STATUS, STATUS_LABEL, BTN_PAG, BTN_PAG_OFF } from '../data.js';
import AnimatedList from './AnimatedList.jsx';

const PAGE_SIZE = 20;

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
  polo = null,
  regras = [],
  criterio = null,
  onAbrirBitrix,
  onFechar,
}) {
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [ordemColuna, setOrdemColuna] = useState('cliente');
  const [ordemDirecao, setOrdemDirecao] = useState('asc'); // 'asc' | 'desc'
  const [filtroEquipeId, setFiltroEquipeId] = useState('todas');
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null); // { nome: string, tipo: 'cobrador' | 'advogado' } | null

  // Identifica o código do polo deste modal
  const poloAtual = useMemo(() => {
    if (polo) return polo;
    if (tarefas.length > 0 && tarefas[0].poloCobranca) {
      return tarefas[0].poloCobranca;
    }
    return null;
  }, [polo, tarefas]);

  // Monta as equipes (Cobrador/Advogado) para cada CPF naquele polo no formato: Cobrador - Advogado - (Número(s) de CPF)
  const equipesDoPolo = useMemo(() => {
    if (!poloAtual || !regras || regras.length === 0) return [];
    const regrasPolo = regras.filter((r) => r.polo === poloAtual);

    return regrasPolo.map((r) => {
      let critTexto = '';
      if (r.ehEscalao48h) {
        critTexto = '48 horas';
      } else if (Array.isArray(r.digitosCpf) && r.digitosCpf.length > 0) {
        const d = r.digitosCpf;
        if (d.length === 1) critTexto = `CPF ${d[0]}`;
        else if (d.length === 5 && d[0] === 0 && d[4] === 4) critTexto = 'CPF final 0 a 4';
        else if (d.length === 5 && d[0] === 5 && d[4] === 9) critTexto = 'CPF final 5 a 9';
        else if (d.length === 2) critTexto = `CPF ${d[0]} e ${d[1]}`;
        else if (d.length === 3) critTexto = `CPF ${d[0]}, ${d[1]} e ${d[2]}`;
        else if (d.length === 4) critTexto = `CPF ${d[0]}, ${d[1]}, ${d[2]} e ${d[3]}`;
        else critTexto = `CPF ${d.join(', ')}`;
      } else {
        critTexto = 'Sem CPF vinculado';
      }

      const cobrador = r.colaboradorNome || 'Cobrador não definido';
      const advogado = r.advogado || 'Sem advogado';
      const label = `${cobrador} - ${advogado} - (${critTexto})`;

      const qtdTarefas = tarefas.filter((t) => {
        if (r.ehEscalao48h) return Boolean(t.emEscalao48h || t.ehEscalao48h);
        if (Array.isArray(r.digitosCpf) && r.digitosCpf.length > 0) {
          if (t.digitoCpfCliente != null && r.digitosCpf.includes(Number(t.digitoCpfCliente))) {
            return true;
          }
        }
        const cobT = (t.equipeCobrancaColaboradorNome || t.colaboradorNome || '').toLowerCase().trim();
        const cobR = (r.colaboradorNome || '').toLowerCase().trim();
        return Boolean(cobR && cobT && (cobT.includes(cobR) || cobR.includes(cobT)));
      }).length;

      return {
        id: String(r.id),
        regra: r,
        label,
        qtdTarefas,
      };
    });
  }, [poloAtual, regras, tarefas]);

  // Verifica dimensões que realmente variam entre as tarefas deste modal para não exibir ordenações redundantes
  const polosDistintos = useMemo(
    () => new Set(tarefas.map((t) => t.poloCobranca).filter(Boolean)),
    [tarefas]
  );
  const statusDistintos = useMemo(
    () => new Set(tarefas.map((t) => t.situacaoPrazo).filter(Boolean)),
    [tarefas]
  );
  const temMultiplosPolos = polosDistintos.size > 1;

  // Aba ativa de visualização do ranking de faturamento
  const [abaRanking, setAbaRanking] = useState('times'); // 'times' | 'cobradores' | 'advogados'

  // Ranking de Times (Cobrador ↔ Advogado relacionados a números de CPF) que mais faturaram
  const timesFaturamento = useMemo(() => {
    if (criterio !== 'faturamento' || !equipesDoPolo || equipesDoPolo.length === 0) return [];

    return equipesDoPolo.map((eq) => {
      const r = eq.regra;
      const tarefasDoTime = tarefas.filter((t) => {
        if (r.ehEscalao48h) return Boolean(t.emEscalao48h || t.ehEscalao48h);
        if (Array.isArray(r.digitosCpf) && r.digitosCpf.length > 0) {
          if (t.digitoCpfCliente != null && r.digitosCpf.includes(Number(t.digitoCpfCliente))) {
            return true;
          }
        }
        const cobT = (t.equipeCobrancaColaboradorNome || t.colaboradorNome || '').toLowerCase().trim();
        const cobR = (r.colaboradorNome || '').toLowerCase().trim();
        return Boolean(cobR && cobT && (cobT.includes(cobR) || cobR.includes(cobT)));
      });

      let totalFaturamento = 0;
      let totalRecebido = 0;
      let totalInadimplente = 0;
      let adimplentesCount = 0;
      let inadimplentesCount = 0;

      for (const t of tarefasDoTime) {
        const valor = (typeof t.valorCobranca === 'number' && !isNaN(t.valorCobranca) && t.valorCobranca > 0)
          ? t.valorCobranca
          : ((typeof t.valorRecebidoAsaas === 'number' ? t.valorRecebidoAsaas : 0) + (typeof t.valorInadimplente === 'number' ? t.valorInadimplente : 0));

        totalFaturamento += valor;
        if (typeof t.valorRecebidoAsaas === 'number' && !isNaN(t.valorRecebidoAsaas)) totalRecebido += t.valorRecebidoAsaas;
        if (typeof t.valorInadimplente === 'number' && !isNaN(t.valorInadimplente)) totalInadimplente += t.valorInadimplente;
        const sit = (t.situacaoFinanceira || '').toUpperCase();
        if (sit === 'ADIMPLENTE') adimplentesCount++;
        else if (sit === 'INADIMPLENTE') inadimplentesCount++;
      }

      const somaAsaas = totalRecebido + totalInadimplente;
      const taxaAdimplencia = somaAsaas > 0
        ? (totalRecebido / somaAsaas) * 100
        : ((adimplentesCount + inadimplentesCount) > 0 ? (adimplentesCount / (adimplentesCount + inadimplentesCount)) * 100 : 100);

      return {
        id: eq.id,
        label: eq.label,
        regra: r,
        cobrador: r.colaboradorNome || 'Cobrador não definido',
        advogado: r.advogado || 'Sem advogado',
        cpfTexto: r.ehEscalao48h ? 'Escalão 48 Horas' : (Array.isArray(r.digitosCpf) && r.digitosCpf.length > 0 ? `CPF final ${r.digitosCpf.join(', ')}` : 'Sem CPF'),
        totalFaturamento,
        totalRecebido,
        totalInadimplente,
        adimplentesCount,
        inadimplentesCount,
        taxaAdimplencia,
        qtdTarefas: tarefasDoTime.length,
      };
    }).sort((a, b) => (b.totalFaturamento - a.totalFaturamento) || (b.totalRecebido - a.totalRecebido) || (b.qtdTarefas - a.qtdTarefas));
  }, [criterio, equipesDoPolo, tarefas]);

  // Quando em modo Faturamento, calcula o ranking dos colaboradores (cobradores e advogados) que mais faturaram
  const rankingFinanceiro = useMemo(() => {
    if (criterio !== 'faturamento') return null;

    const mapaCobradores = new Map();
    const mapaAdvogados = new Map();

    for (const t of tarefas) {
      const valor = (typeof t.valorCobranca === 'number' && !isNaN(t.valorCobranca) && t.valorCobranca > 0)
        ? t.valorCobranca
        : ((typeof t.valorRecebidoAsaas === 'number' ? t.valorRecebidoAsaas : 0) + (typeof t.valorInadimplente === 'number' ? t.valorInadimplente : 0));

      const recebido = typeof t.valorRecebidoAsaas === 'number' && !isNaN(t.valorRecebidoAsaas) ? t.valorRecebidoAsaas : 0;
      const inadimplente = typeof t.valorInadimplente === 'number' && !isNaN(t.valorInadimplente) ? t.valorInadimplente : 0;
      const sit = (t.situacaoFinanceira || '').toUpperCase();
      const isAdimplente = sit === 'ADIMPLENTE';
      const isInadimplente = sit === 'INADIMPLENTE';

      // 1. Cobrador
      const cobNome = t.equipeCobrancaColaboradorNome || t.colaboradorNome || t.responsavelNome;
      if (cobNome && cobNome !== '—' && cobNome !== 'Cobrador não definido') {
        if (!mapaCobradores.has(cobNome)) {
          mapaCobradores.set(cobNome, {
            nome: cobNome,
            tipo: 'cobrador',
            totalFaturamento: 0,
            totalRecebido: 0,
            totalInadimplente: 0,
            adimplentesCount: 0,
            inadimplentesCount: 0,
            tarefasCount: 0,
          });
        }
        const c = mapaCobradores.get(cobNome);
        c.totalFaturamento += valor;
        c.totalRecebido += recebido;
        c.totalInadimplente += inadimplente;
        if (isAdimplente) c.adimplentesCount++;
        if (isInadimplente) c.inadimplentesCount++;
        c.tarefasCount++;
      }

      // 2. Advogado
      const advNome = t.equipeCobrancaAdvogado || t.advogado;
      if (advNome && advNome !== 'Sem advogado' && advNome !== '—') {
        if (!mapaAdvogados.has(advNome)) {
          mapaAdvogados.set(advNome, {
            nome: advNome,
            tipo: 'advogado',
            totalFaturamento: 0,
            totalRecebido: 0,
            totalInadimplente: 0,
            adimplentesCount: 0,
            inadimplentesCount: 0,
            tarefasCount: 0,
          });
        }
        const a = mapaAdvogados.get(advNome);
        a.totalFaturamento += valor;
        a.totalRecebido += recebido;
        a.totalInadimplente += inadimplente;
        if (isAdimplente) a.adimplentesCount++;
        if (isInadimplente) a.inadimplentesCount++;
        a.tarefasCount++;
      }
    }

    function prepararLista(mapa) {
      return Array.from(mapa.values())
        .map((item) => {
          const somaAsaas = item.totalRecebido + item.totalInadimplente;
          const taxa = somaAsaas > 0
            ? (item.totalRecebido / somaAsaas) * 100
            : ((item.adimplentesCount + item.inadimplentesCount) > 0 ? (item.adimplentesCount / (item.adimplentesCount + item.inadimplentesCount)) * 100 : 100);
          return { ...item, taxaAdimplencia: taxa };
        })
        .sort((a, b) => (b.totalFaturamento - a.totalFaturamento) || (b.totalRecebido - a.totalRecebido) || (b.tarefasCount - a.tarefasCount));
    }

    return {
      cobradores: prepararLista(mapaCobradores),
      advogados: prepararLista(mapaAdvogados),
    };
  }, [criterio, tarefas]);

  const colunasOrdenacaoDisponiveis = useMemo(() => {
    return COLUNAS_ORDENACAO.filter((col) => {
      // Se todas as tarefas são do mesmo polo/estado, ordenar por polo é redundante
      if (col.key === 'polo' && !temMultiplosPolos) return false;
      // Se todas as tarefas têm o mesmo status (ex: modal de atrasadas), ordenar por status é redundante
      if (col.key === 'status' && statusDistintos.size <= 1) return false;
      return true;
    });
  }, [temMultiplosPolos, statusDistintos]);

  useEffect(() => {
    if (ordemColuna === 'polo' && !temMultiplosPolos) {
      setOrdemColuna('cliente');
    }
    if (ordemColuna === 'status' && statusDistintos.size <= 1) {
      setOrdemColuna('cliente');
    }
  }, [ordemColuna, temMultiplosPolos, statusDistintos]);

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
      if (ordemDirecao === 'asc') {
        setOrdemDirecao('desc');
      } else if (ordemDirecao === 'desc') {
        setOrdemColuna(null);
        setOrdemDirecao('asc');
      }
    } else {
      setOrdemColuna(colunaKey);
      setOrdemDirecao('asc');
    }
    setPagina(1);
  };

  const buscaNorm = busca.trim().toLowerCase();
  const buscaNumeros = busca.replace(/\D/g, '');

  const tarefasFiltradas = useMemo(() => {
    let filtradas = tarefas;

    // Filtro por Colaborador selecionado no Ranking de Faturamento
    if (colaboradorSelecionado) {
      filtradas = filtradas.filter((t) => {
        if (colaboradorSelecionado.tipo === 'cobrador') {
          const cobT = (t.equipeCobrancaColaboradorNome || t.colaboradorNome || t.responsavelNome || '').toLowerCase().trim();
          return cobT.includes(colaboradorSelecionado.nome.toLowerCase().trim());
        } else if (colaboradorSelecionado.tipo === 'advogado') {
          const advT = (t.equipeCobrancaAdvogado || t.advogado || '').toLowerCase().trim();
          return advT.includes(colaboradorSelecionado.nome.toLowerCase().trim());
        }
        return true;
      });
    }

    // 1. Filtro por Equipe (select do modal)
    if (filtroEquipeId !== 'todas') {
      const eq = equipesDoPolo.find((e) => e.id === filtroEquipeId);
      if (eq) {
        const r = eq.regra;
        filtradas = filtradas.filter((t) => {
          if (r.ehEscalao48h) return Boolean(t.emEscalao48h || t.ehEscalao48h);
          if (Array.isArray(r.digitosCpf) && r.digitosCpf.length > 0) {
            const digitoOk = t.digitoCpfCliente != null && r.digitosCpf.includes(Number(t.digitoCpfCliente));
            const cobT = (t.equipeCobrancaColaboradorNome || t.colaboradorNome || '').toLowerCase().trim();
            const cobR = (r.colaboradorNome || '').toLowerCase().trim();
            const cobOk = Boolean(cobR && cobT && (cobT.includes(cobR) || cobR.includes(cobT)));
            return digitoOk || cobOk;
          }
          return false;
        });
      }
    }

    if (!buscaNorm) return filtradas;
    return filtradas.filter((t) => {
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
  }, [tarefas, filtroEquipeId, equipesDoPolo, buscaNorm, buscaNumeros, poloLabels]);

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
          width: '50vw',
          height: '75vh',
          minWidth: '525px',
          minHeight: '550px',
          maxWidth: '95vw',
          maxHeight: '92vh',
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

{/* ─── RANKING DE FATURAMENTO POR TIMES E COLABORADORES (MODO FATURAMENTO) ─── */}
        {criterio === 'faturamento' && (timesFaturamento.length > 0 || rankingFinanceiro) && (
          <div style={{ padding: '0 20px 10px 20px', flexShrink: 0 }}>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(245,221,144,0.06) 0%, rgba(20,20,20,0.88) 100%)',
                border: '1px solid rgba(245,221,144,0.24)',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '8px',
              }}
            >
              {/* Header do Ranking com Seletor de Abas */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🏆</span>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#f5dd90', letterSpacing: '-0.01em' }}>
                      Ranking de Faturamento deste Polo
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(236,230,216,0.45)', marginLeft: '6px' }}>
                      (Clique em um time para filtrar tarefas)
                    </span>
                  </div>
                </div>

                {/* Abas: Times por CPF | Cobradores | Advogados */}
                <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(199,199,199,0.1)' }}>
                  <button
                    type="button"
                    onClick={() => setAbaRanking('times')}
                    style={{
                      background: abaRanking === 'times' ? 'rgba(245,221,144,0.2)' : 'transparent',
                      color: abaRanking === 'times' ? '#f5dd90' : 'rgba(236,230,216,0.6)',
                      border: abaRanking === 'times' ? '1px solid rgba(245,221,144,0.35)' : 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    👥 Times por CPF ({timesFaturamento.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbaRanking('cobradores')}
                    style={{
                      background: abaRanking === 'cobradores' ? 'rgba(245,221,144,0.2)' : 'transparent',
                      color: abaRanking === 'cobradores' ? '#f5dd90' : 'rgba(236,230,216,0.6)',
                      border: abaRanking === 'cobradores' ? '1px solid rgba(245,221,144,0.35)' : 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    💼 Cobradores ({rankingFinanceiro?.cobradores?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbaRanking('advogados')}
                    style={{
                      background: abaRanking === 'advogados' ? 'rgba(245,221,144,0.2)' : 'transparent',
                      color: abaRanking === 'advogados' ? '#f5dd90' : 'rgba(236,230,216,0.6)',
                      border: abaRanking === 'advogados' ? '1px solid rgba(245,221,144,0.35)' : 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    ⚖️ Advogados ({rankingFinanceiro?.advogados?.length || 0})
                  </button>
                </div>
              </div>

              {/* Tag de filtro ativo se houver */}
              {(filtroEquipeId !== 'todas' || colaboradorSelecionado) && (
                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(236,230,216,0.6)' }}>Filtro selecionado no ranking:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroEquipeId('todas');
                      setColaboradorSelecionado(null);
                      setPagina(1);
                    }}
                    style={{
                      background: 'rgba(224,121,111,0.18)',
                      border: '1px solid rgba(224,121,111,0.4)',
                      color: '#e0796f',
                      borderRadius: '6px',
                      padding: '3px 9px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span>
                      {filtroEquipeId !== 'todas'
                        ? `Time: ${equipesDoPolo.find(e => e.id === filtroEquipeId)?.label || filtroEquipeId}`
                        : `${colaboradorSelecionado.tipo === 'cobrador' ? 'Cobrador' : 'Advogado'}: ${colaboradorSelecionado.nome}`}
                    </span>
                    <span>✕ Limpar filtro</span>
                  </button>
                </div>
              )}

              {/* CONTEÚDO DA ABA ATIVA */}

              {/* ABA 1: TIMES POR CPF */}
              {abaRanking === 'times' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {timesFaturamento.map((time, idx) => {
                    const isSelected = filtroEquipeId === time.id;
                    const medalha = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`;
                    return (
                      <div
                        key={time.id}
                        onClick={() => {
                          if (isSelected) setFiltroEquipeId('todas');
                          else {
                            setFiltroEquipeId(time.id);
                            setColaboradorSelecionado(null);
                          }
                          setPagina(1);
                        }}
                        title="Clique para filtrar tarefas deste time (Cobrador + Advogado + CPF)"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(245,221,144,0.18)' : 'rgba(255,255,255,0.03)',
                          border: isSelected ? '1.5px solid #f5dd90' : '1px solid rgba(199,199,199,0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, width: '22px', textAlign: 'center', flexShrink: 0 }}>
                            {medalha}
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#f5dd90' : '#ECE6D8' }}>
                                💼 {time.cobrador}
                              </span>
                              <span style={{ fontSize: '11px', color: 'rgba(236,230,216,0.45)' }}>↔</span>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#f5dd90' : '#ECE6D8' }}>
                                ⚖️ {time.advogado}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                              <span
                                style={{
                                  background: 'rgba(245,221,144,0.12)',
                                  color: '#f5dd90',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  borderRadius: '4px',
                                  padding: '1px 6px',
                                  border: '1px solid rgba(245,221,144,0.25)',
                                }}
                              >
                                {time.cpfTexto}
                              </span>
                              <span style={{ fontSize: '10.5px', color: 'rgba(236,230,216,0.5)' }}>
                                {time.qtdTarefas} tarefas
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#f5dd90' }}>
                            R$ {time.totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                          <div style={{ fontSize: '10px', color: time.taxaAdimplencia >= 70 ? '#5fc9a8' : 'rgba(236,230,216,0.5)', marginTop: '2px' }}>
                            {time.taxaAdimplencia.toFixed(0)}% adimplência
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ABA 2: COBRADORES INDIVIDUAIS */}
              {abaRanking === 'cobradores' && rankingFinanceiro && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {rankingFinanceiro.cobradores.map((cob, idx) => {
                    const isSelected = colaboradorSelecionado?.tipo === 'cobrador' && colaboradorSelecionado?.nome === cob.nome;
                    const medalha = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`;
                    return (
                      <div
                        key={cob.nome}
                        onClick={() => {
                          if (isSelected) setColaboradorSelecionado(null);
                          else {
                            setColaboradorSelecionado({ nome: cob.nome, tipo: 'cobrador' });
                            setFiltroEquipeId('todas');
                          }
                          setPagina(1);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: isSelected ? 'rgba(245,221,144,0.18)' : 'rgba(255,255,255,0.03)',
                          border: isSelected ? '1px solid #f5dd90' : '1px solid rgba(199,199,199,0.08)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, width: '18px', textAlign: 'center' }}>{medalha}</span>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: isSelected ? '#f5dd90' : '#ECE6D8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cob.nome}
                          </span>
                          <span style={{ fontSize: '10px', color: 'rgba(236,230,216,0.45)' }}>({cob.tarefasCount})</span>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#f5dd90' }}>
                            R$ {cob.totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                          <div style={{ fontSize: '9.5px', color: cob.taxaAdimplencia >= 70 ? '#5fc9a8' : 'rgba(236,230,216,0.5)' }}>
                            {cob.taxaAdimplencia.toFixed(0)}% adimp.
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ABA 3: ADVOGADOS INDIVIDUAIS */}
              {abaRanking === 'advogados' && rankingFinanceiro && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {rankingFinanceiro.advogados.map((adv, idx) => {
                    const isSelected = colaboradorSelecionado?.tipo === 'advogado' && colaboradorSelecionado?.nome === adv.nome;
                    const medalha = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`;
                    return (
                      <div
                        key={adv.nome}
                        onClick={() => {
                          if (isSelected) setColaboradorSelecionado(null);
                          else {
                            setColaboradorSelecionado({ nome: adv.nome, tipo: 'advogado' });
                            setFiltroEquipeId('todas');
                          }
                          setPagina(1);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: isSelected ? 'rgba(245,221,144,0.18)' : 'rgba(255,255,255,0.03)',
                          border: isSelected ? '1px solid #f5dd90' : '1px solid rgba(199,199,199,0.08)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, width: '18px', textAlign: 'center' }}>{medalha}</span>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: isSelected ? '#f5dd90' : '#ECE6D8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {adv.nome}
                          </span>
                          <span style={{ fontSize: '10px', color: 'rgba(236,230,216,0.45)' }}>({adv.tarefasCount})</span>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#f5dd90' }}>
                            R$ {adv.totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                          <div style={{ fontSize: '9.5px', color: adv.taxaAdimplencia >= 70 ? '#5fc9a8' : 'rgba(236,230,216,0.5)' }}>
                            {adv.taxaAdimplencia.toFixed(0)}% adimp.
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Barra de Busca e Filtro por Equipe/CPF */}
        <div style={{ padding: '12px 20px 8px 20px', flexShrink: 0 }}>
          {equipesDoPolo.length > 0 && (
            <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '11.5px', color: '#f5dd90', fontWeight: 700, flexShrink: 0 }}>
                Equipe (CPF):
              </label>
              <select
                value={filtroEquipeId}
                onChange={(e) => {
                  setFiltroEquipeId(e.target.value);
                  setPagina(1);
                }}
                style={{
                  flex: 1,
                  background: '#161616',
                  color: '#ECE6D8',
                  border: '1px solid rgba(245, 221, 144, 0.35)',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="todas">
                  Todas as equipes deste polo ({tarefas.length} tarefas)
                </option>
                {equipesDoPolo.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.label} ({eq.qtdTarefas} tarefas)
                  </option>
                ))}
              </select>
            </div>
          )}

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
          {colunasOrdenacaoDisponiveis.map((col) => {
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
                          {/* Só exibe badge do polo se houver múltiplos polos distintos no modal */}
                          {temMultiplosPolos && t.poloCobranca && (
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

                          {t.valorCobranca != null ? (
                            <span style={{ color: '#f5dd90', fontWeight: 600 }}>
                              <strong style={{ color: 'rgba(236,230,216,0.45)' }}>Valor:</strong>{' '}
                              R$ {Number(t.valorCobranca).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          ) : null}

                          {t.situacaoFinanceira ? (
                            <span
                              style={{
                                backgroundColor: t.situacaoFinanceira.toUpperCase() === 'ADIMPLENTE' ? 'rgba(95,201,168,0.18)' : 'rgba(224,121,111,0.18)',
                                color: t.situacaoFinanceira.toUpperCase() === 'ADIMPLENTE' ? '#5fc9a8' : '#e0796f',
                                border: '1px solid ' + (t.situacaoFinanceira.toUpperCase() === 'ADIMPLENTE' ? 'rgba(95,201,168,0.4)' : 'rgba(224,121,111,0.4)'),
                                borderRadius: '4px',
                                padding: '1px 6px',
                                fontWeight: 700,
                                fontSize: '10px',
                              }}
                            >
                              Asaas: {t.situacaoFinanceira}
                            </span>
                          ) : null}
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
