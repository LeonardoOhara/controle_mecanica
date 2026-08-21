import { readStorage } from './storage.js';
import { analyzeBattery } from './baterias.js';

function readList(key) {
  return readStorage(key, []);
}

function formatDate(value) {
  if (!value) return '--/--';
  const [year, month, day] = String(value).split('-');
  return day && month ? `${day}/${month}` : '--/--';
}

function renderDashboard() {
  const pecas = readList('pecas');
  const manutencoes = readList('manutencoes');
  const baterias = readList('baterias');
  const bikes = readList('bikes');
  const pendingOrders = manutencoes.filter((item) => item.status !== 'finalizada').length;
  const waitingShipments = pecas.filter((item) => (item.status || 'aguardando_envio') === 'aguardando_envio').length;
  const normalBatteries = baterias.filter((item) => analyzeBattery(item).health === 'normal').length;
  const attentionBatteries = baterias.filter((item) => analyzeBattery(item).health === 'atencao').length;
  const criticalBatteries = baterias.filter((item) => analyzeBattery(item).health === 'critico').length;
  const batteryAlerts = attentionBatteries + criticalBatteries;
  const bikesWithoutMovement = bikes.filter((bike) => !(bike.historico || []).length).length;

  const stats = [
    ['Ordens em aberto', pendingOrders, pendingOrders ? 'amber' : 'teal', 'manutencao'],
    ['Envios aguardando', waitingShipments, waitingShipments ? 'danger' : 'teal', 'pecas'],
    ['Bikes no controle', bikes.length, 'teal', 'bikes'],
    ['Baterias em atenção', attentionBatteries, 'amber', 'baterias'],
    ['Baterias normais', normalBatteries, 'teal', 'baterias'],
    ['Baterias críticas', criticalBatteries, criticalBatteries ? 'danger' : 'teal', 'baterias']
  ];
  document.getElementById('dashboard-stats').innerHTML = stats.map(([label, value, tone, target]) => `
    <button class="dashboard-stat ${tone}" type="button" data-dashboard-action="${target}"><span class="dashboard-stat-value">${value}</span><span class="dashboard-stat-label">${label}</span><span class="dashboard-stat-link">Ver detalhes →</span></button>
  `).join('');

  const alerts = [];
  if (pendingOrders) alerts.push(['amber', `${pendingOrders} ${pendingOrders === 1 ? 'ordem' : 'ordens'} de manutenção em aberto`, 'manutencao']);
  if (waitingShipments) alerts.push(['danger', `${waitingShipments} envio${waitingShipments === 1 ? '' : 's'} aguardando despacho`, 'pecas']);
  if (batteryAlerts) alerts.push(['danger', `${batteryAlerts} teste${batteryAlerts === 1 ? '' : 's'} de bateria com alerta`, 'baterias']);
  if (bikesWithoutMovement) alerts.push(['amber', `${bikesWithoutMovement} bike${bikesWithoutMovement === 1 ? '' : 's'} sem movimentação registrada`, 'bikes']);
  document.getElementById('dashboard-alert-count').textContent = alerts.length;
  document.getElementById('dashboard-alert-list').innerHTML = alerts.length
    ? alerts.map(([tone, text, target]) => `<button class="dashboard-list-item" type="button" data-dashboard-action="${target}"><span class="list-indicator ${tone}"></span><span>${text}</span><span class="quick-arrow">→</span></button>`).join('')
    : '<div class="dashboard-empty"><span>✓</span><p>Nenhuma pendência crítica agora.</p></div>';

  const activity = [
    ...pecas.map((item) => ({ date: item.data, text: `${item.nome || 'Destinatário'} · envio`, target: 'pecas' })),
    ...manutencoes.map((item) => ({ date: item.data, text: `${item.nome || 'Cliente'} · ordem de manutenção`, target: 'manutencao' })),
    ...baterias.map((item) => ({ date: item.data, text: `${item.marca || 'Bateria'} · teste de bateria`, target: 'baterias' })),
    ...bikes.map((bike) => ({ date: bike.data, text: `${bike.codigo || 'Bike'} · cadastro`, target: 'bikes' })),
    ...bikes.flatMap((bike) => (bike.historico || []).map((move) => ({
      date: move.data,
      text: `${bike.codigo || 'Bike'} · ${move.acao === 'retirada' ? 'retirada' : 'instalação'} de ${move.peca || 'peça'}`,
      target: 'bikes'
    })))
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
  document.getElementById('dashboard-activity-list').innerHTML = activity.length
    ? activity.map((item) => `<button class="dashboard-list-item" type="button" data-dashboard-action="${item.target}"><span class="activity-date">${formatDate(item.date)}</span><span>${item.text}</span><span class="quick-arrow">→</span></button>`).join('')
    : '<div class="dashboard-empty"><span>—</span><p>Os registros recentes aparecerão aqui.</p></div>';
}

export function initDashboard() {
  const dateNode = document.getElementById('dashboard-date');
  if (dateNode) dateNode.textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date());
  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-dashboard-action]')?.dataset.dashboardAction;
    if (!action) return;
    document.querySelector(`.nav-item[data-panel="${action}"]`)?.click();
  });
  window.addEventListener('oficina:data-changed', renderDashboard);
  renderDashboard();
}
