import { readStorage, writeStorage } from './storage.js';
import { uid, formatDateDisplay, formatDateInput, parseDateInput, escapeHtml, openModal, showToast, fmtDate } from './utils.js';

const STORAGE_KEY = 'baterias';

const REFERENCE_TABLES = {
  '36v': [
    { voltage: 30, charge: 0 },
    { voltage: 37, charge: 50 },
    { voltage: 40, charge: 80 },
    { voltage: 42, charge: 100 }
  ],
  '48v': [
    { voltage: 39, charge: 0 },
    { voltage: 48.1, charge: 50 },
    { voltage: 52, charge: 80 },
    { voltage: 54.6, charge: 100 }
  ]
};

export function analyzeBattery(data = {}) {
  const type = String(data.tipo || '').toLowerCase();
  const references = REFERENCE_TABLES[type];
  const voltage = Number(data.voltagem);

  if (!references || !Number.isFinite(voltage)) {
    return { health: 'sem-analise', healthLabel: 'Sem análise', condition: '', conditionLabel: 'Sem análise', charge: null, diagnosis: 'Informe a voltagem medida.' };
  }

  const minimum = references[0].voltage;
  const maximum = references[references.length - 1].voltage;
  let charge = 0;
  if (voltage >= maximum) charge = 100;
  else if (voltage > minimum) {
    const upper = references.find((point) => point.voltage >= voltage);
    const lower = references[references.indexOf(upper) - 1];
    charge = lower.charge + ((voltage - lower.voltage) / (upper.voltage - lower.voltage)) * (upper.charge - lower.charge);
  }

  const health = voltage > maximum ? 'critico' : voltage < minimum ? 'critico' : charge >= 50 ? 'normal' : 'atencao';
  const healthLabel = { normal: 'Normal', atencao: 'Atenção', critico: 'Crítico', 'sem-analise': 'Sem análise' }[health];
  const condition = voltage > maximum ? 'sobrecarga' : charge === 100 ? 'completa' : charge >= 80 ? 'alta' : charge >= 50 ? 'nominal' : charge > 0 ? 'baixa' : 'critica';
  const conditionLabel = { sobrecarga: 'Sobrecarga', completa: 'Carga completa', alta: 'Carga alta', nominal: 'Carga nominal', baixa: 'Carga baixa', critica: 'Crítica / defeituosa' }[condition];
  const diagnosis = [];
  if (voltage > maximum) diagnosis.push('acima da voltagem máxima');
  else if (voltage < minimum) diagnosis.push('abaixo do corte BMS');
  else if (data.estadoMedicao === 'carga') diagnosis.push('tensão sob carga; repetir em repouso');
  return {
    health,
    healthLabel,
    condition,
    conditionLabel,
    charge: Math.round(Math.max(0, Math.min(100, charge))),
    diagnosis: diagnosis.join('; ') || 'sem anomalias identificadas'
  };
}

function getList() {
  return readStorage(STORAGE_KEY, []);
}

function saveList(list) {
  writeStorage(STORAGE_KEY, list);
}

function fieldsHtml(data = {}) {
  const tipo = data.tipo || '36v';
  const observacao = data.observacao || '';
  const analysis = analyzeBattery(data);

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
        </select>
      </div>
      <div class="field"><label>Amperes</label><input required type="text" name="amperes" placeholder="Ex: 20Ah" value="${data.amperes || ''}"></div>
    </div>
    <div class="grid-2">
      <div class="field"><label>Voltagem medida (V)</label><input required type="number" min="0" step="0.1" name="voltagem" placeholder="Ex: 40.5" value="${data.voltagem ?? ''}"></div>
      <div class="field"><label>Estado da medição</label>
        <select name="estadoMedicao" style="width:100%;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;padding:11px 13px;color:var(--text);font-size:14px;">
          <option value="repouso" ${data.estadoMedicao !== 'carga' ? 'selected' : ''}>Em repouso</option>
          <option value="carga" ${data.estadoMedicao === 'carga' ? 'selected' : ''}>Sob carga/aceleração</option>
        </select>
      </div>
    </div>
    <div class="field"><label>Condição calculada</label>
      <input type="text" id="battery-condition-preview" readonly value="${analysis.charge === null ? '' : `${analysis.conditionLabel} - ${analysis.charge}%`}">
    </div>
    <div class="field"><label>Observação</label><textarea name="observacao" placeholder="Observações sobre o teste" maxlength="500" style="width:100%;min-height:64px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);padding:10px;border-radius:6px;">${escapeHtml(observacao)}</textarea></div>
  `;
}

function renderStats() {
  const list = getList();
  const totalQuantidade = list.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);
  const normalQuantidade = list
    .filter((item) => analyzeBattery(item).health === 'normal')
    .reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);
  const atencaoQuantidade = list
    .filter((item) => analyzeBattery(item).health === 'atencao')
    .reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);
  const criticoQuantidade = list
    .filter((item) => analyzeBattery(item).health === 'critico')
    .reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);

  document.getElementById('baterias-stats').innerHTML = `
    <div class="stat"><div class="n">${totalQuantidade}</div><div class="l">Quantidade total</div></div>
    <div class="stat teal"><div class="n">${normalQuantidade}</div><div class="l">Normal</div></div>
    <div class="stat amber"><div class="n">${atencaoQuantidade}</div><div class="l">Atenção</div></div>
    <div class="stat danger"><div class="n">${criticoQuantidade}</div><div class="l">Crítico</div></div>
  `;
}

function renderTable() {
  const search = (document.getElementById('baterias-search')?.value || '').toLowerCase();
  const conditionFilter = document.getElementById('baterias-condition-filter')?.value || '';
  const list = getList()
    .filter((item) => {
      const analysis = analyzeBattery(item);
      const text = `${item.marca || ''} ${item.tipo || ''} ${item.observacao || ''} ${analysis.diagnosis}`.toLowerCase();
      return (!search || text.includes(search)) && (!conditionFilter || analysis.condition === conditionFilter);
    })
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  const tbody = document.getElementById('baterias-tbody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="12">Nenhum teste encontrado. Clique em "+ Novo teste" para cadastrar.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map((item) => {
    const analysis = analyzeBattery(item);
    return `
    <tr>
      <td class="cell-mono">${fmtDate(item.data)}</td>
      <td class="cell-mono">${escapeHtml(item.quantidade)}</td>
      <td>${escapeHtml(item.marca)}</td>
      <td class="cell-mono">${escapeHtml(item.tipo)}</td>
      <td class="cell-mono">${item.voltagem == null || Number.isNaN(Number(item.voltagem)) ? '—' : `${escapeHtml(item.voltagem)} V`}</td>
      <td class="cell-mono">${escapeHtml(item.amperes)}</td>
      <td class="cell-mono">${analysis.charge === null ? '—' : `${analysis.charge}%`}</td>
      <td><span class="condition-pill ${analysis.condition}">${analysis.conditionLabel}</span></td>
      <td>${escapeHtml(analysis.diagnosis)}</td>
      <td>${escapeHtml(item.observacao || '')}</td>
      <td><span class="badge ${analysis.health}"><span class="seg"><i></i><i></i><i></i></span>${analysis.healthLabel}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" class="icon-btn" data-action="edit-bateria" data-id="${item.id}">✎</button>
          <button type="button" class="icon-btn danger" data-action="delete-bateria" data-id="${item.id}">✕</button>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

function getFilteredList() {
  const search = (document.getElementById('baterias-search')?.value || '').toLowerCase();
  return getList()
    .filter((item) => {
      if (!search) return true;
      const marca = (item.marca || '').toLowerCase();
      const tipoI = (item.tipo || '').toLowerCase();
      const obs = (item.observacao || '').toLowerCase();
      return marca.includes(search) || tipoI.includes(search) || obs.includes(search);
    })
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

function getReportSummary(list) {
  const conditions = [
    ['completa', 'Carga completa'],
    ['alta', 'Carga alta'],
    ['nominal', 'Carga nominal'],
    ['baixa', 'Carga baixa'],
    ['sobrecarga', 'Sobrecarga'],
    ['critica', 'Crítica / defeituosa']
  ];
  const quantities = Object.fromEntries(conditions.map(([key]) => [key, 0]));

  list.forEach((item) => {
    const condition = analyzeBattery(item).condition;
    if (condition in quantities) quantities[condition] += Number(item.quantidade) || 0;
  });

  return {
    total: list.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0),
    conditions: conditions.map(([key, label]) => ({ label, quantity: quantities[key] }))
  };
}

function exportReport(type, comment = '') {
  const list = getFilteredList();
  const summary = getReportSummary(list);
  const rows = list.map((item) => {
    const analysis = analyzeBattery(item);
    return {
      Data: fmtDate(item.data),
      Quantidade: item.quantidade,
      Marca: item.marca,
      Observação: item.observacao || '',
      Tipo: item.tipo,
      'Voltagem medida': item.voltagem == null || Number.isNaN(Number(item.voltagem)) ? '—' : `${item.voltagem} V`,
      Amperes: item.amperes,
      'Carga estimada': analysis.charge === null ? '—' : `${analysis.charge}%`,
      Condição: analysis.conditionLabel,
      Diagnóstico: analysis.diagnosis,
      Status: analysis.healthLabel
    };
  });

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
    doc.text(`Quantidade total: ${summary.total}`, 14, 31);

    const summaryText = summary.conditions.map(({ label, quantity }) => `${label}: ${quantity}`).join(' | ');
    doc.text(summaryText, 14, 38, { maxWidth: 270 });
    const commentLines = comment ? doc.splitTextToSize(`Comentário: ${comment}`, 270) : [];
    if (commentLines.length) doc.text(commentLines, 14, 45);

    const headers = Object.keys(rows[0]);
    const body = rows.map((row) => headers.map((header) => row[header] ?? ''));

    doc.autoTable({
      head: [headers],
      body,
      startY: commentLines.length ? 49 + (commentLines.length - 1) * 5 : 43,
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

    const summaryRows = [
      { Item: 'Comentário', Quantidade: comment || '' },
      { Item: 'Quantidade total', Quantidade: summary.total },
      ...summary.conditions.map(({ label, quantity }) => ({ Item: label, Quantidade: quantity }))
    ];
    const sheet = window.XLSX.utils.json_to_sheet(rows);
    const summarySheet = window.XLSX.utils.json_to_sheet(summaryRows);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
    window.XLSX.utils.book_append_sheet(workbook, sheet, 'Relatorio');
    window.XLSX.writeFile(workbook, 'relatorio-teste-baterias.xlsx');
    showToast('Arquivo .xlsx exportado.');
  }
}

function openReportDialog(type) {
  if (!getFilteredList().length) {
    showToast('Nenhum dado para exportar neste relatório.');
    return;
  }

  openModal({
    title: 'Gerar relatório de baterias',
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

function renderAll() {
  renderStats();
  renderTable();
}

function updateConditionPreview(form) {
  if (!form) return;
  const preview = form.querySelector('#battery-condition-preview');
  const typeField = form.querySelector('[name="tipo"]');
  const voltageField = form.querySelector('[name="voltagem"]');
  if (!preview) return;
  if (!typeField || !voltageField || voltageField.value.trim() === '') {
    preview.value = '';
    return;
  }

  const analysis = analyzeBattery({
    tipo: typeField.value,
    voltagem: voltageField.value
  });
  preview.value = analysis.charge === null ? '' : `${analysis.conditionLabel} - ${analysis.charge}%`;
}

function bindConditionPreview(form) {
  if (!form) return;
  form.addEventListener('input', (event) => {
    if (event.target.matches('input[name="voltagem"]')) updateConditionPreview(form);
  });
  form.addEventListener('change', (event) => {
    if (event.target.matches('select[name="tipo"]')) updateConditionPreview(form);
  });
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
    voltagem: Number(formData.get('voltagem')),
    estadoMedicao: String(formData.get('estadoMedicao')),
    observacao: String(formData.get('observacao') || '').trim(),
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
    onOpen: bindConditionPreview,
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
        voltagem: Number(formData.get('voltagem')),
        estadoMedicao: String(formData.get('estadoMedicao')),
        observacao: String(formData.get('observacao') || '').trim(),
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
        onOpen: bindConditionPreview,
        onSubmit: addItem
      });
    });
  }

  if (searchInput) searchInput.addEventListener('input', renderAll);
  const conditionFilter = document.getElementById('baterias-condition-filter');
  if (conditionFilter) conditionFilter.addEventListener('change', renderAll);

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
    button.addEventListener('click', () => openReportDialog(button.dataset.type));
  });

  renderAll();
}
