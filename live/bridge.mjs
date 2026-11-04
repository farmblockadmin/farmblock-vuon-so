// Cầu dữ liệu chạy trên máy: phục vụ sa bàn và số liệu đã lọc từ Dashboard.
// Chỉ nghe ở 127.0.0.1, không giữ mật khẩu hay khóa nào.
// Chạy: node live/bridge.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, '.live', 'last.json');
const PORT = +process.env.PORT || 18940;
const DASH = 'https://dashboard.farmblock.vn';
const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.js': 'text/javascript' };

const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, num(o?.[k])]));
const level = l => (l && l.level ? { level: String(l.level), label: String(l.label || '') } : null);
const METRICS = ['moisture', 'temperature', 'ph', 'ec', 'nitrogen', 'phosphorus', 'potassium'];
const CENTER = ['air_temp', 'air_humidity', 'pressure', 'light', 'wind_speed', 'wind_direction', 'rainfall_total', 'water_ph', 'water_ec', 'water_temp', 'pump1_rate', 'pump2_rate'];

// Danh sách trắng: chỉ số đo được đi qua; tọa độ, mã vườn, tên người dùng, nhật ký bị bỏ lại.
function clean(raw) {
  const series = raw.soil?.series?.series || {};
  const nodes = (raw.map?.nodes || []).map(n => ({
    id: String(n.station),
    at: String(n.at || ''),
    zone: n.zone ? String(n.zone) : null,
    ...pick(n, METRICS),
    d24: pick(n.d24, METRICS),
    levels: Object.fromEntries(METRICS.map(m => [m, level(n.levels?.[m])])),
    hist: Object.fromEntries(['moisture', 'temperature', 'ph', 'ec'].map(m => [m, (series[m]?.[n.station] || []).map(num)])),
  }));
  const c = raw.map?.center || {};
  const k = raw.overview?.kpi || {};
  return {
    at: String(raw.overview?.status?.soil_at || ''),
    center: { at: String(c.at || ''), ...pick(c, CENTER), levels: Object.fromEntries(CENTER.map(m => [m, level(c.levels?.[m])])) },
    nodes,
    kpi: { moisture: num(k.moisture?.value), soil_temp: num(k.soil_temp?.value), ph: num(k.ph?.median), ec: num(k.ec?.value), rain_today: num(k.rain?.today), rain_7d: num(k.rain?.d7), irrigation_today: num(k.irrigation?.today), irrigation_7d: num(k.irrigation?.d7) },
    attention: (raw.overview?.attention || []).map(a => ({ kind: String(a.kind || ''), metric: String(a.metric_label || ''), level: String(a.level || ''), label: String(a.label || ''), stations: (a.stations || []).map(String) })),
    device_status: Object.fromEntries((raw.devices?.devices || []).map(d => [String(d.device_id), String(d.status || '')])),
    cadence: pick(raw.devices?.cadence, ['median_min', 'max_min', 'gaps_over_30']),
    sync: { last_run: String(raw.devices?.sync?.last_run || ''), status: String(raw.devices?.sync?.status || '') },
    total_rows: num(raw.devices?.total_rows),
    cameras: Array.isArray(raw.map?.cameras) ? raw.map.cameras.length : 0,
  };
}

let last = null;
try { last = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch {}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/ingest') {
    if (req.headers.origin !== DASH) { res.writeHead(403).end(); return; }
    const cors = { 'Access-Control-Allow-Origin': DASH, 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Private-Network': 'true' };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors).end(); return; }
    if (req.method !== 'POST') { res.writeHead(405, cors).end(); return; }
    let body = '';
    req.on('data', c => { body += c; if (body.length > 5e6) req.destroy(); });
    req.on('end', () => {
      try {
        last = { ...clean(JSON.parse(body)), received_at: new Date().toISOString() };
        fs.mkdirSync(path.dirname(CACHE), { recursive: true });
        fs.writeFileSync(CACHE, JSON.stringify(last));
        res.writeHead(204, cors).end();
      } catch (e) { res.writeHead(400, cors).end(String(e.message)); }
    });
    return;
  }
  if (url.pathname === '/live.json') {
    res.writeHead(last ? 200 : 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(last ? { ...last, age_s: Math.round((Date.now() - Date.parse(last.received_at)) / 1000) } : { error: 'chưa có dữ liệu' }));
    return;
  }
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = path.resolve(ROOT, rel);
  if (!TYPES[path.extname(file)] || path.dirname(file) !== ROOT || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)], 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`Sa bàn: http://127.0.0.1:${PORT}/`));
