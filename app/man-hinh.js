/* Vườn số Ia Ko · các màn ngoài sa bàn: Đất, Thời tiết & nước, Camera, Canh tác, Hồ sơ, Thiết bị.
   Bố cục và ngưỡng theo dashboard.farmblock.vn (kiểm kê 12/11/2026). */
(function () {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const VS = window.VS;
  const f = (v, d = 1) => v == null || !isFinite(v) ? '–' : (+v).toFixed(d).replace('.', ',');
  const fi = v => v == null || !isFinite(v) ? '–' : Math.round(v).toLocaleString('vi-VN');
  const hm = s => String(s || '').slice(11, 16);
  const dm = s => { const p = String(s || '').slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}` : '' };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dow = s => DOW[new Date(String(s).slice(0, 10) + 'T12:00:00+07:00').getDay()];
  const LVL = { red: 'Vượt ngưỡng', yellow: 'Theo dõi', device: 'Lỗi thiết bị', ok: 'Ổn' };
  const chip = (lv, txt) => `<span class="ch ${lv || ''}">${esc(txt || LVL[lv] || '')}</span>`;
  const NODE_COL = ['#2F6FB0', '#C2410C', '#7C3AED', '#0F766E', '#B45309', '#BE185D', '#4D7C0F', '#0369A1', '#6B7280'];
  const ptName = id => /^SOIL-(\d+)/.test(id) ? 'Điểm đo ' + (+id.slice(5)) : id;

  /* ---------- biểu đồ SVG ---------- */
  // lines: [{v:[], c:'#', dash, w}], bands: [{from,to,c}] theo giá trị
  function lineChart({ t, lines, bands = [], unit = '', h = 150, d = 1, yMin, yMax, avg, w = 600 }) {
    const W = w, H = h, pl = 40, pr = 8, pt = 8, pb = 22;
    const all = lines.flatMap(l => l.v).filter(v => v != null && isFinite(v));
    if (!all.length) return '<p class="mt">Chưa có số đo trong khoảng này.</p>';
    let lo = yMin ?? Math.min(...all), hi = yMax ?? Math.max(...all); if (hi - lo < 1e-6) { hi += 1; lo -= 1 }
    const pad = (hi - lo) * 0.08; if (yMin == null) lo -= pad; if (yMax == null) hi += pad;
    const n = Math.max(...lines.map(l => l.v.length)), X = i => pl + i / Math.max(1, n - 1) * (W - pl - pr), Y = v => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
    const ticks = 4, yl = [];
    for (let k = 0; k <= ticks; k++) { const v = lo + (hi - lo) * k / ticks; yl.push(`<line x1="${pl}" x2="${W - pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="gr"/><text x="${pl - 6}" y="${(Y(v) + 4).toFixed(1)}" class="ax" text-anchor="end">${f(v, d)}</text>`) }
    const xl = []; const labN = 4;
    for (let k = 0; k <= labN; k++) { const i = Math.round(k / labN * (n - 1)), s = t?.[i]; if (!s) continue; const span = t.length > 1 ? (Date.parse(t[t.length - 1].replace(' ', 'T')) - Date.parse(t[0].replace(' ', 'T'))) : 0; xl.push(`<text x="${X(i).toFixed(1)}" y="${H - 6}" class="ax" text-anchor="${k === 0 ? 'start' : k === labN ? 'end' : 'middle'}">${span <= 864e5 * 1.1 ? hm(s) : dm(s)}</text>`) }
    const bd = bands.map(b => { const a = Y(Math.min(hi, b.to ?? hi)), z = Y(Math.max(lo, b.from ?? lo)); return z > a ? `<rect x="${pl}" y="${a.toFixed(1)}" width="${W - pl - pr}" height="${(z - a).toFixed(1)}" fill="${b.c}"/>` : '' }).join('');
    const path = l => { let s = '', pen = false; l.v.forEach((v, i) => { if (v == null || !isFinite(v)) { pen = false; return } s += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); pen = true }); return `<path d="${s}" fill="none" stroke="${l.c}" stroke-width="${l.w || 1.6}" ${l.dash ? 'stroke-dasharray="4 3"' : ''} vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>` };
    return `<svg class="lc" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Biểu đồ ${esc(unit)}">${bd}${yl.join('')}${xl.join('')}${lines.map(path).join('')}${avg != null ? '' : ''}</svg>`;
  }
  function barChart({ labels, groups, h = 150, unit = '' }) { // groups: [{v:[], c, name}]
    const W = 600, H = h, pl = 36, pr = 6, pt = 8, pb = 22, n = labels.length, g = groups.length;
    const hi = Math.max(1, ...groups.flatMap(x => x.v)) * 1.12, bw = (W - pl - pr) / n, Y = v => pt + (1 - v / hi) * (H - pt - pb);
    let s = ''; for (let k = 0; k <= 3; k++) { const v = hi * k / 3; s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="gr"/><text x="${pl - 6}" y="${(Y(v) + 4).toFixed(1)}" class="ax" text-anchor="end">${fi(v)}</text>` }
    labels.forEach((l, i) => {
      const x0 = pl + i * bw + bw * 0.16, w = (bw * 0.68) / g;
      groups.forEach((gr, j) => { const v = gr.v[i] || 0, y = Y(v); s += `<rect x="${(x0 + j * w).toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1, w - 2).toFixed(1)}" height="${(H - pb - y).toFixed(1)}" rx="2" fill="${gr.c}"><title>${esc(gr.name)} ${esc(l)}: ${f(v, 1)} ${esc(gr.unit || unit)}</title></rect>` });
      if (n <= 14 || i % Math.ceil(n / 10) === 0) s += `<text x="${(pl + i * bw + bw / 2).toFixed(1)}" y="${H - 6}" class="ax" text-anchor="middle">${esc(l)}</text>`;
    });
    return `<svg class="lc" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Biểu đồ cột">${s}</svg>`;
  }
  const legend = items => `<div class="lgd">${items.map(i => `<span><i style="background:${i.c}${i.dash ? ';height:0;border-top:2px dashed ' + i.c : ''}"></i>${esc(i.name)}</span>`).join('')}</div>`;

  /* ---------- khung chung ---------- */
  const SCREENS = [
    { id: 'saban', name: 'Sa bàn', short: 'Sa bàn', icon: 'u-map' },
    { id: 'dat', name: 'Đất & vùng rễ', short: 'Đất', icon: 'a-probe' },
    { id: 'thoitiet', name: 'Thời tiết & nước', short: 'Thời tiết', icon: 'a-drop' },
    { id: 'camera', name: 'Camera', short: 'Camera', icon: 'i-cam' },
    { id: 'canhtac', name: 'Canh tác', short: 'Canh tác', icon: 'u-list' },
    { id: 'hoso', name: 'Hồ sơ vườn', short: 'Hồ sơ', icon: 'u-doc' },
    { id: 'thietbi', name: 'Thiết bị & dữ liệu', short: 'Thiết bị', icon: 'i-iot', staff: true }
  ];
  const ST = { scr: 'saban', range: '7d', metric: 'moisture', crange: '7d', sel: null };
  function srcNote() {
    if (VS.mode === 'api') return '';
    return `<div class="src"><b>${VS.mode === 'bridge' ? 'Số thật qua cầu trên máy' : 'Dữ liệu mẫu'}</b><span>${VS.mode === 'bridge' ? 'Chỉ số đo cảm biến. Nhật ký, kho, hồ sơ cần mở Vườn số trên dashboard.farmblock.vn.' : 'Số đo giả lập theo quy luật thời tiết Ia Ko tháng 11 để xem thử giao diện. Khi mở trên dashboard.farmblock.vn, màn này đọc số thật.'}</span></div>`;
  }
  const locked = (title, what) => `<div class="lock"><svg aria-hidden="true"><use href="#u-lock"/></svg><div><b>${esc(title)}</b><p>${esc(what)}</p><a class="btn" href="https://dashboard.farmblock.vn/" target="_blank" rel="noopener">Mở dashboard để đăng nhập</a></div></div>`;
  const card = (title, body, opts = {}) => `<section class="cd ${opts.cls || ''}"${opts.style ? ` style="${opts.style}"` : ''}>${title ? `<header><h3>${title}</h3>${opts.side || ''}</header>` : ''}${body}</section>`;
  const seg = (name, items, cur) => `<div class="sg" role="group" data-seg="${name}">${items.map(([v, l]) => `<button data-v="${v}" aria-pressed="${v === cur}">${l}</button>`).join('')}</div>`;
  const kv = rows => `<dl class="kvs">${rows.map(r => `<div class="${r[2] || ''}"><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>`;

  function head(title, sub, side = '') { return `<div class="sh"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${side}</div>` }
  const at = s => s ? `<span class="sat"><i></i>Số đo lúc ${hm(s)} ${dm(s)}</span>` : '';

  /* ---------- ĐẤT & VÙNG RỄ ---------- */
  const SM = { moisture: ['Độ ẩm', '%', 1], temperature: ['Nhiệt độ', '°C', 1], ph: ['pH', '', 2], ec: ['EC', 'µS/cm', 0], nitrogen: ['N', 'mg/kg', 0], phosphorus: ['P', 'mg/kg', 0], potassium: ['K', 'mg/kg', 0] };
  function soilBands(m) {
    if (m === 'temperature') return [{ from: 34, to: 38, c: 'var(--y-bg)' }, { from: 38, c: 'var(--r-bg)' }, { to: 18, c: 'var(--y-bg)' }];
    if (m === 'ph') return [{ to: 5, c: 'var(--r-bg)' }, { from: 5, to: 5.5, c: 'var(--y-bg)' }, { from: 6.5, to: 7, c: 'var(--y-bg)' }, { from: 7, c: 'var(--r-bg)' }];
    if (m === 'moisture') return [{ from: 25, to: 40, c: 'var(--ok-bg)' }];
    return [];
  }
  async function scrDat(el) {
    const d = await VS.get('soil', { range: ST.range }), m = ST.metric, [mn, mu, md] = SM[m];
    const ser = d.series?.series?.[m] || {}, ids = d.nodes.map(n => n.station);
    const avgSer = (d.series?.t || []).map((_, i) => { const v = ids.map(id => ser[id]?.[i]).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null });
    const grid = d.nodes.map((n, i) => {
      const v = (ser[n.station] || []).filter(x => x != null), lo = Math.min(...v), hi = Math.max(...v), lvx = n.levels?.[m];
      return `<button class="mini ${lvx ? lvx.level : ''}" data-node="${esc(n.station)}" aria-pressed="${ST.sel === n.station}"><header><b>${ptName(n.station)}</b><span>Khu ${esc(n.zone || '–')}</span><strong>${f(n[m], md)}<small>${mu}</small></strong></header>
        ${lineChart({ t: d.series.t, lines: [{ v: avgSer, c: 'var(--mut)', dash: 1, w: 1.2 }, { v: ser[n.station] || [], c: NODE_COL[i % 9] }], bands: soilBands(m), h: 120, d: md, w: 420 })}
        <footer>${ST.range === '24h' ? '24 giờ' : ST.range === '30d' ? '30 ngày' : '7 ngày'}: ${f(lo, md)}–${f(hi, md)}${mu ? ' ' + mu : ''}</footer></button>`;
    }).join('');
    const cell = (n, k) => { const l = n.levels?.[k], [, , dd] = SM[k]; return `<td class="${l ? l.level : ''}">${f(n[k], dd)}</td>` };
    const sg = v => v == null ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '±') + f(Math.abs(v), 1);
    const rows = d.nodes.map(n => `<tr data-node="${esc(n.station)}" class="${ST.sel === n.station ? 'on' : ''}"><th>${ptName(n.station)} <small>Khu ${esc(n.zone || '–')}</small></th>${cell(n, 'moisture')}<td class="dl">${sg(n.d24?.moisture)}</td>${cell(n, 'temperature')}${cell(n, 'ph')}${cell(n, 'ec')}${cell(n, 'nitrogen')}${cell(n, 'phosphorus')}${cell(n, 'potassium')}</tr>`).join('');
    const a = d.avg || {};
    const sel = d.nodes.find(n => n.station === ST.sel);
    const det = sel ? card(ptName(sel.station) + ' · Khu ' + esc(sel.zone || '–'), `${kv(Object.keys(SM).map(k => [SM[k][0] + (k.length === 1 ? '' : ''), f(sel[k], SM[k][2]) + (SM[k][1] ? ' ' + SM[k][1] : ''), sel.levels?.[k]?.level || '']))}
      <div class="sc">${scatter(ser, d.series?.series, sel.station)}</div><p class="mt">pH theo độ ẩm trong khoảng đang xem. Điểm gom lại một chỗ là cảm biến ổn định.</p>
      ${VS.canWrite() ? `<label class="fld"><span>Ghi chú hiện trường</span><textarea id="nNote" rows="3" placeholder="Ví dụ: đất quanh điểm đo vừa xới, số ẩm có thể lệch"></textarea></label><label class="cb"><input type="checkbox" id="nFlag"> Gắn cờ cần kiểm tra</label><button class="btn pr" id="nSave">Lưu ghi chú</button>` : `<p class="mt">Ghi chú hiện trường và gắn cờ dành cho Chuyên gia khi đăng nhập dashboard.</p>`}`, { cls: 'det', side: `<button class="icb" data-close aria-label="Đóng"><svg><use href="#u-x"/></svg></button>` }) : '';
    el.innerHTML = head('Đất & vùng rễ', '9 điểm đo đất theo thiết kế, sâu 30 cm. Số đo 10 phút một lần.', at(d.nodes[0]?.at)) + srcNote() +
      `<div class="fbar">${seg('range', [['24h', '24 giờ'], ['7d', '7 ngày'], ['30d', '30 ngày']], ST.range)}${seg('metric', Object.keys(SM).map(k => [k, SM[k][0]]), m)}</div>` +
      `<div class="cols ${sel ? 'withdet' : ''}"><div>` +
      card(`${mn}${mu ? ' (' + mu + ')' : ''} theo điểm đo`, `<div class="minis">${grid}</div>${legend([{ c: 'var(--mut)', name: 'Trung bình các điểm', dash: 1 }])}${m === 'moisture' ? '<p class="mt">Dải xanh: vùng ẩm phù hợp 25–40% cho cây con.</p>' : ''}${'npk'.includes(m[0]) && m !== 'ph' && ['nitrogen', 'phosphorus', 'potassium'].includes(m) ? '<p class="mt">N, P, K do cảm biến ước tính từ EC, chỉ để so sánh giữa các điểm, không thay xét nghiệm mẫu.</p>' : ''}`) +
      card('Số đo mới nhất', `<div class="tw"><table class="tb"><thead><tr><th>Điểm đo</th><th>Ẩm %</th><th>24 giờ</th><th>°C</th><th>pH</th><th>EC µS/cm</th><th>N</th><th>P</th><th>K</th></tr></thead><tbody>${rows}</tbody>
        <tfoot><tr><th>Trung bình vườn</th><td>${f(a.moisture, 1)}</td><td></td><td>${f(a.temperature, 1)}</td><td>${f(a.ph, 2)}</td><td>${fi(a.ec)}</td><td>${fi(a.nitrogen)}</td><td>${fi(a.phosphorus)}</td><td>${fi(a.potassium)}</td></tr></tfoot></table></div>
        <p class="mt">Bấm một dòng để xem chi tiết điểm đo. Ô vàng là cần theo dõi, ô đỏ là vượt ngưỡng.</p>`) +
      card('Ngưỡng đang dùng', `<div class="thr"><div><b>Nhiệt độ đất</b><span>${chip('', '18–34°C phù hợp')} ${chip('yellow', '> 34 nóng · < 18 lạnh')} ${chip('red', '> 38 rất nóng')}</span></div><div><b>pH đất</b><span>${chip('', '5,5–6,5 tối ưu')} ${chip('yellow', '5–5,5 hoặc 6,5–7 theo dõi')} ${chip('red', '< 5 hoặc > 7 cần kiểm tra')}</span></div><div><b>Độ ẩm, EC, N, P, K</b><span class="mt">Chưa chốt ngưỡng, đội kỹ thuật đang hiệu chỉnh theo mùa.</span></div></div>`) +
      `</div>${det}</div>`;
    el.querySelectorAll('[data-seg]').forEach(s => s.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (s.dataset.seg === 'range') ST.range = b.dataset.v; else ST.metric = b.dataset.v; render() }));
    el.querySelectorAll('[data-node]').forEach(r => r.addEventListener('click', () => { ST.sel = ST.sel === r.dataset.node ? null : r.dataset.node; render() }));
    el.querySelector('[data-close]')?.addEventListener('click', () => { ST.sel = null; render() });
    el.querySelector('#nSave')?.addEventListener('click', async () => {
      const b = el.querySelector('#nSave'); b.disabled = true; b.textContent = 'Đang lưu…';
      try { const r = await fetch(`/api/notes?farm=${VS.farm}`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ station: ST.sel, text: el.querySelector('#nNote').value, flag: el.querySelector('#nFlag').checked }) }); b.textContent = r.ok ? 'Đã lưu' : 'Chưa lưu được (' + r.status + ')' } catch (e) { b.textContent = 'Chưa lưu được' }
      setTimeout(() => { b.disabled = false; b.textContent = 'Lưu ghi chú' }, 2400);
    });
  }
  function scatter(_, all, id) {
    const x = all?.moisture?.[id] || [], y = all?.ph?.[id] || [], pts = x.map((v, i) => [v, y[i]]).filter(p => p[0] != null && p[1] != null);
    if (pts.length < 3) return '';
    const W = 300, H = 150, pl = 34, pb = 20, xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); if (x1 - x0 < .5) { x0 -= .5; x1 += .5 } if (y1 - y0 < .1) { y0 -= .1; y1 += .1 }
    const X = v => pl + (v - x0) / (x1 - x0) * (W - pl - 8), Y = v => 6 + (1 - (v - y0) / (y1 - y0)) * (H - 6 - pb);
    return `<svg class="lc" viewBox="0 0 ${W} ${H}" role="img" aria-label="pH theo độ ẩm"><line x1="${pl}" x2="${W - 8}" y1="${H - pb}" y2="${H - pb}" class="gr"/><text x="${pl - 4}" y="${Y(y1) + 4}" class="ax" text-anchor="end">${f(y1, 2)}</text><text x="${pl - 4}" y="${Y(y0)}" class="ax" text-anchor="end">${f(y0, 2)}</text><text x="${pl}" y="${H - 5}" class="ax">${f(x0, 0)}%</text><text x="${W - 8}" y="${H - 5}" class="ax" text-anchor="end">${f(x1, 0)}% ẩm</text>${pts.map(p => `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="2.4" fill="var(--pu)" fill-opacity=".55"/>`).join('')}</svg>`;
  }

  /* ---------- THỜI TIẾT & NƯỚC ---------- */
  const DIRS = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
  const dirName = v => v == null ? '–' : DIRS[Math.round(((v % 360) + 360) % 360 / 45) % 8];
  const SKY = { sun: ['Nắng', 'w-sun'], cloud: ['Nhiều mây', 'w-cloud'], rain: ['Mưa', 'w-rain'] };
  async function scrThoiTiet(el) {
    const [d, os] = await Promise.all([VS.get('climate', { range: ST.crange }), VS.get('onescreen').catch(() => ({}))]);
    const n = d.now || {}, L = n.levels || {}, s = d.series || {}, fc = os.forecast;
    const tile = (l, v, u, lv, sub) => `<div class="kt ${lv?.level || ''}"><span>${l}</span><b>${v}<small>${u}</small></b>${sub ? `<em>${sub}</em>` : lv ? `<em>${esc(lv.label)}</em>` : ''}</div>`;
    const pumpTxt = p => p.stale ? 'Mất tín hiệu' : p.running ? 'Đang chạy' : 'Tắt';
    const today = d.daily?.[d.daily.length - 1] || {};
    const chartBox = (title, v, unit, bands, dd, note) => `<div class="cb2"><h4>${title}</h4>${lineChart({ t: s.t, lines: [{ v, c: 'var(--br)' }], bands, unit, h: 130, d: dd })}${note ? `<p class="mt">${note}</p>` : ''}</div>`;
    const days = d.daily || [];
    el.innerHTML = head('Thời tiết & nước', 'Số đo của trạm trung tâm cạnh Nhà điều hành: thời tiết, nước tưới và hai bơm.', at(n.at)) + srcNote() +
      `<div class="cols3">` +
      card('Thời tiết hiện tại', `<div class="kts">${tile('Không khí', f(n.air_temp), '°C', L.air_temp)}${tile('Độ ẩm', f(n.air_humidity, 0), '%', L.air_humidity)}${tile('Gió', f(n.wind_speed), ' m/s', L.wind_speed, 'từ hướng ' + dirName(n.wind_direction))}${tile('Mưa hôm nay', f(n.rain_today ?? today.rain_mm), ' mm')}${tile('Ánh sáng', n.light >= 1000 ? f(n.light / 1000, 0) + 'k' : fi(n.light), ' lux')}${tile('Áp suất', f(n.pressure, 0), ' hPa')}</div>`) +
      card('Nước tưới', `<div class="kts">${tile('pH nước', f(n.water_ph, 2), '', L.water_ph)}${tile('EC nước', fi(n.water_ec), ' µS/cm', L.water_ec)}${tile('Nhiệt độ nước', f(n.water_temp), '°C', L.water_temp)}${(d.pumps || []).map(p => tile(p.name, pumpTxt(p), '', p.stale ? { level: 'device', label: 'Mất tín hiệu' } : null, p.running ? f(p.rate) + ' m³/h' : '')).join('')}${tile('Tưới hôm nay', fi(today.m3), ' m³')}</div><p class="mt">Cảm biến nước chỉ phản ánh một phần chất lượng nước tưới.</p>`) +
      (fc ? card('Dự báo', `<div class="fc24">${fc.hours.map(h => `<div><span>${hm(h.t)}</span><i style="--h:${Math.min(1, h.rain / 4)}"></i><b>${f(h.rain)}</b><small>${f(h.wind)} m/s</small></div>`).join('')}</div><p class="mt">24 giờ tới, mưa (mm) và gió theo khung 3 giờ.</p>
        <div class="fc3">${fc.days.map(x => `<div><span>${dow(x.date)} ${dm(x.date)}</span><svg aria-hidden="true"><use href="#${SKY[x.sky]?.[1] || 'w-sun'}"/></svg><b>${x.tmin}–${x.tmax}°C</b><small>${f(x.rain)} mm · ${f(x.wind)} m/s</small></div>`).join('')}</div>
        <div class="spray ${fc.spray ? '' : 'no'}"><svg aria-hidden="true"><use href="#a-drop"/></svg><div><b>${fc.spray ? `Phun được: ${dow(fc.spray.date)} ${dm(fc.spray.date)}, ${fc.spray.from}–${fc.spray.to}` : 'Chưa có khung giờ phun trong 2 ngày tới'}</b><span>Điều kiện: gió dưới ${fc.wind_limit || 4} m/s, không mưa ${fc.dry_hours || 4} giờ sau khi phun.</span></div></div>`, { side: `<span class="mt">Nguồn ${fc.source === 'mẫu' ? 'mẫu' : 'MET Norway'}</span>` }) : '') +
      `</div><div class="fbar">${seg('crange', [['24h', '24 giờ'], ['7d', '7 ngày'], ['30d', '30 ngày']], ST.crange)}</div>` +
      card('Khí tượng', `<div class="g2">${chartBox('Nhiệt độ không khí (°C)', s.air_temp, '°C', [{ from: 35, to: 40, c: 'var(--y-bg)' }, { from: 40, c: 'var(--r-bg)' }], 1)}${chartBox('Độ ẩm không khí (%)', s.air_humidity, '%', [{ from: 90, c: 'var(--y-bg)' }, { to: 45, c: 'var(--y-bg)' }], 0, `Trên 85%: ${d.share?.rh_red ?? '–'}% thời gian. Ẩm cao kéo dài dễ phát sinh nấm.`)}${chartBox('Tốc độ gió (m/s)', s.wind_speed, 'm/s', [{ from: 5, to: 8, c: 'var(--y-bg)' }, { from: 8, c: 'var(--r-bg)' }], 1, `Trên 5 m/s: ${d.share?.wind_gt5 ?? '–'} lần đo.`)}${chartBox('Ánh sáng (lux)', s.light, 'lux', [], 0)}</div>`) +
      `<div class="g2">` +
      card('Mưa và nước tưới', `${barChart({ labels: days.map(x => dm(x.date)), groups: [{ name: 'Mưa', v: days.map(x => x.rain_mm), c: 'var(--rain)', unit: 'mm' }, { name: 'Tưới quy đổi', v: days.map(x => x.m3 / 220), c: 'var(--br)', unit: 'mm' }], unit: 'mm', h: 150 })}${legend([{ c: 'var(--rain)', name: 'Mưa (mm)' }, { c: 'var(--br)', name: 'Tưới quy đổi (mm)' }])}<p class="mt">Quy đổi: 1 mm trên 22 ha bằng 220 m³ nước.</p>`) +
      card('Chất lượng nước tưới', `<div class="g2 inn">${chartBox('pH nước', s.water_ph, '', [{ from: 7.5, to: 8.5, c: 'var(--y-bg)' }, { from: 8.5, c: 'var(--r-bg)' }], 2)}${chartBox('EC nước (µS/cm)', s.water_ec, 'µS/cm', [{ from: 700, to: 1500, c: 'var(--y-bg)' }, { from: 1500, c: 'var(--r-bg)' }], 0)}</div>`) +
      `</div>` +
      `<div class="g2">` +
      card('Bơm', `<div class="tw"><table class="tb"><thead><tr><th>Bơm</th><th>Trạng thái</th><th>Hôm nay</th><th>Cộng dồn</th><th>Cập nhật</th></tr></thead><tbody>${(d.pumps || []).map(p => `<tr><th>${esc(p.name)}</th><td>${chip(p.stale ? 'device' : p.running ? 'ok' : '', pumpTxt(p))}</td><td>${fi(p.today_m3)} m³</td><td>${fi(p.total)} m³</td><td>${hm(p.last_update)}</td></tr>`).join('')}</tbody></table></div>`) +
      card('Theo ngày', `<div class="tw"><table class="tb"><thead><tr><th>Ngày</th><th>Mưa mm</th><th>Tưới m³</th><th>Nhiệt độ °C</th><th>Độ ẩm %</th><th>Gió mạnh nhất</th></tr></thead><tbody>${days.slice(-7).reverse().map(x => `<tr><th>${dow(x.date)} ${dm(x.date)}</th><td>${f(x.rain_mm)}</td><td>${fi(x.m3)}</td><td>${Array.isArray(x.t) ? f(x.t[0]) + '–' + f(x.t[1]) : f(x.t)}</td><td>${fi(x.h)}</td><td class="${x.w_max > 8 ? 'red' : x.w_max > 5 ? 'yellow' : ''}">${f(x.w_max)} m/s</td></tr>`).join('')}</tbody></table></div>`) +
      `</div>`;
    el.querySelector('[data-seg="crange"]').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { ST.crange = b.dataset.v; render() } });
  }

  /* ---------- CAMERA ---------- */
  async function scrCamera(el) {
    const G = window.__vsGeo; let cams = [];
    if (VS.mode === 'api') { try { const r = await VS.get('cameras'); cams = (r.live || []).map(c => ({ name: c.name, area: c.area_name, online: c.is_online, active: c.is_active, plan: c.plan_id })) } catch (e) { } }
    const pos = G.cams.map((c, i) => ({ ...c, n: i + 1, st: VS.mode === 'api' ? (cams[i] ? (cams[i].online ? 'on' : 'off') : 'plan') : (c.live ? (i === 16 ? 'off' : 'on') : 'plan') }));
    const inst = pos.filter(p => p.st !== 'plan'), ready = pos.filter(p => p.st === 'on');
    const map = camMap(G, pos);
    const byZone = {}; pos.filter(p => p.st === 'plan').forEach(p => { byZone[p.zone || 'ven ranh'] = (byZone[p.zone || 'ven ranh'] || 0) + 1 });
    el.innerHTML = head('Camera', `22 vị trí camera theo thiết kế, đang lắp dần. Hiện có ${inst.length} camera, ${ready.length} sẵn sàng xem.`) + srcNote() +
      `<div class="g2 cam">` + card('Bản đồ camera', `${map}${legend([{ c: 'var(--ok)', name: 'Sẵn sàng' }, { c: 'var(--warn2)', name: 'Mất kết nối' }, { c: 'var(--mut)', name: 'Chưa lắp' }])}<p class="mt">Hình quạt là hướng nhìn. Bấm camera để chọn.</p>`) +
      `<div>` + card('Xem camera', `<div class="cv" id="cv"><div class="cvi"><svg aria-hidden="true"><use href="#i-cam"/></svg><b>Chọn một camera trên bản đồ</b><span>Xem trực tiếp tự tắt sau 1 phút để tiết kiệm pin và 4G. Camera 4G có thể mất 5–15 giây để mở.</span></div></div>`) +
      card('Danh sách', `<div class="chips">${pos.map(p => `<button class="cc ${p.st}" data-cam="${p.n - 1}">${esc(p.label)}<small>${p.st === 'on' ? 'Sẵn sàng' : p.st === 'off' ? 'Mất kết nối' : 'Chưa lắp'}</small></button>`).join('')}</div><p class="mt">Vị trí chưa lắp: ${Object.entries(byZone).map(([z, k]) => `${z === 'ven ranh' ? 'ven ranh vườn' : 'khu ' + esc(z)} (${k})`).join(', ') || 'không còn'}.</p>`) + `</div></div>`;
    const pick = i => {
      const p = pos[i]; $$('.cc,.camp').forEach(b => b.classList.toggle('on2', +b.dataset.cam === i));
      const cv = el.querySelector('#cv');
      if (p.st === 'plan') { cv.innerHTML = `<div class="cvi"><svg aria-hidden="true"><use href="#i-cam"/></svg><b>${esc(p.label)} · khu ${esc(p.zone || '–')}</b><span>Vị trí này chưa lắp camera.</span></div>`; return }
      if (p.st === 'off') { cv.innerHTML = `<div class="cvi"><svg aria-hidden="true"><use href="#i-cam"/></svg><b>${esc(p.label)} · khu ${esc(p.zone || '–')}</b><span>Camera đang mất kết nối. Đội vận hành đã được báo trên dashboard.</span></div>`; return }
      cv.innerHTML = `<div class="cvi"><svg aria-hidden="true"><use href="#i-cam"/></svg><b>${esc(p.label)} · khu ${esc(p.zone || '–')}</b><span>${VS.mode === 'api' ? 'Hình trực tiếp mở bằng trình xem camera của dashboard.' : 'Xem hình trực tiếp cần đăng nhập dashboard.'}</span><div class="crow"><a class="btn pr" href="https://dashboard.farmblock.vn/#/camera" target="_blank" rel="noopener">Xem trực tiếp</a><button class="btn" data-go3d="${i}">Xem trên sa bàn</button></div></div>`;
      cv.querySelector('[data-go3d]').addEventListener('click', () => { go('saban'); window.__vsOpenDev && window.__vsOpenDev('cam', i) });
    };
    el.querySelectorAll('[data-cam]').forEach(b => b.addEventListener('click', () => pick(+b.dataset.cam)));
  }
  function camMap(G, pos) {
    const all = G.zones.flatMap(z => z.poly), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    const x0 = Math.min(...xs) - 20, y0 = Math.min(...ys) - 20, w = Math.max(...xs) - x0 + 20, h = Math.max(...ys) - y0 + 20;
    const zs = G.zones.map(z => `<polygon points="${z.poly.map(p => p.join(',')).join(' ')}" class="zp ${z.id === 'BARE' ? 'bare' : z.id === 'HQ' ? 'hq' : ''}"/>${z.id.length <= 2 && z.id !== 'HQ' ? `<text x="${z.lab[0]}" y="${z.lab[1]}" class="zl" text-anchor="middle">${z.id}</text>` : ''}`).join('');
    const cs = pos.map((p, i) => { const a = (p.heading ?? (i * 47 % 360)) * Math.PI / 180, r = 46, s = 0.5; const c = p.st === 'on' ? 'var(--ok)' : p.st === 'off' ? 'var(--warn2)' : 'var(--mut)';
      const fan = p.st !== 'plan' ? `<path d="M${p.uv[0]} ${p.uv[1]} L${(p.uv[0] + r * Math.sin(a - s)).toFixed(1)} ${(p.uv[1] - r * Math.cos(a - s)).toFixed(1)} A${r} ${r} 0 0 1 ${(p.uv[0] + r * Math.sin(a + s)).toFixed(1)} ${(p.uv[1] - r * Math.cos(a + s)).toFixed(1)} Z" fill="${c}" fill-opacity=".18"/>` : '';
      return `${fan}<g class="camp" data-cam="${i}" role="button" tabindex="0" aria-label="${esc(p.label)}"><circle cx="${p.uv[0]}" cy="${p.uv[1]}" r="12" fill="${c}" stroke="var(--cd)" stroke-width="2.5"/><text x="${p.uv[0]}" y="${p.uv[1] + 4}" text-anchor="middle" class="cn">${p.n}</text></g>` }).join('');
    return `<svg class="cmap" viewBox="${x0} ${y0} ${w} ${h}" role="img" aria-label="Sơ đồ 22 vị trí camera">${zs}${cs}</svg>`;
  }

  /* ---------- CANH TÁC ---------- */
  async function scrCanhTac(el) {
    if (VS.mode !== 'api') {
      el.innerHTML = head('Canh tác', 'Việc hôm nay, nhật ký tại vườn, phân thuốc, kho vật tư.') + srcNote() +
        `<div class="g2">` + card('Việc hôm nay', locked('Khuyến nghị việc trong ngày', 'Lõi AI đối chiếu ngưỡng theo mùa, nhật ký và thời tiết để gợi ý việc cho từng khu. Chuyên gia xác minh trước khi giao.')) +
        card('Nhật ký canh tác', locked('Nhật ký tại vườn 30 ngày', 'Việc đội vườn ghi bằng giọng nói kèm ảnh, video; số công; dòng "Cần xem" do AI rà soát. Nhật ký chỉ hiện sau khi đội vận hành rà soát.')) + `</div><div class="g2">` +
        card('Thuốc bảo vệ thực vật', locked('Đối chiếu danh mục', 'Thuốc của vườn so với Danh mục được phép, danh sách cấm tại Việt Nam và giới hạn dư lượng EU. Hoạt chất cấm không chốt được nhật ký.')) +
        card('Kho vật tư', locked('Kho và phiếu nhập', 'Mặt hàng còn, hết, sắp hết hạn; phiếu nhập kèm ảnh hoá đơn; nguyên tắc mua đến đâu dùng đến đó.')) + `</div>` +
        await weekGrid(true);
      return;
    }
    const [ov, ops, logs, stock] = await Promise.all([VS.get('overview'), VS.get('operations').catch(() => null), VS.get('care-logs', { recent: 7 }).catch(() => null), VS.get('stock').catch(() => null)]);
    const adv = ov.advisory?.latest?.result, next = adv?.ops?.next || [];
    const todo = next.length ? `<ol class="todo">${next.map(x => `<li><span>${esc(x.text)}</span>${(x.zones || []).map(z => chip('', z)).join('')}${chip(x.when === 'today' ? 'yellow' : '', x.when === 'today' ? 'Hôm nay' : 'Trong tuần')}</li>`).join('')}</ol><p class="mt">Gợi ý của AI${adv.confidence ? ', tin cậy ' + esc(adv.confidence) : ''}. Chuyên gia xác minh trước khi giao việc.</p>` : '<p class="mt">Chưa có khuyến nghị hôm nay.</p>';
    const items = logs?.items || [];
    const byDay = {}; items.forEach(it => { const d = String(it.at_local || it.at || '').slice(0, 10); (byDay[d] = byDay[d] || []).push(it) });
    const logHtml = Object.keys(byDay).sort().reverse().map(d => `<div class="lday"><h4>${dow(d)} ${dm(d)} <small>${byDay[d].length} việc · ${f(byDay[d].reduce((a, x) => a + (+x.work_days || 0), 0), 1)} công</small></h4>${byDay[d].map(it => `<article><div>${(it.parts || []).map(p => chip('', p.task || p.label)).join('') || chip('', it.tasks || 'Việc')}</div><p>${esc(it.public_text || it.description || '')}</p><footer>${hm(it.at_local || it.at)} · ${f(it.work_days, 1)} công${it.media?.length ? ` · ${it.media.length} ảnh/video` : ''}</footer>${it.media?.length ? `<div class="th">${it.media.slice(0, 4).map(m => `<img loading="lazy" alt="" src="/api/media/thumb?w=160&u=${encodeURIComponent(m.url)}">`).join('')}</div>` : ''}</article>`).join('')}</div>`).join('') || '<p class="mt">Chưa có nhật ký trong 7 ngày.</p>';
    const cats = ops?.categories || [], mon = ops?.monthly || [];
    const rows = stock?.rows || [];
    el.innerHTML = head('Canh tác', `${fi(ops?.total_ops)} công việc · ${f(ops?.total_work_days, 0)} công từ ${dm(ops?.first_at)}`) +
      `<div class="g2">` + card('Việc hôm nay', todo) + card('Công lao động theo tháng', mon.length ? barChart({ labels: mon.map(m => String(m.month).slice(5) + '/' + String(m.month).slice(2, 4)), groups: [{ name: 'Công', v: mon.map(m => m.work_days), c: 'var(--br)', unit: 'công' }], h: 140 }) + `<div class="cats">${cats.map(c => `<span>${esc(c.name)} <b>${fi(c.count)}</b></span>`).join('')}</div>` : '<p class="mt">Chưa có.</p>') + `</div>` +
      await weekGrid(false) +
      `<div class="g2">` + card('Nhật ký 7 ngày', `<div class="logs">${logHtml}</div>`, { side: `<a class="lnk" href="https://dashboard.farmblock.vn/#/operations" target="_blank" rel="noopener">Bổ sung phân, thuốc</a>` }) +
      card('Kho vật tư', rows.length ? `<div class="tw"><table class="tb"><thead><tr><th>Mặt hàng</th><th>Trạng thái</th><th>Còn</th><th>Hạn gần nhất</th></tr></thead><tbody>${rows.map(r => `<tr><th>${esc(r.name)}</th><td>${chip(r.state === 'out' ? 'red' : r.expired ? 'red' : r.soon ? 'yellow' : 'ok', r.state === 'out' ? 'Hết' : 'Còn')}</td><td>${(r.qty || []).map(q => fi(q.qty) + ' ' + esc(q.unit)).join(', ')}</td><td>${dm(r.expiry)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="mt">Kho trống.</p>') + `</div>`;
  }
  async function weekGrid(demo) { // lưới 7 ngày: mưa, ẩm đất, việc
    const c = await VS.get('climate', { range: '7d' }), s = await VS.get('soil', { range: '7d' });
    const days = (c.daily || []).slice(-7), t = s.series?.t || [], ser = s.series?.series?.moisture || {};
    const mByDay = days.map(d => { const v = []; t.forEach((x, i) => { if (x.slice(0, 10) === d.date) Object.values(ser).forEach(a => a[i] != null && v.push(a[i])) }); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null });
    return card('Mưa, độ ẩm đất và công việc · 7 ngày', `<div class="wk">${days.map((d, i) => `<div><span>${dow(d.date)}<small>${dm(d.date)}</small></span><b class="rn" style="--h:${Math.min(1, d.rain_mm / 15)}">${f(d.rain_mm)}<small>mm</small></b><b class="ms" style="--m:${mByDay[i] == null ? 0 : Math.min(1, Math.max(0, (mByDay[i] - 15) / 30))}">${f(mByDay[i])}<small>%</small></b><em>${demo ? '–' : ''}</em></div>`).join('')}</div><p class="mt">Hàng 1: mưa mỗi ngày. Hàng 2: độ ẩm đất trung bình. ${demo ? 'Hàng việc cần đăng nhập.' : ''}</p>`);
  }

  /* ---------- HỒ SƠ VƯỜN ---------- */
  async function scrHoSo(el) {
    const ov = await VS.get('overview'), farm = ov.farm || {}, st = farm.stage || {}, G = window.__vsGeo;
    const steps = (st.steps || []).map(s => `<li class="${s.state}"><i></i><span>${esc(s.label)}</span></li>`).join('');
    const zones = G.zones.filter(z => z.id.length <= 2).map(z => `<tr><th>Khu ${z.id}</th><td>${f(z.ha, 2)} ha</td><td>Cà phê Robusta ghép</td></tr>`).join('');
    const prof = VS.mode === 'api' ? await VS.get('profile').catch(() => null) : null;
    const dossier = VS.mode === 'api' ? await VS.get('dossier').catch(() => null) : null;
    el.innerHTML = head('Hồ sơ vườn', 'Thông tin trang trại, giai đoạn cây, phân khu và hồ sơ tiêu chuẩn.') + srcNote() +
      `<div class="g2">` + card('Vườn Ia Ko', kv([['Diện tích', '22 ha'], ['Địa bàn', 'Thôn Cây Xoài, xã Ia Ko, Chư Pưh, Gia Lai'], ['Loại đất', esc(farm.soil || 'Đất đỏ bazan')], ['Phân khu', '8 khu trồng'], ['Cây trồng', 'Cà phê Robusta ghép Thiện Trường, khoảng 2.200 cây/ha'], ['Trồng', 'Tháng 7/2026'], ['Giai đoạn', esc(st.label || '')], ['Thu bói dự kiến', st.first_harvest ? esc(st.first_harvest) : 'Theo hồ sơ kỹ thuật']])) +
      card('Giai đoạn cây', `<ol class="stp">${steps}</ol><div class="pg"><i style="width:${Math.round((st.progress || 0) * 100)}%"></i></div><p class="mt">${esc(st.label || '')}${st.months_to_harvest ? ` · còn ${st.months_to_harvest} tháng đến thu bói` : ''}. KTCB là thời kỳ kiến thiết cơ bản, cây chưa cho quả.</p>`) + `</div>` +
      `<div class="g2">` + card('Phân khu canh tác', `<div class="tw"><table class="tb"><thead><tr><th>Khu</th><th>Diện tích</th><th>Cây trồng</th></tr></thead><tbody>${zones}</tbody></table></div><p class="mt">Diện tích ước theo sơ đồ vùng canh tác, quy về tổng 22 ha.</p>`) +
      card('Thiết bị và hạ tầng', kv([['Điểm đo đất', '9 điểm theo thiết kế'], ['Trạm thời tiết và nước', '1 trạm trung tâm, 2 điểm đo nước'], ['Camera', '22 vị trí, đang lắp dần'], ['Truyền dữ liệu', 'LoRa về trạm IoT, 10 phút một lần'], ['Nước', 'Hồ chứa và hệ tưới gốc'], ['Năng lượng', 'Mái pin mặt trời ở Nhà điều hành'], ['Công trình', 'Nhà điều hành cạnh hồ']])) + `</div>` +
      card('Hồ sơ tiêu chuẩn', dossier ? `<div class="dos">${(dossier.standards || []).map(s => `<div><b>${esc(s.short || s.title)}</b><span>${esc(s.title)}</span></div>`).join('')}</div><a class="lnk" href="https://dashboard.farmblock.vn/#/profile" target="_blank" rel="noopener">Mở checklist trên dashboard</a>`
        : locked('Trang trại · EUDR · VietGAP · GLOBALG.A.P.', 'Checklist hồ sơ trang trại (51 mục), EUDR (36), VietGAP (61), GLOBALG.A.P. (33), ranh giới vùng trồng, tải KML/GeoJSON và mã QR từng khu.')) +
      `<div class="links2"><a class="btn" href="https://farmblockadmin.github.io/farmblock-website/cong-nghe.html">Công nghệ Farmblock</a><a class="btn" href="https://farmblockadmin.github.io/farmblock-website/bang-gia.html">Bảng giá</a><a class="btn" href="https://vuonmau.farmblock.vn/ca-phe-mang-yang-1" target="_blank" rel="noopener">Xem vườn Mang Yang</a></div>`;
  }

  /* ---------- THIẾT BỊ & DỮ LIỆU ---------- */
  async function scrThietBi(el) {
    const d = await VS.get('devices'), devs = d.devices || [];
    const sending = devs.filter(x => x.status !== 'error' && x.status !== 'offline').length;
    const open = (d.quality || []).filter(q => !q.ended_at);
    const stName = s => s === 'ok' || s === 'normal' || !s ? ['', 'Bình thường'] : s === 'watch' || s === 'yellow' ? ['yellow', 'Theo dõi'] : ['device', 'Lỗi dữ liệu'];
    const kpi = (l, v, sub, cls) => `<div class="kt ${cls || ''}"><span>${l}</span><b>${v}</b><em>${sub}</em></div>`;
    const groups = {}; (d.inventory || []).forEach(x => (groups[x.group] = groups[x.group] || []).push(x));
    el.innerHTML = head('Thiết bị & dữ liệu', 'Tình trạng điểm đo, nhịp gửi số, lỗi dữ liệu và danh mục chỉ số đang thu.', at(d.sync?.last_run)) + srcNote() +
      `<div class="kts four">${kpi('Điểm đo đang gửi', `${sending}/${devs.length}`, `${fi(d.total_rows)} bản ghi`)}${kpi('Chu kỳ gửi trung vị', f(d.cadence?.median_min, 0) + ' phút', 'chậm nhất ' + f(d.cadence?.max_min, 0) + ' phút')}${kpi('Mất dữ liệu > 30 phút', fi(d.cadence?.gaps_over_30) + ' lần', 'trong 7 ngày', d.cadence?.gaps_over_30 ? 'yellow' : '')}${kpi('Lỗi cần xử lý', String(open.length), open.length ? 'xem bên dưới' : 'không có', open.length ? 'device' : '')}</div>` +
      `<div class="g2 wide">` + card('Điểm đo', `<div class="tw"><table class="tb"><thead><tr><th>Thiết bị</th><th>Khu</th><th>Tình trạng</th><th>Lần gửi cuối</th><th>Vấn đề</th></tr></thead><tbody>${devs.map(x => { const [c, l] = stName(x.status); return `<tr><th>${esc(x.label || x.device_id)} <small>${esc(x.sensor_type === 'center' ? 'trạm' : 'đất')}</small></th><td>${esc(x.zone || '–')}</td><td>${chip(c || 'ok', l)}</td><td>${hm(x.stats?.last)} <small>${fi(x.stats?.n)} bản ghi</small></td><td>${(x.issues || []).map(i => chip(i.level === 'red' ? 'red' : i.level === 'yellow' ? 'yellow' : 'device', i.label + (i.metric ? ' · ' + i.metric : ''))).join(' ') || '–'}</td></tr>` }).join('')}</tbody></table></div>`) +
      card('Đồng bộ dữ liệu', kv([['Trạng thái', d.sync?.status === 'ok' ? chip('ok', 'Ổn') : chip('device', esc(d.sync?.status || '–'))], ['Lần gần nhất', hm(d.sync?.last_run) + ' ' + dm(d.sync?.last_run)], ['Tự đồng bộ', '10 phút một lần']]) + (open.length ? `<h4 class="h4">Lỗi dữ liệu đang mở</h4>${open.map(q => `<div class="err"><b>${esc(q.station)} · ${esc(q.metric_label || q.metric)}</b><span>${esc(q.message)}</span>${q.recommendation ? `<em>→ ${esc(q.recommendation)}</em>` : ''}</div>`).join('')}` : '')) + `</div>` +
      card(`Danh mục chỉ số đang thu (${(d.inventory || []).length})`, `<div class="inv">${Object.keys(groups).map(g => `<div><h4>${esc(g)}</h4><ul>${groups[g].map(x => `<li><span>${esc(x.label)}</span><small>${esc(x.unit || '')}</small></li>`).join('')}</ul></div>`).join('')}</div>`);
  }

  /* ---------- điều hướng ---------- */
  const R = { dat: scrDat, thoitiet: scrThoiTiet, camera: scrCamera, canhtac: scrCanhTac, hoso: scrHoSo, thietbi: scrThietBi };
  let busy = 0;
  async function render() {
    const el = $('#scrIn'); if (!el || ST.scr === 'saban') return;
    const my = ++busy, y = $('#scr').scrollTop;
    try { await VS.ready; await R[ST.scr](el); if (my === busy) $('#scr').scrollTop = y }
    catch (e) { el.innerHTML = head(SCREENS.find(s => s.id === ST.scr).name, '') + `<div class="err"><b>Chưa tải được</b><span>${esc(e.message || e)}</span></div>` }
  }
  function go(id, push = true) {
    if (!R[id] && id !== 'saban') id = 'saban';
    const ch = ST.scr !== id; ST.scr = id;
    document.body.classList.toggle('scr-on', id !== 'saban');
    window.__vsPause = id !== 'saban';
    $$('#nav [data-s]').forEach(b => b.setAttribute('aria-current', b.dataset.s === id ? 'page' : 'false'));
    const s = $('#scr'); s.hidden = id === 'saban';
    if (push) { const h = id === 'saban' ? ' ' : '#/' + id; if (location.hash !== h.trim()) history.pushState(null, '', h === ' ' ? location.pathname + location.search : h) }
    if (id !== 'saban') { if (ch) { $('#scrIn').innerHTML = '<div class="ld"><i></i><i></i><i></i></div>'; s.scrollTop = 0 } render() }
    else if (ch && window.__fbRender) window.__fbRender();
  }
  function navInit() {
    const nav = $('#nav'); if (!nav) return;
    VS.ready.then(() => {
      nav.innerHTML = SCREENS.filter(s => !s.staff || VS.isStaff()).map(s => `<a href="${s.id === 'saban' ? '#' : '#/' + s.id}" data-s="${s.id}" title="${s.name}" aria-current="${s.id === ST.scr ? 'page' : 'false'}"><svg aria-hidden="true"><use href="#${s.icon}"/></svg><span class="l">${s.name}</span><span class="s">${s.short}</span></a>`).join('');
      nav.addEventListener('click', e => { const a = e.target.closest('[data-s]'); if (!a) return; e.preventDefault(); go(a.dataset.s) });
      const fromHash = () => go((location.hash.match(/^#\/(\w+)/) || [])[1] || 'saban', false);
      addEventListener('popstate', fromHash); fromHash();
      setInterval(() => { if (ST.scr !== 'saban' && !document.hidden) render() }, 5 * 6e4);
    });
  }
  window.VSApp = { go, render };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', navInit); else navInit();
})();
