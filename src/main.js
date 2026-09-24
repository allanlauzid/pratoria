import { mount } from 'svelte';
import './styles/app.css';
import App from './App.svelte';
import { iniciarRota } from './lib/rota.svelte.js';
import { iniciarPwa } from './lib/pwa.svelte.js';
import { iniciarCaderno } from './lib/caderno.svelte.js';
import { iniciarCronometros } from './lib/cronometros.svelte.js';
import { iniciarAparencia } from './lib/aparencia.svelte.js';
import { iniciarVoz } from './lib/voz.svelte.js';

iniciarRota();
iniciarPwa();
iniciarCaderno().then(() => { iniciarCronometros(); iniciarAparencia(); iniciarVoz(); });

export default mount(App, { target: document.getElementById('app') });
