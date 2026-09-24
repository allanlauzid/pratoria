// Compactação para link e QR: texto → deflate (zlib, com checksum) → base64url.
// Usa CompressionStream (navegadores atuais e Node 18+). Sem ela, envia sem compactar.

const b64url = {
  de(bytes) {
    let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  para(txt) {
    const s = atob(txt.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((txt.length + 3) % 4));
    const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  },
};
export { b64url };

async function passar(bytes, stream) {
  const saida = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(saida).arrayBuffer());
}

/** @returns {Promise<string>} "z" + base64url(deflate)  ou  "t" + base64url(texto puro) */
export async function compactar(texto) {
  const bytes = new TextEncoder().encode(texto);
  if (typeof CompressionStream === 'undefined') return 't' + b64url.de(bytes);
  return 'z' + b64url.de(await passar(bytes, new CompressionStream('deflate')));
}

export async function descompactar(carga) {
  const tipo = carga[0], corpo = carga.slice(1);
  let bytes;
  try { bytes = b64url.para(corpo); } catch { throw new Error('Conteúdo corrompido (base64 inválido).'); }
  if (tipo === 't') return new TextDecoder().decode(bytes);
  if (tipo !== 'z') throw new Error('Formato de compactação desconhecido.');
  try { return new TextDecoder().decode(await passar(bytes, new DecompressionStream('deflate'))); }
  catch { throw new Error('Conteúdo incompleto ou corrompido.'); }
}
