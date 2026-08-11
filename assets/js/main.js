import { bindAuth } from './modules/auth.js';
import { bindNavigation } from './modules/nav.js';
import { initPecas } from './modules/pecas.js';
import { initManutencao } from './modules/manutencao.js';
import { initBaterias } from './modules/baterias.js';

document.addEventListener('DOMContentLoaded', () => {
  bindNavigation();
  bindAuth();
  initPecas();
  initManutencao();
  initBaterias();
});
