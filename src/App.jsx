import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { s } from './style.js';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import Colaboradores from './components/Colaboradores.jsx';
import Tarefas from './components/Tarefas.jsx';
import Permissoes from './components/Permissoes.jsx';
import Configuracoes from './components/Configuracoes.jsx';
import ModalColaborador from './components/ModalColaborador.jsx';
import ModalPolo from './components/ModalPolo.jsx';
import ModalTarefasMetrica from './components/ModalTarefasMetrica.jsx';
import PickerUsuarios from './components/PickerUsuarios.jsx';
import { corDoPolo } from './data.js';
import { motion, AnimatePresence } from 'motion/react';
import {
  buscarEquipeCobranca,
  salvarLinhaEquipe,
  excluirLinhaEquipe,
  alterarPoloProprio,
  buscarTarefasEquipeCobranca,
  buscarPermissoesEfetivas,
  salvarPermissao,
  excluirPermissao,
} from './services/equipeCobrancaApi.js';
import { obterUsuarioAtual, aguardarBX24 } from './services/bitrixSdk.js';
import { montarLinkTarefaBitrix, montarCaminhoTarefaBitrix } from './services/bitrixLink.js';
import {
  MOCK_POLOS,
  MOCK_REGRAS,
  MOCK_TAREFAS,
  ADMINS_PERMISSOES,
  MOCK_COLABORADORES_ANDAMENTO,
  resolverCobradorEAdvogado,
} from './mockData.js';
import { normalizarTarefas } from './utils/roteamentoEquipes.js';

const SCREENS_ORDER = ['dashboard', 'colaboradores', 'tarefas', 'permissoes', 'configuracoes'];
const FORM_VAZIO = { nome: '', polo: '', eh48h: false, digitosCpf: [], advogado: '', departamento: '', sugestoesVisiveis: false };
const FILTROS_VAZIOS = { advogado: 'todos', escalao48h: 'todos', digitoCpf: 'todos', buscaTexto: '', apenasConcluidas: false };

export default function App() {
  const [screen, setScreen] = useState('dashboard');
  const [direction, setDirection] = useState(0); // 1 = down, -1 = up
  const prevScreenRef = useRef('dashboard');

  const navegarPara = useCallback((novaTela) => {
    const prevIdx = SCREENS_ORDER.indexOf(prevScreenRef.current);
    const nextIdx = SCREENS_ORDER.indexOf(novaTela);
    setDirection(nextIdx >= prevIdx ? 1 : -1);
    prevScreenRef.current = novaTela;
    setScreen(novaTela);
  }, []);

  const [regras, setRegras] = useState(MOCK_REGRAS);
  const [polos, setPolos] = useState(MOCK_POLOS);
  const [tarefas, setTarefas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [buscaColab, setBuscaColab] = useState('');
  const [filtroPolo, setFiltroPolo] = useState('todos');

  const [modalAberto, setModalAberto] = useState(false);
  const [indiceEmEdicao, setIndiceEmEdicao] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erroNome, setErroNome] = useState('');

  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [paginaTarefas, setPaginaTarefas] = useState(1);

  const [picker, setPicker] = useState(null); // 'colaborador' | 'permissao' | null
  const [poloModal, setPoloModal] = useState(null);
  const [modalMetrica, setModalMetrica] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);

  // Lista de colaboradores do departamento de Andamento controlados pela tela de Permissões
  const [usuariosPermissao, setUsuariosPermissao] = useState(MOCK_COLABORADORES_ANDAMENTO);
  const [simulandoColaborador, setSimulandoColaborador] = useState(false);

  const poloLabels = useMemo(() => Object.fromEntries(polos.map((p) => [p.codigo, p.rotulo])), [polos]);
  const corPolo = useMemo(() => Object.fromEntries(polos.map((p) => [p.codigo, corDoPolo(p.codigo, polos)])), [polos]);
  const codigosPolo = useMemo(() => polos.map((p) => p.codigo), [polos]);

  // Quem está usando o app (via BX24). Null fora do Bitrix — nesse caso
  // reconhece Caio Marques por padrão para desenvolvimento local.
  const [usuario, setUsuario] = useState(null);
  const [podeEditar, setPodeEditar] = useState(false);

  const usuarioEfetivo = useMemo(() => {
    if (simulandoColaborador) {
      return { id: 99999, nome: 'Colaborador Comum', departamento: 'Andamento Processual' };
    }
    return usuario || { id: 178968, nome: 'Caio Marques' };
  }, [usuario, simulandoColaborador]);

  // Apenas Caio Marques, Lorena Pontes, Vagner Rodrigues e Handerson Sales têm acesso total a Permissões
  const ehAdmin = useMemo(() => {
    const nome = (usuarioEfetivo?.nome || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    return ADMINS_PERMISSOES.some((adm) => {
      const admNorm = adm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      return nome.includes(admNorm) || admNorm.includes(nome);
    });
  }, [usuarioEfetivo]);

  const handleTogglePermissao = useCallback((idOuNome, chave) => {
    setUsuariosPermissao((prev) =>
      prev.map((u) => {
        if (u.id === idOuNome || u.nome === idOuNome) {
          const novoValor = !u.permissoes?.[chave];
          const novasPermissoes = { ...u.permissoes, [chave]: novoValor };
          if (u.id) {
            salvarPermissao(u.id, { usuarioNome: u.nome, permissoes: novasPermissoes }, usuarioEfetivo);
          }
          mostrarToast(`Permissão "${chave}" de ${u.nome} ${novoValor ? 'ativada' : 'desativada'}.`);
          return { ...u, permissoes: novasPermissoes };
        }
        return u;
      })
    );
  }, [usuarioEfetivo]);

  const carregarEquipe = useCallback(async (solicitante) => {
    const { equipes, polos: polosApi } = await buscarEquipeCobranca(solicitante);
    if (polosApi && polosApi.length > 0) {
      setPolos(polosApi);
      setRegras(equipes || []);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);

    async function carregarTudo() {
      try {
        const atual = await obterUsuarioAtual();
        if (cancelado) return;
        setUsuario(atual);
        await carregarEquipe(atual);
        if (cancelado) return;

        const t = await buscarTarefasEquipeCobranca(atual);
        if (cancelado) return;

        if (Array.isArray(t) && t.length > 0) {
          const tarefasResolvidas = normalizarTarefas(t, MOCK_REGRAS);
          setTarefas(tarefasResolvidas);
        } else {
          setTarefas(normalizarTarefas(MOCK_TAREFAS, MOCK_REGRAS));
        }

        const efetivas = await buscarPermissoesEfetivas(atual);
        if (!cancelado) setPodeEditar(Boolean(efetivas?.visibilidadeTotal));
      } catch (err) {
        console.warn('Falha no carregamento inicial:', err);
        if (!cancelado) {
          setTarefas(normalizarTarefas(MOCK_TAREFAS, MOCK_REGRAS));
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    carregarTudo();
    return () => {
      cancelado = true;
    };
  }, [carregarEquipe]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function mostrarToast(msg) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2800);
  }

  async function abrirTarefaNoBitrix(tarefa) {
    const link = montarLinkTarefaBitrix(tarefa);
    if (!link) {
      mostrarToast('Esta tarefa não tem link do Bitrix disponível.');
      return;
    }

    const caminho = montarCaminhoTarefaBitrix(tarefa);

    // 1. Abre no POP-UP nativo do Bitrix24 (SidePanel Slider) através do SDK (BX24.openPath):
    // Isso mantém o aplicativo aberto por baixo; ao fechar a tarefa (botão X do pop-up),
    // o pop-up fecha e o usuário permanece dentro do aplicativo normalmente!
    let bx = null;
    if (typeof window.BX24 !== 'undefined' && window.BX24) {
      bx = window.BX24;
    } else {
      bx = await aguardarBX24(1000);
    }

    if (bx && typeof bx.openPath === 'function' && caminho) {
      bx.openPath(caminho);
      return;
    }

    // 2. Tenta abrir via SidePanel no window.top caso acessível (mesmo domínio):
    try {
      if (window.top && window.top.BX && window.top.BX.SidePanel && window.top.BX.SidePanel.Instance) {
        window.top.BX.SidePanel.Instance.open(caminho || link);
        return;
      }
    } catch {
      // Ignora erro cross-origin se houver
    }

    try {
      if (window.BX && window.BX.SidePanel && window.BX.SidePanel.Instance) {
        window.BX.SidePanel.Instance.open(caminho || link);
        return;
      }
    } catch {
      // Ignora erro
    }

    // 3. Fora do Bitrix (ex.: desenvolvimento local):
    // Abre em nova aba para que o usuário não descarregue a aplicação local
    window.open(link, '_blank');
  }

  function abrirNovo() {
    setIndiceEmEdicao(null);
    setForm({ ...FORM_VAZIO, polo: codigosPolo[0] || '' });
    setErroNome('');
    setModalAberto(true);
  }

  function abrirEdicao(regra) {
    setIndiceEmEdicao(regra.id);
    setForm({
      nome: regra.colaboradorNome,
      polo: regra.polo,
      eh48h: regra.ehEscalao48h,
      digitosCpf: [...regra.digitosCpf],
      advogado: regra.advogado || '',
      departamento: regra.departamento || '',
      sugestoesVisiveis: false,
    });
    setErroNome('');
    setModalAberto(true);
  }

  async function salvarMembro() {
    if (!form.nome.trim()) { setErroNome('Informe o nome do colaborador.'); return; }
    const input = {
      polo: form.polo,
      colaboradorNome: form.nome.trim(),
      departamento: form.departamento || null,
      advogado: form.advogado.trim() || null,
      digitosCpf: form.eh48h ? [] : form.digitosCpf,
      ehEscalao48h: form.eh48h,
      // Identifica o autor da alteração: o backend usa isso tanto para o
      // controle de permissão quanto para o log de auditoria.
      solicitanteId: usuario?.id ?? null,
      solicitanteNome: usuario?.nome ?? null,
    };
    const salvo = await salvarLinhaEquipe(input, indiceEmEdicao ?? undefined);
    if (!salvo) { mostrarToast('Não foi possível salvar — sem permissão ou backend fora do ar.'); return; }
    await carregarEquipe(usuario);
    setModalAberto(false);
    mostrarToast('Colaborador ' + salvo.colaboradorNome + ' salvo com sucesso.');
  }

  async function excluirMembro(regra) {
    const ok = await excluirLinhaEquipe(regra.id, usuario);
    if (!ok) { mostrarToast('Não foi possível remover — sem permissão ou backend fora do ar.'); return; }
    await carregarEquipe(usuario);
    mostrarToast(regra.colaboradorNome + ' removido das regras.');
  }

  function selecionarDoPicker(usuario) {
    if (picker === 'colaborador') {
      setForm((prev) => ({ ...prev, nome: usuario.nome, departamento: 'Andamento Processual', sugestoesVisiveis: false }));
      setPicker(null);
      return;
    }
    setUsuariosPermissao((prev) => {
      if (prev.some((u) => u.nome === usuario.nome)) return prev;
      mostrarToast(usuario.nome + ' adicionado às permissões.');
      return [...prev, { id: usuario.id, nome: usuario.nome, permissoes: { painel: false, colaboradores: false, tarefas: false, permissoes: false } }];
    });
    setPicker(null);
  }

  async function removerPermissao(usuario) {
    if (usuario.id != null) await excluirPermissao(usuario.id, null);
    setUsuariosPermissao((prev) => prev.filter((u) => u.nome !== usuario.nome));
  }

  const advogados = useMemo(
    () => Array.from(new Set(regras.map((r) => r.advogado).filter(Boolean))).sort(),
    [regras]
  );

  // Aba Configurações: só as linhas em que o usuário logado É o cobrador ou o
  // advogado (autoedição do próprio polo, ver Configuracoes.jsx). Não usa
  // `podeEditar` — é independente da permissão de CRUD completo.
  const minhasLinhas = useMemo(
    () => (usuario?.id != null ? regras.filter((r) => r.colaboradorId === usuario.id || r.advogadoId === usuario.id) : []),
    [regras, usuario]
  );

  async function salvarMeuPolo(linha, novoPolo) {
    const salvo = await alterarPoloProprio(linha.id, novoPolo, usuario);
    if (!salvo) { mostrarToast('Não foi possível alterar o polo — verifique se o dígito de CPF já cadastrado cabe no novo polo.'); return; }
    await carregarEquipe(usuario);
    mostrarToast('Polo de ' + salvo.colaboradorNome + ' atualizado para ' + (poloLabels[salvo.polo] || salvo.polo) + '.');
  }

  if (carregando) {
    return (
      <div
        style={s(
          "display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#000000;color:#ECE6D8;font-family:'Fira Code',ui-monospace,monospace;padding:24px;"
        )}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: '3.5px solid rgba(245, 221, 144, 0.12)',
            borderTopColor: '#f5dd90',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '20px',
          }}
        />
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#ECE6D8', letterSpacing: '0.02em' }}>
          Carregando Andamento Processual...
        </div>
        <div style={{ fontSize: '12.5px', color: 'rgba(236,230,216,0.45)', marginTop: '8px' }}>
          Sincronizando tarefas e roteamento por equipes regionais
        </div>
      </div>
    );
  }

  return (
    <div style={s("display:flex;min-height:100vh;background:#000000;color:#ECE6D8;font-family:'Fira Code',ui-monospace,monospace;")}>
      <Sidebar
        screen={screen}
        setScreen={navegarPara}
        usuario={usuarioEfetivo}
        ehAdmin={ehAdmin}
        onToggleSimulacao={usuario ? undefined : () => setSimulandoColaborador((v) => !v)}
      />

      <main style={s('flex:1;padding:32px 40px;overflow-y:auto;height:100vh;position:relative;')}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={screen}
            custom={direction}
            initial={{ opacity: 0, y: direction * 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction * -22 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {screen === 'dashboard' && (
              <Dashboard
                regras={regras}
                polos={polos}
                poloLabels={poloLabels}
                corPolo={corPolo}
                tarefas={tarefas}
                onAbrirPolo={(codigo) => {
                  const doPolo = tarefas.filter((t) => t.poloCobranca === codigo);
                  setModalMetrica({
                    titulo: `Tarefas — ${poloLabels[codigo] || codigo}`,
                    subtitulo: `Polo Regional com ${doPolo.length} tarefas`,
                    tarefas: doPolo,
                    cor: corPolo[codigo] || '#5b9bdb',
                    polo: codigo,
                  });
                }}
                onAbrirMetrica={setModalMetrica}
              />
            )}
            {screen === 'colaboradores' && (
              <Colaboradores
                regras={regras}
                polos={polos}
                poloLabels={poloLabels}
                corPolo={corPolo}
                podeEditar={podeEditar}
                busca={buscaColab}
                setBusca={setBuscaColab}
                filtroPolo={filtroPolo}
                setFiltroPolo={setFiltroPolo}
                onNovo={abrirNovo}
                onEditar={abrirEdicao}
                onExcluir={excluirMembro}
                tarefas={tarefas}
                onAbrirBitrix={abrirTarefaNoBitrix}
              />
            )}
            {screen === 'tarefas' && (
              <Tarefas
                tarefas={tarefas}
                poloLabels={poloLabels}
                corPolo={corPolo}
                filtros={filtros}
                setFiltros={setFiltros}
                pagina={paginaTarefas}
                setPagina={setPaginaTarefas}
                advogados={advogados}
                onAbrirBitrix={abrirTarefaNoBitrix}
              />
            )}
            {screen === 'permissoes' && (
              <Permissoes
                usuarios={usuariosPermissao}
                ehAdmin={ehAdmin}
                onAdicionar={() => setPicker('permissao')}
                onToggle={handleTogglePermissao}
                onRemover={(idOuNome) => {
                  const uAlvo = usuariosPermissao.find((u) => u.id === idOuNome || u.nome === idOuNome);
                  if (uAlvo) {
                    if (uAlvo.id) excluirPermissao(uAlvo.id, usuarioEfetivo);
                    setUsuariosPermissao((prev) => prev.filter((u) => u.id !== idOuNome && u.nome !== idOuNome));
                    mostrarToast(`${uAlvo.nome} removido(a) das permissões.`);
                  }
                }}
              />
            )}
            {screen === 'configuracoes' && (
              <Configuracoes
                minhasLinhas={minhasLinhas}
                polos={codigosPolo}
                poloLabels={poloLabels}
                corPolo={corPolo}
                onSalvarPolo={salvarMeuPolo}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {modalAberto && (
        <ModalColaborador
          form={form}
          setForm={setForm}
          editando={indiceEmEdicao != null}
          erroNome={erroNome}
          advogadosSugeridos={advogados}
          polos={codigosPolo}
          poloLabels={poloLabels}
          onSalvar={salvarMembro}
          onCancelar={() => setModalAberto(false)}
          onAbrirPicker={() => setPicker('colaborador')}
        />
      )}

      {modalMetrica && (
        <ModalTarefasMetrica
          titulo={modalMetrica.titulo}
          subtitulo={modalMetrica.subtitulo}
          tarefas={modalMetrica.tarefas || []}
          poloLabels={poloLabels}
          corPolo={corPolo}
          corDestaque={modalMetrica.cor || '#5b9bdb'}
          polo={modalMetrica.polo}
          regras={regras}
          criterio={modalMetrica.criterio}
          onAbrirBitrix={abrirTarefaNoBitrix}
          onFechar={() => setModalMetrica(null)}
        />
      )}

      {poloModal && (
        <ModalPolo
          polo={poloModal}
          poloLabels={poloLabels}
          tarefas={tarefas}
          onAbrirBitrix={abrirTarefaNoBitrix}
          onFechar={() => setPoloModal(null)}
        />
      )}

      {picker && <PickerUsuarios modo={picker} onSelecionar={selecionarDoPicker} onFechar={() => setPicker(null)} />}

      {toastMsg && (
        <div style={s('position:fixed;bottom:24px;right:24px;background:#846419;color:#f5eec9;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.5);animation:toastIn 0.2s ease;z-index:60;')}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
