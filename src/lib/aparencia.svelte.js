// Tamanho do texto e contraste valem para o app inteiro (preferências gerais: aparelho + nuvem).
import { app } from './caderno.svelte.js';

export function iniciarAparencia() {
  $effect.root(() => {
    $effect(() => {
      const ex = app.prefs.exibicao;
      document.documentElement.dataset.texto = ex.tamanhoTexto || 'normal';
      document.documentElement.dataset.contraste = ex.contraste ? 'alto' : 'normal';
    });
  });
}
