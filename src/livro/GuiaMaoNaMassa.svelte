<script>
  // Instruções completas do Modo Cozinhar (abre pela página "Como usar").
  import Icone from '../componentes/Icone.svelte';
</script>

<div class="guia-completo">
  <section>
    <h3><Icone nome="livro" tamanho={20} /> Virar as páginas</h3>
    <p>Deslize para a esquerda para avançar e para a direita para voltar, como num livro. Também dá para tocar na <strong>margem direita</strong> para avançar e na <strong>margem esquerda</strong> (fora das linhas) para voltar. No computador, use as setas do teclado.</p>
  </section>
  <section>
    <h3><span class="marcador demo" aria-hidden="true"></span> Marcar o que já fez</h3>
    <p>Na lista de compras, nos ingredientes e nos passos, cada linha tem um pequeno círculo. Toque na linha para marcar: aparece um <strong>✓ verde</strong>. Toque de novo para desmarcar. É só para ajudar você a não se perder; ninguém é obrigado a usar.</p>
    <p class="meta">As marcas ficam só neste aparelho e voltam a zero quando você escolhe <em>Reiniciar receita</em> ou <em>Preparar novamente</em>.</p>
  </section>
  <section>
    <h3><Icone nome="cronometro" tamanho={20} /> Cronômetros</h3>
    <p>Quando um passo tem tempo (“asse por 40 minutos”), a página mostra um cronômetro já pronto com o tempo da receita. Ajuste com − e + se quiser e toque em <strong>▶</strong>. O <strong>↺</strong> volta ao tempo sugerido. O botão <Icone nome="cronometro" tamanho={16} /> no topo abre um cronômetro livre.</p>
    <p class="meta">Quando acaba, toca e vibra. Com a tela bloqueada o aviso pode atrasar — por isso a tela fica ligada aqui.</p>
  </section>
  <section>
    <h3><Icone nome="som" tamanho={20} /> Ouvir a receita</h3>
    <p>O botão de som no topo lê <strong>esta página</strong> ou <strong>tudo, virando as páginas sozinho</strong>. Com “Ler ao virar”, cada página nova é lida quando você vira. Funciona sem internet quando o celular tem a voz em português instalada.</p>
  </section>
  <section>
    <h3><Icone nome="sol" tamanho={20} /> Tela ligada e continuar depois</h3>
    <p>No menu <strong>⋮</strong>, ligue “manter a tela ligada”. Se sair no meio, o Pratoria lembra a página e oferece continuar de onde parou.</p>
  </section>
  <section>
    <h3><Icone nome="etiqueta" tamanho={20} /> Desenhos a giz</h3>
    <p>Se a receita tiver ilustrações, os ingredientes vão aparecendo no pé da página conforme entram no preparo.</p>
  </section>
</div>

<style>
  .guia-completo { display: grid; gap: 1rem; max-height: 70dvh; overflow-y: auto; padding-bottom: .5rem; }
  h3 { font-family: var(--fonte-texto); font-size: 1rem; display: flex; align-items: center; gap: .5rem; margin: 0 0 .3rem; color: var(--terracota-forte); }
  p { margin: 0 0 .4rem; line-height: 1.5; }
</style>
