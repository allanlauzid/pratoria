/** Baixa um File no aparelho (sem servidor). */
export function baixarArquivo(arquivo) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(arquivo), download: arquivo.name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 15000);
}
