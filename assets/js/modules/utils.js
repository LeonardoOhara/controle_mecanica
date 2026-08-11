export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function formatDateDisplay(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  return value;
}

export function formatDateInput(input) {
  const digits = input.value.replace(/\D/g, '').slice(0, 8);
  input.value = digits
    .replace(/^(\d{2})(\d)/, '$1/$2')
    .replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2');
}

export function parseDateInput(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return '';

  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return '';
  }

  return `${year}-${month}-${day}`;
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

export function openModal({ title, fieldsHtml, onSubmit }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h3>${title}</h3>
        <button type="button" class="modal-close">×</button>
      </div>
      <form id="dynamic-form">
        <div class="modal-body">${fieldsHtml}</div>
        <div class="modal-foot">
          <button type="button" class="btn-secondary" id="cancel-modal">Cancelar</button>
          <button type="submit" class="btn-submit">Salvar</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.querySelector('#cancel-modal').addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  overlay.querySelector('#dynamic-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    onSubmit(form, close);
  });
}

export function showToast(message) {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-msg');
  if (!toast || !toastText) return;

  toastText.textContent = message;
  toast.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

export function fmtDate(dateString) {
  if (!dateString) return '—';
  const [year, month, day] = String(dateString).split('-');
  return `${day}/${month}/${year}`;
}
