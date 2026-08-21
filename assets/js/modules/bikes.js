import { readStorage, writeStorage } from './storage.js';
import { uid, formatDateDisplay, formatDateInput, parseDateInput, escapeHtml, openModal, showToast, fmtDate } from './utils.js';
import { importedDate, importedValue, normalizeHeader, setupReportImport } from './importacao.js';

const STORAGE_KEY = 'bikes';
const getList = () => readStorage(STORAGE_KEY, []);
const saveList = (list) => writeStorage(STORAGE_KEY, list);

function bikeFieldsHtml(data = {}) {
  return `
    <div class="grid-2">
      <div class="field"><label>Data</label><input required type="text" name="data" inputmode="numeric" pattern="\\d{2}/\\d{2}/\\d{4}" placeholder="dd/mm/yyyy" maxlength="10" oninput="window.__formatDateInput(this)" value="${formatDateDisplay(data.data)}"></div>
      <div class="field"><label>Código</label><input required type="text" name="codigo" placeholder="BIKE-0001" value="${escapeHtml(data.codigo || '')}"></div>
    </div>
    <div class="field"><label>Modelo</label><input required type="text" name="modelo" placeholder="Modelo da bike" value="${escapeHtml(data.modelo || '')}"></div>`;
}

function renderStats() {
  const list = getList();
  const pieces = list.reduce((total, bike) => total + (bike.pecas || []).length, 0);
  const movements = list.reduce((total, bike) => total + (bike.historico || []).length, 0);
  document.getElementById('bikes-stats').innerHTML = `
    <div class="stat"><div class="n">${list.length}</div><div class="l">Bikes cadastradas</div></div>
    <div class="stat teal"><div class="n">${pieces}</div><div class="l">Peças instaladas</div></div>
    <div class="stat amber"><div class="n">${movements}</div><div class="l">Movimentos registrados</div></div>`;
}

function renderTable() {
  const search = (document.getElementById('bikes-search')?.value || '').toLowerCase();
  const list = getList().filter((bike) => !search || `${bike.codigo} ${bike.modelo}`.toLowerCase().includes(search));
  const tbody = document.getElementById('bikes-tbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhuma bike encontrada. Clique em "+ Nova bike" para cadastrar.</td></tr>';
    return;
  }
  tbody.innerHTML = list.sort((a, b) => (b.data || '').localeCompare(a.data || '')).map((bike) => `
    <tr><td class="cell-mono">${fmtDate(bike.data)}</td><td class="cell-mono">${escapeHtml(bike.codigo)}</td><td>${escapeHtml(bike.modelo)}</td>
      <td>${(bike.pecas || []).length ? bike.pecas.map((peca) => `<span class="bike-piece">${escapeHtml(peca.nome)}</span>`).join('') : '<span class="muted-text">Nenhuma</span>'}</td>
      <td class="cell-mono">${(bike.historico || []).length}</td><td><div class="row-actions">
        <button type="button" class="icon-btn" data-action="manage-bike" data-id="${bike.id}" title="Gerenciar peças">⚙</button>
        <button type="button" class="icon-btn" data-action="edit-bike" data-id="${bike.id}" title="Editar bike">✎</button>
        <button type="button" class="icon-btn danger" data-action="delete-bike" data-id="${bike.id}" title="Excluir bike">✕</button>
      </div></td></tr>`).join('');
}

function getFilteredList() {
  const search = (document.getElementById('bikes-search')?.value || '').toLowerCase();
  return getList().filter((bike) => !search || `${bike.codigo} ${bike.modelo}`.toLowerCase().includes(search)).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

function serializeCollection(value) {
  return JSON.stringify(value || []);
}

function parseCollection(value, fallback = []) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function exportReport(type, comment = '') {
  const rows = getFilteredList().map((bike) => ({
    Data: fmtDate(bike.data),
    Código: bike.codigo,
    Modelo: bike.modelo,
    'Peças instaladas': serializeCollection(bike.pecas),
    'Histórico de movimentos': serializeCollection(bike.historico)
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
    const pdfRows = getFilteredList().flatMap((bike) => {
      const history = bike.historico || [];
      const movements = history.length ? history : [{}];
      return movements.map((move) => ({
        Data: fmtDate(bike.data),
        Código: bike.codigo,
        Modelo: bike.modelo,
        'Peças instaladas': (bike.pecas || []).map((piece) => piece.nome).join(' | '),
        'Data movimento': move.data ? fmtDate(move.data) : '',
        Hora: move.hora || '',
        Ação: move.acao || '',
        Peça: move.peca || '',
        Observação: move.observacao || ''
      }));
    });
    doc.setFontSize(16);
    doc.text('Relatório de Controle de Bikes', 14, 16);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 24);
    const commentLines = comment ? doc.splitTextToSize(`Comentário: ${comment}`, 270) : [];
    if (commentLines.length) doc.text(commentLines, 14, 31);
    const headers = Object.keys(pdfRows[0]);
    doc.autoTable({
      head: [headers],
      body: pdfRows.map((row) => headers.map((header) => row[header] ?? '')),
      startY: commentLines.length ? 35 + (commentLines.length - 1) * 5 : 30,
      styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: { fillColor: [245, 166, 35], textColor: [26, 18, 4], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 10, right: 10 }
    });
    doc.save('relatorio-controle-bikes.pdf');
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
    const sheet = window.XLSX.utils.json_to_sheet(rows);
    const summarySheet = window.XLSX.utils.json_to_sheet(summaryRows);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
    window.XLSX.utils.book_append_sheet(workbook, sheet, 'Relatorio');
    window.XLSX.writeFile(workbook, 'relatorio-controle-bikes.xlsx');
    showToast('Arquivo .xlsx exportado.');
  }
}

function openReportDialog(type) {
  if (!getFilteredList().length) {
    showToast('Nenhum dado para exportar neste relatório.');
    return;
  }

  openModal({
    title: 'Gerar relatório de bikes',
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
  const list = getList();
  let added = 0;
  let updated = 0;
  rows.forEach((row) => {
    const codigo = String(importedValue(row, ['codigo', 'código'])).trim().toUpperCase();
    const modelo = String(importedValue(row, ['modelo'])).trim();
    const data = importedDate(importedValue(row, ['data']));
    if (!codigo || !modelo || !data) return;
    const piecesValue = importedValue(row, ['pecas instaladas', 'pecas', 'peças instaladas']);
    const legacyPieces = String(piecesValue || '')
      .split(/[,;|]/).map((name) => name.trim()).filter(Boolean)
      .map((nome) => ({ id: uid(), nome }));
    const pieces = parseCollection(piecesValue, legacyPieces)
      .filter((piece) => piece && typeof piece === 'object' && String(piece.nome || '').trim())
      .map((piece) => ({ ...piece, id: piece.id || uid(), nome: String(piece.nome).trim() }));
    const history = parseCollection(importedValue(row, ['movimentos', 'historico de movimentos', 'histórico de movimentos', 'historico', 'histórico']))
      .filter((move) => move && typeof move === 'object' && String(move.peca || '').trim())
      .map((move) => ({
        ...move,
        id: move.id || uid(),
        data: importedDate(move.data) || String(move.data || '').trim(),
        hora: String(move.hora || '').trim(),
        acao: move.acao === 'retirada' ? 'retirada' : 'colocada',
        peca: String(move.peca).trim(),
        observacao: String(move.observacao || '').trim()
      }));
    const movementPiece = String(importedValue(row, ['peca', 'peça'])).trim();
    if (!history.length && movementPiece) {
      history.push({
        id: uid(),
        data: importedDate(importedValue(row, ['data movimento'])) || data,
        hora: String(importedValue(row, ['hora'])).trim(),
        acao: String(importedValue(row, ['acao', 'ação'])).trim().toLowerCase() === 'retirada' ? 'retirada' : 'colocada',
        peca: movementPiece,
        observacao: String(importedValue(row, ['observacao', 'observação'])).trim()
      });
    }
    const hasHistoryColumn = Object.keys(row).some((header) => ['movimentos', 'historico de movimentos', 'historico', 'data movimento', 'acao', 'peca'].includes(normalizeHeader(header)));
    const item = { data, codigo, modelo, pecas: pieces };
    const current = list.find((bike) => bike.codigo.toLowerCase() === codigo.toLowerCase());
    if (current) {
      Object.assign(current, item);
      if (hasHistoryColumn) current.historico = history;
      updated += 1;
    } else {
      list.push({ id: uid(), ...item, historico: hasHistoryColumn ? history : [] });
      added += 1;
    }
  });
  if (!added && !updated) {
    showToast('Nenhum registro válido encontrado no relatório.');
    return;
  }
  saveList(list);
  renderAll();
  showToast(`${added} nova(s), ${updated} atualizada(s).`);
}

function renderAll() { renderStats(); renderTable(); }

function saveBikeForm(formData, id, close) {
  const list = getList();
  const values = { data: parseDateInput(String(formData.get('data'))), codigo: String(formData.get('codigo')).trim().toUpperCase(), modelo: String(formData.get('modelo')).trim() };
  if (id) {
    const bike = list.find((item) => item.id === id);
    if (!bike) return;
    Object.assign(bike, values);
    showToast('Bike atualizada.');
  } else {
    list.push({ id: uid(), ...values, pecas: [], historico: [] });
    showToast('Bike cadastrada com sucesso.');
  }
  saveList(list); renderAll(); close();
}

function editBike(id) {
  const bike = getList().find((item) => item.id === id);
  if (bike) openModal({ title: 'Editar bike', fieldsHtml: bikeFieldsHtml(bike), onSubmit: (formData, close) => saveBikeForm(formData, id, close) });
}

function movementFieldsHtml(bike) {
  const pieces = (bike.pecas || []).map((peca) => `<span class="bike-piece">${escapeHtml(peca.nome)}</span>`).join('') || '<span class="muted-text">Nenhuma peça instalada.</span>';
  const history = (bike.historico || []).slice().reverse().map((move) => `<div class="bike-history-row"><div class="bike-history-meta"><span class="cell-mono">${fmtDate(move.data)}</span><span class="history-time">${escapeHtml(move.hora || '')}</span></div><strong class="movement-${move.acao}">${move.acao === 'retirada' ? 'RETIRADA' : 'INSTALADA'}</strong><div class="bike-history-detail"><span class="bike-history-piece">${escapeHtml(move.peca)}</span>${move.observacao ? `<span class="muted-text">${escapeHtml(move.observacao)}</span>` : ''}</div></div>`).join('') || '<div class="bike-history-empty"><span aria-hidden="true">—</span><span>Nenhum movimento registrado.</span></div>';
  return `<div class="bike-modal-context"><strong>${escapeHtml(bike.codigo)}</strong><span>${escapeHtml(bike.modelo)}</span></div>
    <div class="field"><label>Peças instaladas</label><div class="bike-piece-list">${pieces}</div></div>
    <div class="grid-2"><div class="field"><label>Ação</label><select required name="acao"><option value="retirada">Retirada</option><option value="colocada">Instalada</option></select></div>
      <div class="field"><label>Data</label><input required type="text" name="data" inputmode="numeric" pattern="\\d{2}/\\d{2}/\\d{4}" placeholder="dd/mm/yyyy" maxlength="10" oninput="window.__formatDateInput(this)" value="${formatDateDisplay(new Date().toISOString().slice(0, 10))}"></div></div>
    <div class="field"><label>Peça</label><input required type="text" name="peca" placeholder="Ex.: controlador, freio, display"></div>
    <div class="field"><label>Observação</label><input type="text" name="observacao" placeholder="Motivo ou condição da peça"></div>
    <div class="bike-history"><label>Histórico de movimentos</label>${history}</div>`;
}

function manageBike(id) {
  const bike = getList().find((item) => item.id === id);
  if (!bike) return;
  openModal({ title: 'Movimentar peças', fieldsHtml: movementFieldsHtml(bike), onSubmit: (formData, close) => {
    const list = getList(); const current = list.find((item) => item.id === id); if (!current) return;
    const peca = String(formData.get('peca')).trim(); const acao = String(formData.get('acao')); const normalized = peca.toLowerCase();
    current.pecas = current.pecas || []; current.historico = current.historico || [];
    if (acao === 'retirada') current.pecas = current.pecas.filter((item) => item.nome.toLowerCase() !== normalized);
    else if (!current.pecas.some((item) => item.nome.toLowerCase() === normalized)) current.pecas.push({ id: uid(), nome: peca });
    const timestamp = new Date();
    current.historico.push({ id: uid(), data: parseDateInput(String(formData.get('data'))), hora: timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), acao, peca, observacao: String(formData.get('observacao')).trim() });
    saveList(list); renderAll(); close(); showToast(acao === 'retirada' ? 'Retirada registrada.' : 'Peça colocada novamente.');
  } });
}

function deleteBike(id) {
  if (!confirm('Remover esta bike e todo o seu histórico?')) return;
  saveList(getList().filter((bike) => bike.id !== id)); renderAll(); showToast('Bike removida.');
}

export function initBikes() {
  const search = document.getElementById('bikes-search'); const addButton = document.getElementById('btn-add-bike'); const tbody = document.getElementById('bikes-tbody');
  if (search) search.addEventListener('input', renderTable);
  if (addButton) addButton.addEventListener('click', () => openModal({ title: 'Nova bike', fieldsHtml: bikeFieldsHtml(), onSubmit: (formData, close) => saveBikeForm(formData, null, close) }));
  if (tbody) tbody.addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button) return; const { action, id } = button.dataset; if (action === 'manage-bike') manageBike(id); if (action === 'edit-bike') editBike(id); if (action === 'delete-bike') deleteBike(id); });
  document.querySelectorAll('.btn-export[data-panel="bikes"]').forEach((button) => button.addEventListener('click', () => openReportDialog(button.dataset.type)));
  setupReportImport({ panel: 'bikes', onImport: importReport });
  window.__formatDateInput = formatDateInput; renderAll();
}