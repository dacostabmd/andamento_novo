/**
 * Identidade do usuário logado, via SDK do Bitrix (window.BX24, injetado pelo
 * loader em index.html quando o app roda embutido no portal).
 *
 * Por que isso importa: o backend decide visibilidade e permissão de edição a
 * partir de `solicitanteId`/`solicitanteNome` (ver permissoesEfetivasEquipeCobranca
 * em auth.ts). Sem enviar quem é, ninguém é reconhecido como editor e o escopo
 * de dados não funciona.
 *
 * Fora do Bitrix (URL direta da Vercel), devolve null — a tela abre em modo
 * leitura, sem identificar ninguém.
 */

/** Espera o BX24 aparecer (o loader é assíncrono). Resolve null se não vier. */
export function aguardarBX24(timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (typeof window.BX24 !== 'undefined' && window.BX24) return resolve(window.BX24)
    const inicio = Date.now()
    const timer = setInterval(() => {
      if (typeof window.BX24 !== 'undefined' && window.BX24) {
        clearInterval(timer)
        resolve(window.BX24)
      } else if (Date.now() - inicio > timeoutMs) {
        clearInterval(timer)
        resolve(null)
      }
    }, 100)
  })
}

/**
 * { id, nome } do usuário logado no portal, ou null fora do Bitrix / em falha.
 * O nome é montado como "NAME LAST_NAME" — é assim que as listas de permissão
 * por nome do backend esperam receber (ex.: "Lorena Pontes").
 */
export async function obterUsuarioAtual() {
  const bx = await aguardarBX24()
  if (!bx) return null

  return new Promise((resolve) => {
    try {
      bx.callMethod('user.current', {}, (resultado) => {
        if (!resultado || resultado.error()) return resolve(null)
        const dados = resultado.data()
        if (!dados || dados.ID == null) return resolve(null)
        const nome = [dados.NAME, dados.LAST_NAME].filter(Boolean).join(' ').trim()
        resolve({ id: parseInt(dados.ID, 10), nome: nome || null })
      })
    } catch {
      resolve(null)
    }
  })
}
