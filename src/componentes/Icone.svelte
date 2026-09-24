<script>
  // Ícones de traço simples (sem biblioteca). Tamanho em px.
  let { nome, tamanho = 24, rotulo = '' } = $props();
  const P = {
    caderno: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11M9 8h6',
    mais: 'M12 5v14M5 12h14',
    receber: 'M12 4v11m0 0-4-4m4 4 4-4M5 19h14',
    ajustes: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4',
    voltar: 'M15 5l-7 7 7 7',
    fechar: 'M6 6l12 12M18 6 6 18',
    mais_opcoes: 'M12 5.5v.01M12 12v.01M12 18.5v.01',
    copiar: 'M9 9h10v11H9zM5 15V4h10',
    compartilhar: 'M12 15V3m0 0L8 7m4-4 4 4M6 11H5v9h14v-9h-1',
    livro: 'M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5M12 6.5c2-1.5 5-2 8.5-1.5v13c-3.5-.5-6.5 0-8.5 1.5M12 6.5v13',
    busca: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4-4',
    coracao: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
    relogio: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 7v5l3 2',
    prato: 'M3 12h18M5 12a7 7 0 0 0 14 0M9 8c0-1.5 1-2 1-3.5M13 8c0-1.5 1-2 1-3.5',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    arquivo: 'M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6',
    qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2',
    mensagem: 'M4 5h16v11H9l-5 4z',
    email: 'M3 6h18v12H3zM3 7l9 6 9-6',
    imagem: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5v.01',
    impressora: 'M7 9V4h10v5M7 17H4v-6h16v6h-3M7 14h10v6H7z',
    lixeira: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
    camera: 'M4 8h4l2-3h4l2 3h4v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    check: 'M5 12.5l4.5 4.5L19 7',
    alerta: 'M12 4 2.5 20h19zM12 10v4M12 17v.01',
    sol: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    abrir_fora: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
    colar: 'M9 4h6v3H9zM7 5.5H5V21h14V5.5h-2',
    download: 'M12 4v11m0 0-4-4m4 4 4-4M5 19h14',
    upload: 'M12 16V5m0 0-4 4m4-4 4 4M5 19h14',
    carrinho: 'M4 5h2l2 11h10l2-8H7M9 20a1 1 0 1 0 0-.01M17 20a1 1 0 1 0 0-.01',
    menu: 'M4 7h16M4 12h16M4 17h16',
    nuvem: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z',
    editar: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
    cronometro: 'M12 21a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM12 9v4l2.5 1.5M10 2.5h4M19 6l1.5-1.5',
    pausa: 'M8 5v14M16 5v14',
    tocar: 'M7 4.5v15l12-7.5z',
    calendario: 'M4 6h16v14H4zM4 10h16M8 3.5v4M16 3.5v4M8 14h2M12 14h2M16 14h.01M8 17h2',
    etiqueta: 'M3 12V4h8l10 10-8 8zM7.5 8.5v.01',
    escrever: 'M5 4h9l5 5v11H5zM14 4v5h5M8 13h8M8 17h5',
    mais_um: 'M12 7v10M7 12h10',
    som: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
    parar: 'M7 7h10v10H7z',
    aviao: 'M12 2.5c.9 0 1.5.8 1.5 1.8V9l7.5 4.5v2l-7.5-2.3V18l2 1.6v1.7L12 20.4l-3.5.9v-1.7l2-1.6v-4.8L3 15.5v-2L10.5 9V4.3c0-1 .6-1.8 1.5-1.8z',
    info: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 11v5.5M12 7.6v.01',
    pip: 'M3 5h18v14H3zM12.5 11.5h6v5h-6z',
    reiniciar: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v3.5H8',

  };
</script>

<svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
  aria-hidden={rotulo ? undefined : 'true'} role={rotulo ? 'img' : undefined} aria-label={rotulo || undefined}>
  <path d={P[nome]} />
</svg>
