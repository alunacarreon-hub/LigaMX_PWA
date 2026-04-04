// ─── ENDPOINT ─────────────────────────────────────────────────────────────────
const API_URL = 'https://n8n-n8n.3ejopk.easypanel.host/webhook/ligamx-api';

window.loadAppData = async function () {
  const res = await fetch(API_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
  const data = await res.json();
  window.APP_DATA     = data;
  window.TRACKER_DATA = data.tracker || null;
  return data;
};
