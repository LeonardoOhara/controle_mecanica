import { readStorage, writeStorage } from './storage.js';
import { uid, formatDateDisplay, formatDateInput, parseDateInput, escapeHtml, openModal, showToast, fmtDate } from './utils.js';
import { importedDate, importedValue, normalizeHeader, setupReportImport } from './importacao.js';

const STORAGE_KEY = 'manutencoes';

function getList() {
  return readStorage(STORAGE_KEY, []);
}

function saveList(list) {
  writeStorage(STORAGE_KEY, list);
}

function statusLabel() {
  return {
    pendente: 'Pendente',
    execucao: 'Em execução',
    finalizada: 'Finalizada'
  };
}

function fieldsHtml(data = {}) {
  const status = data.status || 'pendente';
  return `
    <div class="grid-2">
      <div class="field"><label>Data</label><input required type="text" name="data" inputmode="numeric" pattern="\\d{2}/\\d{2}/\\d{4}" placeholder="dd/mm/yyyy" maxlength="10" oninput="window.__formatDateInput(this)" value="${formatDateDisplay(data.data)}"></div>
      <div class="field"><label>Status</label>
        <select name="status" style="width:100%;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;padding:11px 13px;color:var(--text);font-size:14px;">
          <option value="pendente" ${status === 'pendente' ? 'selected' : ''}>Pendente</option>
          <option value="execucao" ${status === 'execucao' ? 'selected' : ''}>Em execução</option>
          <option value="finalizada" ${status === 'finalizada' ? 'selected' : ''}>Finalizada</option>
        </select>
      </div>
    </div>
    <div class="field"><label>Nome do cliente</label><input required type="text" name="nome" placeholder="Nome do cliente" value="${data.nome || ''}"></div>
    <div class="grid-2">
      <div class="field"><label>Mecânico responsável</label><input required type="text" name="mecanico" placeholder="Nome do mecânico" value="${data.mecanico || ''}"></div>
      <div class="field"><label>Modelo da bike</label><input required type="text" name="modelo" placeholder="Ex: Voltz EVS" value="${data.modelo || ''}"></div>
    </div>
  `;
}

function renderStats() {
  const list = getList();
  document.getElementById('manut-stats').innerHTML = `
    <div class="stat"><div class="n">${list.filter((item) => item.status === 'pendente').length}</div><div class="l">Pendentes</div></div>
    <div class="stat"><div class="n">${list.filter((item) => item.status === 'execucao').length}</div><div class="l">Em execução</div></div>
    <div class="stat teal"><div class="n">${list.filter((item) => item.status === 'finalizada').length}</div><div class="l">Finalizadas</div></div>
  `;
}

function renderTable() {
  const list = getFilteredList();

  const tbody = document.getElementById('manut-tbody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhuma ordem encontrada. Clique em "+ Nova ordem" para cadastrar.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map((item) => `
    <tr>
      <td class="cell-mono">${fmtDate(item.data)}</td>
      <td>${escapeHtml(item.nome)}</td>
      <td>${escapeHtml(item.mecanico)}</td>
      <td>${escapeHtml(item.modelo)}</td>
      <td><span class="badge ${item.status}"><span class="seg"><i></i><i></i><i></i></span>${statusLabel()[item.status] || item.status}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" class="icon-btn" data-action="edit-manut" data-id="${item.id}">✎</button>
          <button type="button" class="icon-btn danger" data-action="delete-manut" data-id="${item.id}">✕</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function getFilteredList() {
  const search = (document.getElementById('manut-search')?.value || '').toLowerCase();
  const dateFilter = document.getElementById('manut-date-filter')?.value || '';
  const startInput = document.getElementById('manut-date-start');
  const endInput = document.getElementById('manut-date-end');
  const { startDate, endDate } = getDateRange(dateFilter, startInput?.value, endInput?.value);
  return getList().filter((item) => {
    const searchable = `${JSON.stringify(item)} ${fmtDate(item.data)} ${statusLabel()[item.status] || item.status}`.toLowerCase();
    return (!search || searchable.includes(search))
      && (!startDate || (item.data || '') >= startDate)
      && (!endDate || (item.data || '') <= endDate);
  }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

function getDateRange(filter, customStart, customEnd) {
  if (filter === 'custom') return { startDate: customStart || '', endDate: customEnd || '' };
  if (!filter) return { startDate: '', endDate: '' };
  const today = new Date();
  const current = today.toISOString().slice(0, 10);
  if (filter === 'today') return { startDate: current, endDate: current };
  if (filter === '7days') {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { startDate: start.toISOString().slice(0, 10), endDate: current };
  }
  if (filter === 'month') return { startDate: `${current.slice(0, 7)}-01`, endDate: current };
  const previous = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return { startDate: previous.toISOString().slice(0, 10), endDate: new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10) };
}

function exportReport(type, comment = '') {
  const rows = getFilteredList().map((item) => ({
    Data: fmtDate(item.data),
    Cliente: item.nome,
    Mecânico: item.mecanico,
    Modelo: item.modelo,
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
    doc.text('Relatório de Manutenção de Bikes', 14, 16);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 24);
    const commentLines = comment ? doc.splitTextToSize(`Comentário: ${comment}`, 270) : [];
    if (commentLines.length) doc.text(commentLines, 14, 31);

    const headers = Object.keys(rows[0]);
    const body = rows.map((row) => headers.map((header) => row[header] ?? ''));

    doc.autoTable({
      head: [headers],
      body,
      startY: commentLines.length ? 35 + (commentLines.length - 1) * 5 : 30,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [245, 166, 35], textColor: [26, 18, 4], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10 }
    });

    doc.save('relatorio-manutencao-bikes.pdf');
    showToast('Relatório PDF gerado.');
    return;
  }

  if (type === 'xlsx') {
    if (!window.XLSX) {
      showToast('Biblioteca de Excel não carregada.');
      return;
    }

    const summaryRows = [
      { Item: 'Comentário', Quantidade: comment || '' },
      { Item: 'Quantidade total', Quantidade: rows.length }
    ];
    const summarySheet = window.XLSX.utils.json_to_sheet(summaryRows);
    const sheet = window.XLSX.utils.json_to_sheet(rows);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
    window.XLSX.utils.book_append_sheet(workbook, sheet, 'Relatorio');
    window.XLSX.writeFile(workbook, 'relatorio-manutencao-bikes.xlsx');
    showToast('Arquivo .xlsx exportado.');
  }
}

function openReportDialog(type) {
  openModal({
    title: 'Gerar relatório de manutenção',
    fieldsHtml: `
      <div class="field">
        <label>Comentário do relatório</label>
        <textarea name="comentarioRelatorio" maxlength="1000" placeholder="Registre um comentário para este relatório" style="width:100%;min-height:96px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);padding:10px;border-radius:6px;"></textarea>
      </div>
    `,
    onSubmit: (formData, close) => {
      exportReport(type, String(formData.get('comentarioRelatorio') || '').trim());
      close();
    }
  });
}

function importReport(rows) {
  const labels = statusLabel();
  const statusByLabel = Object.fromEntries(Object.entries(labels).map(([value, label]) => [normalizeHeader(label), value]));
  const list = getList();
  let added = 0;
  let updated = 0;

  rows.forEach((row) => {
    const item = {
      data: importedDate(importedValue(row, ['data'])),
      nome: String(importedValue(row, ['cliente', 'nome'])).trim(),
      mecanico: String(importedValue(row, ['mecanico', 'mecanico responsavel'])).trim(),
      modelo: String(importedValue(row, ['modelo'])).trim(),
      status: statusByLabel[normalizeHeader(importedValue(row, ['status']))] || 'pendente'
    };
    if (!item.data || !item.nome || !item.modelo) return;

    const current = list.find((entry) => entry.data === item.data && entry.nome.toLowerCase() === item.nome.toLowerCase() && entry.modelo.toLowerCase() === item.modelo.toLowerCase());
    if (current) {
      Object.assign(current, item);
      updated += 1;
    } else {
      list.push({ id: uid(), ...item });
      added += 1;
    }
  });

  if (!added && !updated) {
    showToast('Nenhum registro válido encontrado no relatório.');
    return;
  }
  saveList(list);
  renderAll();
  showToast(`${added} novo(s), ${updated} atualizado(s). Comentários ignorados.`);
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
    nome: String(formData.get('nome')).trim(),
    mecanico: String(formData.get('mecanico')).trim(),
    modelo: String(formData.get('modelo')).trim(),
    status: String(formData.get('status'))
  });

  saveList(list);
  renderAll();
  close();
  showToast('Ordem de serviço criada.');
}

function editItem(id) {
  const item = getList().find((entry) => entry.id === id);
  if (!item) return;

  openModal({
    title: 'Editar ordem de manutenção',
    fieldsHtml: fieldsHtml(item),
    onSubmit: (formData, close) => {
      const list = getList();
      const current = list.find((entry) => entry.id === id);
      if (!current) return;

      Object.assign(current, {
        data: parseDateInput(String(formData.get('data'))),
        nome: String(formData.get('nome')).trim(),
        mecanico: String(formData.get('mecanico')).trim(),
        modelo: String(formData.get('modelo')).trim(),
        status: String(formData.get('status'))
      });

      saveList(list);
      renderAll();
      close();
      showToast('Ordem atualizada.');
    }
  });
}

function deleteItem(id) {
  if (!confirm('Remover esta ordem de manutenção?')) return;

  const list = getList().filter((item) => item.id !== id);
  saveList(list);
  renderAll();
  showToast('Ordem removida.');
}

export function initManutencao() {
  const addButton = document.getElementById('btn-add-manut');
  const searchInput = document.getElementById('manut-search');
  const dateFilter = document.getElementById('manut-date-filter');
  const customDates = document.getElementById('manut-date-custom');
  const startDate = document.getElementById('manut-date-start');
  const endDate = document.getElementById('manut-date-end');
  const tbody = document.getElementById('manut-tbody');

  if (addButton) {
    addButton.addEventListener('click', () => {
      openModal({
        title: 'Nova ordem de manutenção',
        fieldsHtml: fieldsHtml(),
        onSubmit: addItem
      });
    });
  }

  if (searchInput) searchInput.addEventListener('input', renderAll);
  if (dateFilter) dateFilter.addEventListener('change', () => { customDates.hidden = dateFilter.value !== 'custom'; renderAll(); });
  if (startDate) startDate.addEventListener('change', renderAll);
  if (endDate) endDate.addEventListener('change', renderAll);

  if (tbody) {
    tbody.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const { action, id } = button.dataset;
      if (action === 'edit-manut') editItem(id);
      if (action === 'delete-manut') deleteItem(id);
    });
  }

  document.querySelectorAll('.btn-export[data-panel="manutencao"]').forEach((button) => {
    button.addEventListener('click', () => openReportDialog(button.dataset.type));
  });
  setupReportImport({ panel: 'manutencao', onImport: importReport });

  renderAll();
}
