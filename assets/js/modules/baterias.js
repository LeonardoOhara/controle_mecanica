import { readStorage, writeStorage } from './storage.js';
import { uid, formatDateDisplay, formatDateInput, parseDateInput, escapeHtml, openModal, showToast, fmtDate } from './utils.js';

const STORAGE_KEY = 'baterias';

function getList() {
  return readStorage(STORAGE_KEY, []);
}

function saveList(list) {
  writeStorage(STORAGE_KEY, list);
}

function statusLabel() {
  return {
    boa: 'Boa',
    ruim: 'Ruim',
    zerada: 'Zerada'
  };
}

function fieldsHtml(data = {}) {
  const tipo = data.tipo || '36v';
  const status = data.status || 'boa';

  return `
    <div class="grid-2">
      <div class="field"><label>Data</label><input required type="text" name="data" inputmode="numeric" pattern="\\d{2}/\\d{2}/\\d{4}" placeholder="dd/mm/yyyy" maxlength="10" oninput="window.__formatDateInput(this)" value="${formatDateDisplay(data.data)}"></div>
      <div class="field"><label>Quantidade</label><input required type="number" min="1" name="quantidade" placeholder="Quantidade" value="${data.quantidade || ''}"></div>
    </div>
    <div class="field"><label>Marca</label><input required type="text" name="marca" placeholder="Marca da bateria" value="${data.marca || ''}"></div>
    <div class="grid-2">
      <div class="field"><label>Tipo de bateria</label>
        <select name="tipo" style="width:100%;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;padding:11px 13px;color:var(--text);font-size:14px;">
          <option value="36v" ${tipo === '36v' ? 'selected' : ''}>36v</option>
          <option value="48v" ${tipo === '48v' ? 'selected' : ''}>48v</option>
          <option value="52v" ${tipo === '52v' ? 'selected' : ''}>52v</option>
        </select>
      </div>
      <div class="field"><label>Amperes</label><input required type="text" name="amperes" placeholder="Ex: 20Ah" value="${data.amperes || ''}"></div>
    </div>
    <div class="field"><label>Status</label>
      <select name="status" style="width:100%;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;padding:11px 13px;color:var(--text);font-size:14px;">
        <option value="boa" ${status === 'boa' ? 'selected' : ''}>Boa</option>
        <option value="ruim" ${status === 'ruim' ? 'selected' : ''}>Ruim</option>
        <option value="zerada" ${status === 'zerada' ? 'selected' : ''}>Zerada</option>
      </select>
    </div>
  `;
}

function renderStats() {
  const list = getList();
  const totalQuantidade = list.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);
  const boaQuantidade = list
    .filter((item) => item.status === 'boa')
    .reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);
  const ruimQuantidade = list
    .filter((item) => item.status === 'ruim')
    .reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);
  const zeradaQuantidade = list
    .filter((item) => item.status === 'zerada')
    .reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);

  document.getElementById('baterias-stats').innerHTML = `
    <div class="stat"><div class="n">${totalQuantidade}</div><div class="l">Quantidade total</div></div>
    <div class="stat teal"><div class="n">${boaQuantidade}</div><div class="l">Boa</div></div>
    <div class="stat danger"><div class="n">${ruimQuantidade}</div><div class="l">Ruim</div></div>
    <div class="stat amber"><div class="n">${zeradaQuantidade}</div><div class="l">Zerada</div></div>
  `;
}

function renderTable() {
  const search = (document.getElementById('baterias-search')?.value || '').toLowerCase();
  const list = getList()
    .filter((item) => !search || item.marca.toLowerCase().includes(search) || item.tipo.toLowerCase().includes(search))
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  const tbody = document.getElementById('baterias-tbody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Nenhum teste encontrado. Clique em "+ Novo teste" para cadastrar.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map((item) => `
    <tr>
      <td class="cell-mono">${fmtDate(item.data)}</td>
      <td class="cell-mono">${escapeHtml(item.quantidade)}</td>
      <td>${escapeHtml(item.marca)}</td>
      <td class="cell-mono">${escapeHtml(item.tipo)}</td>
      <td class="cell-mono">${escapeHtml(item.amperes)}</td>
      <td><span class="badge ${item.status}"><span class="seg"><i></i><i></i><i></i></span>${statusLabel()[item.status] || item.status}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" class="icon-btn" data-action="edit-bateria" data-id="${item.id}">✎</button>
          <button type="button" class="icon-btn danger" data-action="delete-bateria" data-id="${item.id}">✕</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function getFilteredList() {
  const search = (document.getElementById('baterias-search')?.value || '').toLowerCase();
  return getList()
    .filter((item) => !search || item.marca.toLowerCase().includes(search) || item.tipo.toLowerCase().includes(search))
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

function exportReport(type) {
  const rows = getFilteredList().map((item) => ({
    Data: fmtDate(item.data),
    Quantidade: item.quantidade,
    Marca: item.marca,
    Tipo: item.tipo,
    Amperes: item.amperes,
    Status: statusLabel()[item.status] || item.status
  }));

  if (!rows.length) {
    showToast('Nenhum dado para exportar neste relatório.');
    return;
  }

  if (type === 'pdf') {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast('Biblioteca de PDF não carregada.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Relatório de Teste de Baterias', 14, 16);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 24);

    const headers = Object.keys(rows[0]);
    const body = rows.map((row) => headers.map((header) => row[header] ?? ''));

    doc.autoTable({
      head: [headers],
      body,
      startY: 30,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [245, 166, 35], textColor: [26, 18, 4], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10 }
    });

    doc.save('relatorio-teste-baterias.pdf');
    showToast('Relatório PDF gerado.');
    return;
  }

  if (type === 'xlsx') {
    if (!window.XLSX) {
      showToast('Biblioteca de Excel não carregada.');
      return;
    }

    const sheet = window.XLSX.utils.json_to_sheet(rows);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, sheet, 'Relatorio');
    window.XLSX.writeFile(workbook, 'relatorio-teste-baterias.xlsx');
    showToast('Arquivo .xlsx exportado.');
  }
}

function renderAll() {
  renderStats();
  renderTable();
}

function addItem(formData, close) {
  const list = getList();
  list.push({
    id: uid(),
    data: parseDateInput(String(formData.get('data'))),
    quantidade: Number(formData.get('quantidade')),
    marca: String(formData.get('marca')).trim(),
    tipo: String(formData.get('tipo')),
    amperes: String(formData.get('amperes')).trim(),
    status: String(formData.get('status'))
  });

  saveList(list);
  renderAll();
  close();
  showToast('Teste de bateria registrado.');
}

function editItem(id) {
  const item = getList().find((entry) => entry.id === id);
  if (!item) return;

  openModal({
    title: 'Editar teste de bateria',
    fieldsHtml: fieldsHtml(item),
    onSubmit: (formData, close) => {
      const list = getList();
      const current = list.find((entry) => entry.id === id);
      if (!current) return;

      Object.assign(current, {
        data: parseDateInput(String(formData.get('data'))),
        quantidade: Number(formData.get('quantidade')),
        marca: String(formData.get('marca')).trim(),
        tipo: String(formData.get('tipo')),
        amperes: String(formData.get('amperes')).trim(),
        status: String(formData.get('status'))
      });

      saveList(list);
      renderAll();
      close();
      showToast('Teste atualizado.');
    }
  });
}

function deleteItem(id) {
  if (!confirm('Remover este registro de teste de bateria?')) return;

  const list = getList().filter((item) => item.id !== id);
  saveList(list);
  renderAll();
  showToast('Registro removido.');
}

export function initBaterias() {
  const addButton = document.getElementById('btn-add-bateria');
  const searchInput = document.getElementById('baterias-search');
  const tbody = document.getElementById('baterias-tbody');

  if (addButton) {
    addButton.addEventListener('click', () => {
      openModal({
        title: 'Registrar teste de bateria',
        fieldsHtml: fieldsHtml(),
        onSubmit: addItem
      });
    });
  }

  if (searchInput) searchInput.addEventListener('input', renderAll);

  if (tbody) {
    tbody.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const { action, id } = button.dataset;
      if (action === 'edit-bateria') editItem(id);
      if (action === 'delete-bateria') deleteItem(id);
    });
  }

  document.querySelectorAll('.btn-export[data-panel="baterias"]').forEach((button) => {
    button.addEventListener('click', () => exportReport(button.dataset.type));
  });

  renderAll();
}
