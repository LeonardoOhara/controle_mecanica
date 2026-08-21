const specs = {
  battery: ['Bateria (entrada principal)', ['Fio positivo: vermelho grosso', 'Tensao: nominal da bateria, 24V, 36V, 48V ou 52V DC', 'Fio negativo: preto grosso', 'Terra: 0V (GND / negativo)']],
  ignition: ['Trava de ignicao / pos-chave', ['Fio: laranja ou amarelo', 'Tensao: igual a bateria', 'Funcao: ativa o controlador', 'Confirmar continuidade quando ligada']],
  controller: ['Controlador ESC', ['Entrada: vermelho (+) e preto (GND)', 'Fases do motor: amarelo, verde e azul grossos', 'Entradas: Hall, acelerador, PAS, freio e display', 'A saida e desativada quando o freio corta']],
  motor: ['Motor hub BLDC', ['Fases principais: amarelo, verde e azul grossos', 'Sinal: AC variavel, 0V ate a tensao maxima da bateria', 'Sensores Hall: vermelho/preto finos + amarelo/verde/azul finos', 'Hall: +5V, GND e pulsos de 0V a 5V']],
  throttle: ['Acelerador', ['Fio vermelho: +5V DC', 'Fio preto: 0V (GND)', 'Fio verde ou amarelo: sinal variavel', 'Sinal: 0,8V a 4,2V DC']],
  display: ['Display / painel', ['Fio vermelho: tensao nominal da bateria, 24V a 48V DC', 'Fio preto: 0V (GND)', 'Fio azul ou roxo: sinal PWR de ligar', 'TX verde e RX amarelo: UART, 0V a 5V']],
  brake: ['Sensor de freio (corte)', ['Fio preto: 0V (GND)', 'Fio amarelo ou branco: sinal de corte', 'Sinal: 0V / 5V DC', 'Ao acionar, interrompe a potencia do motor']],
  hall: ['Sensores Hall do motor', ['Fio vermelho fino: +5V DC', 'Fio preto fino: 0V (GND)', 'Fios amarelo, verde e azul finos: pulsos', 'Sinais Hall: 0V a 5V DC']],
  pas: ['PAS (sensor de pedal assistido)', ['Fio vermelho: +5V DC', 'Fio preto: 0V (GND)', 'Fio azul, marrom ou amarelo: sinal', 'Pulsos de 0V a 5V ao pedalar']],
  dcdc: ['Conversor DC-DC', ['Entrada: 48V e terra', 'Saida: 12V / 1A', 'Alimenta o circuito de iluminacao', 'Verificar polaridade antes do teste']],
  lights: ['Faroleta', ['Alimentacao: 12V / 1A', 'Positivo vindo do conversor DC-DC', 'Retorno pelo terra do circuito', 'Iluminacao dianteira ou traseira']]
};

export function initDiagrama() {
  const panel = document.getElementById('panel-diagrama');
  if (!panel) return;

  const body = document.body;
  const svg = document.getElementById('bike-diagram');
  const viewport = document.getElementById('diagram-viewport');
  const readout = document.getElementById('diagram-zoom-readout');
  const status = document.getElementById('diagram-status-text');
  const buttons = panel.querySelectorAll('.diagram-mode');
  const components = panel.querySelectorAll('.diagram-component');
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let dragging = false;
  let didPan = false;
  let startX = 0;
  let startY = 0;
  let startPanX = 0;
  let startPanY = 0;

  const applyZoom = () => {
    zoom = Math.min(2.5, Math.max(0.45, zoom));
    svg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    readout.textContent = `${Math.round(zoom * 100)}%`;
  };

  const fitToWidth = () => {
    zoom = 1;
    panX = 0;
    panY = 0;
    applyZoom();
  };

  document.getElementById('diagram-zoom-in').addEventListener('click', () => { zoom += 0.2; applyZoom(); });
  document.getElementById('diagram-zoom-out').addEventListener('click', () => { zoom -= 0.2; applyZoom(); });
  document.getElementById('diagram-zoom-fit').addEventListener('click', fitToWidth);
  viewport.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoom += event.deltaY < 0 ? 0.12 : -0.12;
    applyZoom();
  }, { passive: false });

  viewport.addEventListener('pointerdown', (event) => {
    dragging = true;
    didPan = false;
    viewport.classList.add('dragging');
    startX = event.clientX;
    startY = event.clientY;
    startPanX = panX;
    startPanY = panY;
  });
  viewport.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) didPan = true;
    panX = startPanX + deltaX;
    panY = startPanY + deltaY;
    applyZoom();
  });
  viewport.addEventListener('pointerup', () => { dragging = false; viewport.classList.remove('dragging'); });
  viewport.addEventListener('pointercancel', () => { dragging = false; viewport.classList.remove('dragging'); });
  viewport.addEventListener('click', (event) => {
    if (!didPan) return;
    event.preventDefault();
    event.stopPropagation();
    didPan = false;
  }, true);

  buttons.forEach((button) => button.addEventListener('click', () => {
    const mode = button.dataset.mode;
    panel.dataset.mode = mode;
    buttons.forEach((item) => item.classList.toggle('active', item === button));
    status.textContent = {
      idle: 'Sistema parado',
      drive: 'Acelerando: energia fluindo para o motor',
      brake: 'Freio acionado: motor sem potencia'
    }[mode];
  }));

  components.forEach((component) => component.addEventListener('click', () => {
    if (didPan) return;
    components.forEach((item) => item.classList.remove('selected'));
    component.classList.add('selected');
    const [title, rows] = specs[component.dataset.component];
    document.getElementById('diagram-spec-title').textContent = title;
    document.getElementById('diagram-spec-empty').hidden = true;
    document.getElementById('diagram-spec-body').innerHTML = rows.map((row) => `<div class="diagram-spec-row">${row}</div>`).join('');
  }));

  window.addEventListener('resize', fitToWidth);
  fitToWidth();
}
