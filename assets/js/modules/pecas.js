import { readStorage, writeStorage } from './storage.js';
import { uid, formatDateDisplay, formatDateInput, parseDateInput, escapeHtml, openModal, showToast, fmtDate } from './utils.js';
import { importedDate, importedValue, normalizeHeader, setupReportImport } from './importacao.js';

const STORAGE_KEY = 'pecas';

function getList() {
  return readStorage(STORAGE_KEY, []);
}

function saveList(list) {
  writeStorage(STORAGE_KEY, list);
}

function pecaStatusLabel() {
  return {
    aguardando_envio: 'Aguardando envio',
    enviado: 'Enviado',
    retorno: 'Retorno'
  };
}

function pecaFieldsHtml(data = {}) {
  return `
    <div class="grid-2">
      <div class="field"><label>Data</label><input required type="text" name="data" inputmode="numeric" pattern="\\d{2}/\\d{2}/\\d{4}" placeholder="dd/mm/yyyy" maxlength="10" oninput="window.__formatDateInput(this)" value="${formatDateDisplay(data.data)}"></div>
      <div class="field"><label>Telefone</label><input required type="text" name="telefone" placeholder="(11) 91234-5678" value="${data.telefone || ''}"></div>
    </div>
    <div class="field"><label>Nome</label><input required type="text" name="nome" placeholder="Nome do destinatário" value="${data.nome || ''}"></div>
    <div class="grid-2">
      <div class="field"><label>Nº do Pedido</label><input required type="text" name="numeroPedido" placeholder="PED-0001" value="${data.numeroPedido || ''}"></div>
      <div class="field"><label>Rastreio Sedex</label><input required type="text" name="rastreio" placeholder="BR123456789BR" value="${data.rastreio || ''}"></div>
    </div>
  `;
}

function renderStats() {
  const list = getList();
  const statusCount = (status) => list.filter((item) => (item.status || 'aguardando_envio') === status).length;
  const daysWithOrders = new Set(list.filter((item) => item.data).map((item) => item.data)).size;
  const averagePerDay = daysWithOrders ? (list.length / daysWithOrders).toFixed(1).replace('.', ',') : '0,0';

  document.getElementById('pecas-stats').innerHTML = `
    <div class="stat"><div class="n">${list.length}</div><div class="l">Total de pedidos</div></div>
    <div class="stat teal"><div class="n">${averagePerDay}</div><div class="l">Média de pedidos/dia</div></div>
    <div class="stat danger"><div class="n">${statusCount('aguardando_envio')}</div><div class="l">Aguardando envio</div></div>
    <div class="stat teal"><div class="n">${statusCount('enviado')}</div><div class="l">Enviados</div></div>
    <div class="stat amber"><div class="n">${statusCount('retorno')}</div><div class="l">Retorno</div></div>
  `;
}

function renderTable() {
  const search = (document.getElementById('pecas-search')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('pecas-status-filter')?.value || 'todos';
  const monthFilter = document.getElementById('pecas-month-filter')?.value || 'todos';

  const list = getList()
    .filter((item) => (
      (statusFilter === 'todos' || (item.status || 'aguardando_envio') === statusFilter) &&
      (monthFilter === 'todos' || (item.data || '').startsWith(monthFilter)) &&
      (!search ||
        item.nome.toLowerCase().includes(search) ||
        item.numeroPedido.toLowerCase().includes(search) ||
        item.rastreio.toLowerCase().includes(search))
    ))
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  const tbody = document.getElementById('pecas-tbody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Nenhum envio encontrado. Clique em "+ Novo envio" para cadastrar.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map((item) => `
    <tr>
      <td class="cell-mono">${fmtDate(item.data)}</td>
      <td>${escapeHtml(item.nome)}</td>
      <td class="cell-mono">${escapeHtml(item.telefone)}</td>
      <td class="cell-mono">${escapeHtml(item.numeroPedido)}</td>
      <td class="cell-mono">${escapeHtml(item.rastreio)}</td>
      <td>
        <select class="status-select ${(item.status || 'aguardando_envio')}" data-id="${item.id}" aria-label="Status do envio">
          ${Object.entries(pecaStatusLabel()).map(([value, label]) => `<option value="${value}" ${((item.status || 'aguardando_envio') === value ? 'selected' : '')}>${label}</option>`).join('')}
        </select>
      </td>
      <td>
        <div class="row-actions">
          <button type="button" class="icon-btn" data-action="edit-peca" data-id="${item.id}">✎</button>
          <button type="button" class="icon-btn danger" data-action="delete-peca" data-id="${item.id}">✕</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderMonthFilter() {
  const filter = document.getElementById('pecas-month-filter');
  if (!filter) return;

  const current = filter.value;
  const months = [...new Set(getList().filter((item) => item.data).map((item) => item.data.slice(0, 7)))].sort().reverse();

  filter.innerHTML = '<option value="todos">Visualizar: todos os meses</option>' + months.map((month) => {
    const [year, monthNumber] = month.split('-');
    return `<option value="${month}">${monthNumber}/${year}</option>`;
  }).join('');

  filter.value = months.includes(current) ? current : 'todos';
}

function getFilteredList() {
  const search = (document.getElementById('pecas-search')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('pecas-status-filter')?.value || 'todos';
  const monthFilter = document.getElementById('pecas-month-filter')?.value || 'todos';

  return getList()
    .filter((item) => (
      (statusFilter === 'todos' || (item.status || 'aguardando_envio') === statusFilter) &&
      (monthFilter === 'todos' || (item.data || '').startsWith(monthFilter)) &&
      (!search ||
        item.nome.toLowerCase().includes(search) ||
        item.numeroPedido.toLowerCase().includes(search) ||
        item.rastreio.toLowerCase().includes(search))
    ))
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

function exportReport(type, comment = '') {
  const rows = getFilteredList().map((item) => ({
    Data: fmtDate(item.data),
    Nome: item.nome,
    Telefone: item.telefone,
    'Nº Pedido': item.numeroPedido,
    'Rastreio Sedex': item.rastreio,
    Status: pecaStatusLabel()[(item.status || 'aguardando_envio')]
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
    doc.text('Relatório de Envio de Peças', 14, 16);
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

    doc.save('relatorio-envio-pecas.pdf');
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
    window.XLSX.writeFile(workbook, 'relatorio-envio-pecas.xlsx');
    showToast('Arquivo .xlsx exportado.');
  }
}

function openReportDialog(type) {
  openModal({
    title: 'Gerar relatório de peças',
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
  const labels = pecaStatusLabel();
  const statusByLabel = Object.fromEntries(Object.entries(labels).map(([value, label]) => [normalizeHeader(label), value]));
  const list = getList();
  let added = 0;
  let updated = 0;

  rows.forEach((row) => {
    const item = {
      data: importedDate(importedValue(row, ['data'])),
      nome: String(importedValue(row, ['nome'])).trim(),
      telefone: String(importedValue(row, ['telefone'])).trim(),
      numeroPedido: String(importedValue(row, ['n pedido', 'numero pedido'])).trim(),
      rastreio: String(importedValue(row, ['rastreio sedex', 'rastreio'])).trim().toUpperCase(),
      status: statusByLabel[normalizeHeader(importedValue(row, ['status']))] || 'aguardando_envio'
    };
    if (!item.nome || (!item.numeroPedido && !item.rastreio)) return;

    const current = list.find((entry) => (item.numeroPedido && entry.numeroPedido === item.numeroPedido) || (item.rastreio && entry.rastreio === item.rastreio));
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
  renderMonthFilter();
  renderStats();
  renderTable();
}

function updateStatus(id, status) {
  const list = getList();
  const item = list.find((entry) => entry.id === id);
  if (!item || !pecaStatusLabel()[status]) return;

  item.status = status;
  saveList(list);
  renderAll();
  showToast(`Status alterado para ${pecaStatusLabel()[status]}.`);
}

function addItem(event) {
  const list = getList();
  const form = new FormData(event.target);
  const item = {
    id: uid(),
    data: parseDateInput(form.get('data')),
    nome: form.get('nome').trim(),
    telefone: form.get('telefone').trim(),
    numeroPedido: form.get('numeroPedido').trim(),
    rastreio: String(form.get('rastreio')).trim().toUpperCase(),
    status: 'aguardando_envio'
  };

  list.push(item);
  saveList(list);
  renderAll();
  showToast('Envio cadastrado com sucesso.');
}

function editItem(id) {
  const item = getList().find((entry) => entry.id === id);
  if (!item) return;

  openModal({
    title: 'Editar envio',
    fieldsHtml: pecaFieldsHtml(item),
    onSubmit: (formData, close) => {
      const list = getList();
      const current = list.find((entry) => entry.id === id);
      if (!current) return;

      Object.assign(current, {
        data: parseDateInput(formData.get('data')),
        nome: String(formData.get('nome')).trim(),
        telefone: String(formData.get('telefone')).trim(),
        numeroPedido: String(formData.get('numeroPedido')).trim(),
        rastreio: String(formData.get('rastreio')).trim().toUpperCase()
      });

      saveList(list);
      renderAll();
      close();
      showToast('Envio atualizado.');
    }
  });
}

function deleteItem(id) {
  if (!confirm('Remover este registro de envio?')) return;

  const list = getList().filter((item) => item.id !== id);
  saveList(list);
  renderAll();
  showToast('Envio removido.');
}

export function initPecas() {
  const inputSearch = document.getElementById('pecas-search');
  const statusFilter = document.getElementById('pecas-status-filter');
  const monthFilter = document.getElementById('pecas-month-filter');
  const addButton = document.getElementById('btn-add-peca');
  const tbody = document.getElementById('pecas-tbody');

  if (inputSearch) inputSearch.addEventListener('input', renderAll);
  if (statusFilter) statusFilter.addEventListener('change', renderAll);
  if (monthFilter) monthFilter.addEventListener('change', renderAll);

  if (addButton) {
    addButton.addEventListener('click', () => {
      openModal({
        title: 'Novo envio de peça',
        fieldsHtml: pecaFieldsHtml(),
        onSubmit: (formData, close) => {
          const list = getList();
          list.push({
            id: uid(),
            data: parseDateInput(String(formData.get('data'))),
            nome: String(formData.get('nome')).trim(),
            telefone: String(formData.get('telefone')).trim(),
            numeroPedido: String(formData.get('numeroPedido')).trim(),
            rastreio: String(formData.get('rastreio')).trim().toUpperCase(),
            status: 'aguardando_envio'
          });
          saveList(list);
          renderAll();
          close();
          showToast('Envio cadastrado com sucesso.');
        }
      });
    });
  }

  if (tbody) {
    tbody.addEventListener('change', (event) => {
      const select = event.target.closest('.status-select');
      if (!select) return;
      updateStatus(select.dataset.id, select.value);
    });

    tbody.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const { action, id } = button.dataset;
      if (action === 'edit-peca') editItem(id);
      if (action === 'delete-peca') deleteItem(id);
    });
  }

  document.querySelectorAll('.btn-export[data-panel="pecas"]').forEach((button) => {
    button.addEventListener('click', () => openReportDialog(button.dataset.type));
  });
  setupReportImport({ panel: 'pecas', onImport: importReport });

  window.__formatDateInput = formatDateInput;
  renderAll();
}
