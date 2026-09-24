// Pratoria — quando lembrar de fazer backup (modo sem conta: é a única proteção contra perda).
// Dados usados (SÓ no aparelho): data do último backup, quantas receitas havia, e "lembrar depois".

const DIA = 86400000;

/**
 * @param {{ultimo?: {em: string, receitas: number}|null, adiadoAte?: string|null, receitas: number, primeiraEm?: string|null, agora?: Date, comConta?: boolean}} p
 * @returns {{mostrar: boolean, motivo: string}}
 */
export function lembrarBackup({ ultimo = null, adiadoAte = null, receitas, primeiraEm = null, agora = new Date(), comConta = false }) {
  const nao = { mostrar: false, motivo: '' };
  if (comConta || receitas < 2) return nao;
  if (adiadoAte && new Date(adiadoAte) > agora) return nao;
  if (!ultimo) {
    const desde = primeiraEm ? (agora - new Date(primeiraEm)) / DIA : 0;
    if (receitas >= 5) return { mostrar: true, motivo: `Você já tem ${receitas} receitas e nenhum backup.` };
    if (desde >= 30) return { mostrar: true, motivo: 'Seu caderno está há um mês sem backup.' };
    return nao;
  }
  const novas = receitas - (ultimo.receitas ?? 0);
  const dias = (agora - new Date(ultimo.em)) / DIA;
  if (novas >= 5) return { mostrar: true, motivo: `${novas} receitas novas desde o último backup.` };
  if (dias >= 30 && novas > 0) return { mostrar: true, motivo: `Último backup há ${Math.floor(dias)} dias.` };
  return nao;
}

/** 1536000 → "1,5 MB" */
export function tamanhoLegivel(bytes) {
  if (bytes == null) return '';
  const u = ['bytes', 'KB', 'MB', 'GB'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: n < 10 && i ? 1 : 0 })} ${u[i]}`;
}
