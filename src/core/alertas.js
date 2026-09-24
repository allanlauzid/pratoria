// Pratoria — avisos do cronômetro antes de acabar (regras do Allan, 24/09).
//   mais de 5 min: avisa em 5 min, 2 min, 1 min e 30 s
//   de 1 a 5 min:  avisa em 1 min e 30 s
//   até 1 min:     avisa em 30 s
// 1 toque + 1 vibração em 5 e 2 min; 2 toques + 2 vibrações em 1 min e 30 s. No zero: alarme.

export function avisosDoCronometro(duracaoSeg) {
  const d = Number(duracaoSeg) || 0;
  const todos = [{ seg: 300, toques: 1 }, { seg: 120, toques: 1 }, { seg: 60, toques: 2 }, { seg: 30, toques: 2 }];
  const permitidos = d > 300 ? [300, 120, 60, 30] : d > 60 ? [60, 30] : [30];
  return todos.filter((a) => permitidos.includes(a.seg) && a.seg < d);
}

/** Cor do piscar conforme o tempo que falta (segundos): amarelo < 2 min, laranja < 1 min, vermelho < 30 s. */
export function nivelDeAlerta(restanteSeg) {
  if (restanteSeg == null || restanteSeg <= 0) return null;
  if (restanteSeg <= 30) return 'vermelho';
  if (restanteSeg <= 60) return 'laranja';
  if (restanteSeg <= 120) return 'amarelo';
  return null;
}

/** Ordem de exibição: o que acaba primeiro vem primeiro (pausados contam pelo que falta). */
export function ordenarPorRestante(lista, restante) {
  return lista.slice().sort((a, b) => restante(a) - restante(b));
}
