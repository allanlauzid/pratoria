// Pratoria — recorte da cartela de ilustrações a giz, SEM IA.
// Entrada: o canal alfa da imagem (fundo já transparente). Saída: uma caixa por casa da grade.
// 1) máscara reduzida  2) dilatação (junta os "farelos" do giz)  3) componentes conexos
// 4) descarta sujeira  5) cada ilha vai para a casa onde está o seu centro.

/**
 * @param {Uint8Array|Uint8ClampedArray} alfa  um byte por pixel (0 = transparente)
 * @returns {Array<{x,y,w,h,area,cx,cy}>} ilhas em coordenadas da imagem original
 */
export function encontrarIlhas(alfa, w, h, { limiar = 24, passo = 0 } = {}) {
  const s = passo || Math.max(1, Math.floor(Math.min(w, h) / 360));
  const W = Math.ceil(w / s), H = Math.ceil(h / s);
  let m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let on = 0;
    for (let yy = y * s; yy < Math.min(h, y * s + s) && !on; yy++)
      for (let xx = x * s; xx < Math.min(w, x * s + s); xx++) if (alfa[yy * w + xx] > limiar) { on = 1; break; }
    m[y * W + x] = on;
  }
  // dilatação: raio ~1,2% do lado menor (junta pedaços do mesmo desenho, não encosta vizinhos)
  const r = Math.max(1, Math.round(Math.min(W, H) * 0.012));
  const d = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!m[y * W + x]) continue;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < W && Y < H) d[Y * W + X] = 1;
    }
  }
  const rotulo = new Int32Array(W * H), ilhas = [], fila = new Int32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (!d[i] || rotulo[i]) continue;
    const id = ilhas.length + 1; let ini = 0, fim = 0;
    let x0 = W, y0 = H, x1 = 0, y1 = 0, area = 0, sx = 0, sy = 0;
    rotulo[i] = id; fila[fim++] = i;
    while (ini < fim) {
      const k = fila[ini++], x = k % W, y = (k / W) | 0;
      if (m[k]) { area++; sx += x; sy += y; }
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const n of [k - 1, k + 1, k - W, k + W]) {
        if (n < 0 || n >= W * H || rotulo[n] || !d[n]) continue;
        if ((n === k - 1 && x === 0) || (n === k + 1 && x === W - 1)) continue;
        rotulo[n] = id; fila[fim++] = n;
      }
    }
    if (area) ilhas.push({ x: x0 * s, y: y0 * s, w: (x1 - x0 + 1) * s, h: (y1 - y0 + 1) * s, area: area * s * s, cx: (sx / area + 0.5) * s, cy: (sy / area + 0.5) * s });
  }
  const minimo = w * h * 0.0015;
  return ilhas.filter((i) => i.area >= minimo).map((i) => ({ ...i, w: Math.min(i.w, w - i.x), h: Math.min(i.h, h - i.y) }));
}

/**
 * Distribui as ilhas pelas casas da grade (esquerda→direita, cima→baixo).
 * @returns {Array<{x,y,w,h}|null>} uma caixa por casa (null = casa vazia)
 */
export function atribuirGrade(ilhas, w, h, colunas, linhas) {
  const casas = Array.from({ length: colunas * linhas }, () => null);
  for (const il of ilhas) {
    const c = Math.min(colunas - 1, Math.floor(il.cx / (w / colunas)));
    const l = Math.min(linhas - 1, Math.floor(il.cy / (h / linhas)));
    const k = l * colunas + c, a = casas[k];
    casas[k] = !a ? { x: il.x, y: il.y, w: il.w, h: il.h }
      : { x: Math.min(a.x, il.x), y: Math.min(a.y, il.y), w: Math.max(a.x + a.w, il.x + il.w) - Math.min(a.x, il.x), h: Math.max(a.y + a.h, il.y + il.h) - Math.min(a.y, il.y) };
  }
  return casas;
}
