// Formatação para exibição.

/** 505 → "8 h 25 min"; {min:480,max:720} → "8 a 12 h" */
export function formatarMinutos(q) {
  if (!q || q.min == null) return '';
  const um = (m) => {
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = Math.round(m % 60);
    return r ? `${h} h ${r} min` : `${h} h`;
  };
  if (q.max != null && q.max !== q.min) {
    if (q.min >= 60 && q.max >= 60 && q.min % 60 === 0 && q.max % 60 === 0) return `${q.min / 60} a ${q.max / 60} h`;
    return `${um(q.min)} a ${um(q.max)}`;
  }
  return um(q.min);
}

/** Tempo de mão na massa (preparo + cozimento), sem espera. */
export function tempoAtivo(r) {
  const p = r?.tempos?.preparo, c = r?.tempos?.cozimento;
  if (!p && !c) return null;
  const min = (p?.min ?? 0) + (c?.min ?? 0), max = (p?.max ?? p?.min ?? 0) + (c?.max ?? c?.min ?? 0);
  return { min, max };
}

export function rendimentoCurto(r) {
  return r?.rendimento?.texto || (r?.rendimento?.porcoes ? `${r.rendimento.porcoes} porções` : '');
}

export const primeiraMaiuscula = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
