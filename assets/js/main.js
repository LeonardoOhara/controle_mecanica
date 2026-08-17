import { bindAuth } from './modules/auth.js';
import { bindNavigation } from './modules/nav.js';
import { initPecas } from './modules/pecas.js';
import { initManutencao } from './modules/manutencao.js';
import { initBaterias } from './modules/baterias.js';
import { syncFromFirebase } from './modules/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  await syncFromFirebase();
  bindNavigation();
  bindAuth();
  initPecas();
  initManutencao();
  initBaterias();
});
