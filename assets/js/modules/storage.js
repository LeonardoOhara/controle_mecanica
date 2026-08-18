export async function syncFromBackend(keys = []) {
  await Promise.all(keys.map(async (key) => {
    try {
      const response = await fetch(`/api/data/${encodeURIComponent(key)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      localStorage.setItem(key, JSON.stringify(await response.json()));
    } catch (error) {
      console.warn(`Backend indisponível para ${key}; usando o cache local.`, error);
    }
  }));
}

export function readStorage(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));

  fetch(`/api/data/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  }).catch(() => {
    console.warn(`Não foi possível salvar ${key} no backend; o cache local foi mantido.`);
  });
}
