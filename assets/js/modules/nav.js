export function bindNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.panel');

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const target = item.dataset.panel;

      navItems.forEach((navItem) => navItem.classList.toggle('active', navItem === item));
      panels.forEach((panel) => panel.classList.toggle('active', panel.id === `panel-${target}`));

      const titles = {
        pecas: ['Envio de Peças', 'Rastreamento de pedidos enviados via Sedex'],
        manutencao: ['Manutenção de Bikes Elétricas', 'Ordens de serviço e status de execução'],
        baterias: ['Teste de Baterias', 'Registro de resultados por data, tipo e status']
      };

      const [title, subtitle] = titles[target] || ['Painel', ''];
      const titleNode = document.getElementById('topbar-title');
      const subtitleNode = document.getElementById('topbar-sub');

      if (titleNode) titleNode.textContent = title;
      if (subtitleNode) subtitleNode.textContent = subtitle;

      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.remove('open');
    });
  });

  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.toggle('open');
    });
  }
}
