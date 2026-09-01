import { useEffect, useState } from 'react';
import { s } from '../style.js';

/**
 * Tela exibida em /index.html#install durante a instalação do app local no
 * Bitrix (ver public/manifest.xml, install_url). Só chama BX24.installFinish()
 * para o Bitrix marcar o app como instalado — nenhuma credencial (AUTH_ID/
 * REFRESH_ID) é lida aqui: toda integração real do app roda pelo webhook do
 * backend (VITE_SYNC_API_URL/VITE_API_TOKEN), não por OAuth do BX24.
 */
export default function InstalacaoBitrix() {
  const [status, setStatus] = useState('carregando'); // 'carregando' | 'sucesso' | 'erro'
  const [mensagem, setMensagem] = useState('Finalizando instalação do aplicativo...');

  useEffect(() => {
    let cancelado = false;

    async function finalizar() {
      let tentativas = 0;
      while ((typeof window.BX24 === 'undefined' || !window.BX24) && tentativas < 30) {
        await new Promise((r) => setTimeout(r, 100));
        tentativas++;
      }
      if (cancelado) return;

      if (typeof window.BX24 === 'undefined' || !window.BX24) {
        setStatus('erro');
        setMensagem('BX24 não carregado. Verifique se o app está rodando dentro do Bitrix.');
        return;
      }

      window.BX24.installFinish();
      setStatus('sucesso');
      setMensagem('Instalação concluída com sucesso!');
      setTimeout(() => { if (!cancelado) window.location.hash = ''; }, 1500);
    }

    finalizar();
    return () => { cancelado = true; };
  }, []);

  return (
    <div style={s('display:flex;align-items:center;justify-content:center;min-height:100vh;background:#000000;color:#ECE6D8;font-family:\'Fira Code\',ui-monospace,monospace;')}>
      <div style={s('background:#111111;border:1px solid rgba(199,199,199,0.16);border-radius:14px;padding:40px;text-align:center;max-width:420px;width:90%;')}>
        {status === 'carregando' && (
          <>
            <div style={s('width:40px;height:40px;border:3px solid rgba(199,199,199,0.2);border-top:3px solid #846419;border-radius:50%;margin:0 auto 20px;animation:spin 0.8s linear infinite;')} />
            <div style={s('font-size:18px;font-weight:700;margin-bottom:8px;')}>Equipe de Cobrança</div>
          </>
        )}
        {status === 'sucesso' && (
          <div style={s('width:48px;height:48px;background:#5fc9a8;color:#0a1a15;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;margin:0 auto 20px;')}>✓</div>
        )}
        {status === 'erro' && (
          <div style={s('width:48px;height:48px;background:#e0796f;color:#2a0e0b;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;margin:0 auto 20px;')}>!</div>
        )}
        <div style={s('font-size:13px;color:rgba(236,230,216,0.6);')}>{mensagem}</div>
      </div>
      <style>{'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
