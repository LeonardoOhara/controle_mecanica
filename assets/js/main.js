import { bindAuth } from './modules/auth.js';
import { bindNavigation } from './modules/nav.js';
import { initPecas } from './modules/pecas.js';
import { initManutencao } from './modules/manutencao.js';
import { initBaterias } from './modules/baterias.js';
import { syncFromBackend } from './modules/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  await syncFromBackend(['pecas', 'manutencoes', 'baterias']);
  bindNavigation();
  bindAuth();
  initPecas();
  initManutencao();
  initBaterias();
});
