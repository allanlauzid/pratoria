// Pratoria — identificador de receita.
//
// id = "prt-" + 16 dígitos hex = primeiros 64 bits do SHA-256 de:
//   "pratoria-id-v1" \n usuario \n titulo \n momento (UTC ISO) \n url
// (url vazia quando a receita não tem link original).
//
// O hex é uma "impressão digital": não dá para ler os dados de volta a partir dele.
// Por isso usuario, titulo, gerado_em e fonte_url ficam gravados ao lado do id,
// e verificarId() confirma que eles batem com o hex.

const PREFIXO = 'prt-';
const norm = (s) => String(s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');

export function normalizarUrl(url) {
  const s = norm(url);
  if (!s) return '';
  try { const u = new URL(s); u.hash = ''; return u.toString(); } catch { return s; }
}

/** Data → ISO com fuso local (ex.: 2026-09-23T14:05:12-03:00). */
export function isoLocal(data = new Date()) {
  const p = (n) => String(Math.abs(n)).padStart(2, '0');
  const off = -data.getTimezoneOffset();
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}T${p(data.getHours())}:${p(data.getMinutes())}:${p(data.getSeconds())}` +
    `${off >= 0 ? '+' : '-'}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
}

export function textoCanonicoId({ usuario, titulo, momento, url }) {
  const t = new Date(momento);
  if (Number.isNaN(t.getTime())) throw new Error('Momento inválido para gerar o id.');
  return ['pratoria-id-v1', norm(usuario).toLowerCase(), norm(titulo).toLowerCase(), t.toISOString(), normalizarUrl(url)].join('\n');
}

async function sha256Hex(texto) {
  const bytes = new TextEncoder().encode(texto);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function gerarId(dados) {
  return PREFIXO + (await sha256Hex(textoCanonicoId(dados))).slice(0, 16);
}

export async function verificarId(id, dados) {
  try { return id === (await gerarId(dados)); } catch { return false; }
}

export const pareceId = (s) => /^prt-[0-9a-f]{16}$/.test(String(s ?? ''));
