import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { s } from './style.js';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import Colaboradores from './components/Colaboradores.jsx';
import Tarefas from './components/Tarefas.jsx';
import Permissoes from './components/Permissoes.jsx';
import ModalColaborador from './components/ModalColaborador.jsx';
import ModalPolo from './components/ModalPolo.jsx';
import PickerUsuarios from './components/PickerUsuarios.jsx';
import { corDoPolo } from './data.js';
import {
  buscarEquipeCobranca,
  salvarLinhaEquipe,
  excluirLinhaEquipe,
  buscarTarefasEquipeCobranca,
  buscarPermissoesEfetivas,
  excluirPermissao,
} from './services/equipeCobrancaApi.js';
import { obterUsuarioAtual } from './services/bitrixSdk.js';

const FORM_VAZIO = { nome: '', polo: '', eh48h: false, digitosCpf: [], advogado: '', departamento: '', sugestoesVisiveis: false };
const FILTROS_VAZIOS = { advogado: 'todos', escalao48h: 'todos', digitoCpf: 'todos', buscaTexto: '', apenasConcluidas: false };

export default function App() {
  const [screen, setScreen] = useState('dashboard');
  const [regras, setRegras] = useState([]);
  const [polos, setPolos] = useState([]);
  const [tarefas, setTarefas] = useState([]);
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
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);

  // Permissões: sem endpoint de "listar todo mundo com permissão", a tela
  // opera sobre quem já está cadastrado no polo (regras) + Bitrix (picker) —
  // cada usuário adicionado aqui é só local até salvar uma alteração real.
  const [usuariosPermissao, setUsuariosPermissao] = useState([]);

  const poloLabels = useMemo(() => Object.fromEntries(polos.map((p) => [p.codigo, p.rotulo])), [polos]);
  const corPolo = useMemo(() => Object.fromEntries(polos.map((p) => [p.codigo, corDoPolo(p.codigo, polos)])), [polos]);
  const codigosPolo = useMemo(() => polos.map((p) => p.codigo), [polos]);

  // Quem está usando o app (via BX24). Null fora do Bitrix — nesse caso o
  // backend não reconhece ninguém como editor e a tela fica só de leitura.
  const [usuario, setUsuario] = useState(null);
  const [podeEditar, setPodeEditar] = useState(false);

  const carregarEquipe = useCallback(async (solicitante) => {
    const { equipes, polos: polosApi } = await buscarEquipeCobranca(solicitante);
    setRegras(equipes);
    setPolos(polosApi);
  }, []);

  useEffect(() => {
    let cancelado = false;
    obterUsuarioAtual().then(async (atual) => {
      if (cancelado) return;
      setUsuario(atual);
      await carregarEquipe(atual);
      if (cancelado) return;
      buscarTarefasEquipeCobranca(atual).then((t) => { if (!cancelado) setTarefas(t); });
      const efetivas = await buscarPermissoesEfetivas(atual);
      if (!cancelado) setPodeEditar(Boolean(efetivas?.podeVer?.colaboradores));
    });
    return () => { cancelado = true; };
  }, [carregarEquipe]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function mostrarToast(msg) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2800);
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

  return (
    <div style={s("display:flex;min-height:100vh;background:#000000;color:#ECE6D8;font-family:'Fira Code',ui-monospace,monospace;")}>
      <Sidebar screen={screen} setScreen={setScreen} />

      <main style={s('flex:1;padding:32px 40px;overflow-y:auto;height:100vh;')}>
        {screen === 'dashboard' && (
          <Dashboard regras={regras} polos={polos} poloLabels={poloLabels} corPolo={corPolo} tarefas={tarefas} onAbrirPolo={setPoloModal} />
        )}
        {screen === 'colaboradores' && (
          <Colaboradores
            regras={regras}
            polos={codigosPolo}
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
            onAbrirBitrix={(t) => t.linkTarefa ? window.open(t.linkTarefa, '_blank', 'noopener') : mostrarToast('Esta tarefa não tem link do Bitrix disponível.')}
          />
        )}
        {screen === 'permissoes' && (
          <Permissoes
            usuarios={usuariosPermissao}
            onAdicionar={() => setPicker('permissao')}
            onToggle={(nome, chave) => setUsuariosPermissao((prev) => prev.map((u) => (u.nome === nome ? { ...u, permissoes: { ...u.permissoes, [chave]: !u.permissoes[chave] } } : u)))}
            onRemover={(nome) => removerPermissao(usuariosPermissao.find((u) => u.nome === nome))}
          />
        )}
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

      {poloModal && (
        <ModalPolo polo={poloModal} poloLabels={poloLabels} tarefas={tarefas} onFechar={() => setPoloModal(null)} />
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
