// Opção 2 — arquivo da receita (texto + imagem num arquivo só).
//
// É um .txt de propósito: o compartilhamento nativo (Web Share) do Chrome e do Safari
// só aceita alguns tipos de arquivo, e text/plain está entre eles. Assim o arquivo
// passa por AirDrop, Quick Share, Bluetooth, WhatsApp (documento), e-mail e Drive.
// Nome: <slug>.pratoria.txt
//
// Conteúdo: texto PRATORIA v1 normal (legível) e, DEPOIS do #FIM, a imagem:
//   #IMAGEM image/webp
//   <base64 em linhas de 76 caracteres>
//   #FIM-IMAGEM
// O parser para no #FIM, então o arquivo também funciona colado como texto.

import { serializarReceita } from '../formato/serializar.js';

export const EXTENSAO = '.pratoria.txt';

async function blobParaBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function conteudoDoArquivo(receita, { imagem = null } = {}) {
  let texto = serializarReceita(receita, { incluirAnotacoes: false });
  if (imagem) {
    const b64 = (await blobParaBase64(imagem)).match(/.{1,76}/g).join('\n');
    texto += `\n\n#IMAGEM ${imagem.type || 'image/webp'}\n${b64}\n#FIM-IMAGEM\n`;
  }
  return texto;
}

/** @returns {Promise<File>} */
export async function arquivoDaReceita(receita, { imagem = null } = {}) {
  const conteudo = await conteudoDoArquivo(receita, { imagem });
  return new File([conteudo], `${receita.slug || 'receita'}${EXTENSAO}`, { type: 'text/plain' });
}

/**
 * Lê um arquivo recebido (File/Blob) ou o texto dele.
 * @returns {Promise<{texto: string, imagem: Blob|null}>}
 */
export async function lerArquivoRecebido(entrada) {
  const conteudo = typeof entrada === 'string' ? entrada : await entrada.text();
  const m = conteudo.match(/\n#IMAGEM\s+([\w/+.-]+)\s*\n([\s\S]*?)\n#FIM-IMAGEM/);
  let imagem = null;
  if (m) {
    const bin = atob(m[2].replace(/\s+/g, ''));
    const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    imagem = new Blob([bytes], { type: m[1] });
  }
  const texto = m ? conteudo.slice(0, m.index) : conteudo;
  return { texto: texto.trim(), imagem };
}

/** Compartilha o arquivo pelo menu nativo. Devolve false se o aparelho não permitir arquivos. */
export async function compartilharArquivo(receita, { imagem = null } = {}) {
  const arquivo = await arquivoDaReceita(receita, { imagem });
  if (!navigator.canShare?.({ files: [arquivo] })) return false;
  try { await navigator.share({ files: [arquivo], title: receita.titulo }); } catch (e) { if (e?.name !== 'AbortError') throw e; }
  return true;
}

/** Alternativa quando não dá para compartilhar arquivo (ex.: desktop): baixa o arquivo. */
export async function baixarArquivo(receita, { imagem = null } = {}) {
  const arquivo = await arquivoDaReceita(receita, { imagem });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(arquivo), download: arquivo.name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
