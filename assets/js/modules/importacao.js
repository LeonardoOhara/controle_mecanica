import { showToast } from './utils.js';

const HEADER_ALIASES = {
  pecas: ['data', 'nome', 'telefone', 'n pedido', 'rastreio sedex', 'status'],
  manutencao: ['data', 'cliente', 'mecanico', 'modelo', 'status'],
  bikes: ['data', 'codigo', 'modelo', 'pecas', 'pecas instaladas', 'movimentos', 'historico de movimentos', 'data movimento', 'acao', 'peca'],
  baterias: ['data', 'quantidade', 'marca', 'tipo', 'voltagem medida', 'amperes']
};

export function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function looksLikeHeader(row, panel) {
  const values = row.map(normalizeHeader);
  return HEADER_ALIASES[panel].filter((alias) => {
    const normalizedAlias = normalizeHeader(alias);
    return values.some((value) => value === normalizedAlias || value.includes(normalizedAlias));
  }).length >= 3;
}

function findHeader(rows, panel) {
  return rows.findIndex((row) => looksLikeHeader(row, panel));
}

function rowsFromSheet(sheet, panel) {
  const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const headerIndex = findHeader(rows, panel);
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex];
  return rows.slice(headerIndex + 1)
    .filter((row) => row.some((value) => String(value).trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

async function readXlsx(file, panel) {
  if (!window.XLSX) throw new Error('Biblioteca de Excel não carregada.');
  const workbook = window.XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  for (const sheetName of workbook.SheetNames) {
    const rows = rowsFromSheet(workbook.Sheets[sheetName], panel);
    if (rows.length) return rows;
  }
  throw new Error('Nenhuma tabela compatível foi encontrada no arquivo XLSX.');
}

function rowsFromPdfItems(items, panel) {
  const lines = new Map();
  items.forEach((item) => {
    const text = String(item.str || '').trim();
    if (!text) return;
    const y = Math.round(item.transform[5] * 10) / 10;
    const line = lines.get(y) || [];
    line.push({ x: item.transform[4], text });
    lines.set(y, line);
  });

  const orderedLines = [...lines.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, line]) => line.sort((a, b) => a.x - b.x));
  const headerIndex = orderedLines.findIndex((line) => looksLikeHeader(line.map(({ text }) => text), panel));
  if (headerIndex < 0) return [];

  const headerItems = orderedLines[headerIndex].filter(({ text }) => text.trim());
  const headers = headerItems.map(({ text }) => text);
  const boundaries = headerItems.map((item, index) => ({
    start: index === 0 ? -Infinity : (headerItems[index - 1].x + item.x) / 2,
    end: index === headerItems.length - 1 ? Infinity : (item.x + headerItems[index + 1].x) / 2
  }));

  return orderedLines.slice(headerIndex + 1)
    .filter((row) => row.length && !/^gerado em|^quantidade total|^comentario/i.test(row[0].text))
    .map((row) => {
      const values = headers.map(() => []);
      row.forEach(({ x, text }) => {
        const columnIndex = boundaries.findIndex(({ start, end }) => x >= start && x < end);
        if (columnIndex >= 0) values[columnIndex].push(text);
      });
      return Object.fromEntries(headers.map((header, index) => [header, values[index].join(' ')]));
    })
    .filter((row) => Object.values(row).some((value) => value));
}

function rowsFromPdfPages(pages, panel) {
  return pages.flatMap((items) => rowsFromPdfItems(items, panel));
}

async function readPdf(file, panel) {
  if (!window.pdfjsLib) throw new Error('Biblioteca de PDF não carregada.');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    pages.push((await page.getTextContent()).items);
  }
  const rows = rowsFromPdfPages(pages, panel);
  if (!rows.length) throw new Error('Nenhuma tabela compatível foi encontrada no arquivo PDF.');
  return rows;
}

export function setupReportImport({ panel, onImport }) {
  const button = document.querySelector(`.btn-import[data-panel="${panel}"]`);
  const input = document.querySelector(`.report-file[data-panel="${panel}"]`);
  if (!button || !input) return;

  const importFile = async (file) => {
    if (!file) return;
    try {
      const rows = file.name.toLowerCase().endsWith('.pdf')
        ? await readPdf(file, panel)
        : await readXlsx(file, panel);
      onImport(rows);
    } catch (error) {
      showToast(error.message || 'Não foi possível importar o relatório.');
    }
  };

  button.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const [file] = input.files;
    input.value = '';
    importFile(file);
  });
  button.addEventListener('dragover', (event) => {
    event.preventDefault();
    button.classList.add('dragging');
  });
  button.addEventListener('dragleave', () => button.classList.remove('dragging'));
  button.addEventListener('drop', (event) => {
    event.preventDefault();
    button.classList.remove('dragging');
    importFile(event.dataTransfer.files[0]);
  });
}

export function importedValue(row, aliases) {
  const entry = Object.entries(row).find(([header]) => aliases.includes(normalizeHeader(header)));
  return entry ? entry[1] : '';
}

export function importedDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  const text = String(value || '').trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}