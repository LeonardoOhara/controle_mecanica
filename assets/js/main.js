import { bindAuth } from './modules/auth.js';
import { bindNavigation } from './modules/nav.js';
import { initPecas } from './modules/pecas.js';
import { initManutencao } from './modules/manutencao.js';
import { initBikes } from './modules/bikes.js';
import { initBaterias } from './modules/baterias.js';
import { initDiagrama } from './modules/diagrama.js';
import { initDashboard } from './modules/dashboard.js';
import { syncFromBackend } from './modules/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  await syncFromBackend(['pecas', 'manutencoes', 'bikes', 'baterias']);
  bindNavigation();
  bindAuth();
  initDashboard();
  initPecas();
  initManutencao();
  initBikes();
  initBaterias();
  initDiagrama();
});
