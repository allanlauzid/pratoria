// Crédito da fonte: sempre presente, o mais discreto possível.
// Uma linha curta em texto pequeno, ao pé da receita e no verso da capa do livro.

/** @returns {{texto: string, url: string} | null} */
export function creditoCurto(receita) {
  const f = receita?.fonte ?? {};
  const partes = [f.site, f.autor].map((s) => String(s ?? '').trim()).filter(Boolean);
  if (!partes.length && !f.url) return null;
  let host = '';
  try { host = f.url ? new URL(f.url).hostname.replace(/^www\./, '') : ''; } catch { /* url inválida */ }
  return { texto: `Adaptada de ${partes.length ? partes.join(' · ') : host}`, url: f.url ?? '' };
}
