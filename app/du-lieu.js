/* Vườn số Ia Ko · lớp dữ liệu
   Chạy trên dashboard.farmblock.vn (cùng phiên đăng nhập): đọc thẳng /api/*.
   Chạy riêng (github.io): thử cầu trên máy (live.json), không có thì dùng dữ liệu mẫu
   đúng cấu trúc API. Dữ liệu mẫu chỉ có số đo cảm biến; nhật ký, kho, hồ sơ chỉ hiện khi đăng nhập. */
(function () {
  'use strict';
  const METRICS = ['moisture', 'temperature', 'ph', 'ec', 'nitrogen', 'phosphorus', 'potassium'];
  const CENTER = ['air_temp', 'air_humidity', 'pressure', 'light', 'wind_speed', 'wind_direction', 'rainfall_total', 'water_ph', 'water_ec', 'water_temp', 'pump1_rate', 'pump2_rate'];
  const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
  const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, num(o?.[k])]));
  const level = l => (l && l.level ? { level: String(l.level), label: String(l.label || '') } : null);

  /* ---------- ngưỡng (theo dashboard, 11/2026) ---------- */
  const TH = {
    temperature: [{ level: 'red', label: 'Rất nóng', gt: 38 }, { level: 'yellow', label: 'Nóng', gt: 34 }, { level: 'yellow', label: 'Lạnh', lt: 18 }],
    ph: [{ level: 'red', label: 'Cần kiểm tra', lt: 5 }, { level: 'red', label: 'Cần kiểm tra', gt: 7 }, { level: 'yellow', label: 'Theo dõi', lt: 5.5 }, { level: 'yellow', label: 'Theo dõi', gt: 6.5 }],
    air_temp: [{ level: 'red', label: 'Nhiệt cao', gt: 40 }, { level: 'yellow', label: 'Theo dõi', gte: 35 }],
    air_humidity: [{ level: 'yellow', label: 'Khô', lt: 45 }, { level: 'yellow', label: 'Cao', gt: 90 }],
    wind_speed: [{ level: 'red', label: 'Rất mạnh', gt: 8 }, { level: 'yellow', label: 'Gió lớn', gt: 5 }],
    water_temp: [{ level: 'red', label: 'Quá nóng', gt: 40 }, { level: 'yellow', label: 'Theo dõi', lt: 20 }, { level: 'yellow', label: 'Theo dõi', gte: 30 }],
    water_ph: [{ level: 'red', label: 'Kiềm cao', gt: 8.5 }, { level: 'yellow', label: 'Theo dõi', gte: 7.5 }, { level: 'yellow', label: 'Theo dõi', lt: 5.5 }],
    water_ec: [{ level: 'red', label: 'Cao', gt: 1500 }, { level: 'yellow', label: 'Theo dõi', gte: 700 }]
  };
  function lv(metric, v) {
    const b = TH[metric]; if (!b || v == null) return null;
    for (const r of b) if ((r.gt != null && v > r.gt) || (r.gte != null && v >= r.gte) || (r.lt != null && v < r.lt) || (r.lte != null && v <= r.lte)) return { level: r.level, label: r.label };
    return null;
  }
  const LABELS = {
    moisture: { label: 'Độ ẩm đất', unit: '%' }, temperature: { label: 'Nhiệt độ đất', unit: '°C' }, ph: { label: 'pH đất', unit: '' }, ec: { label: 'EC đất', unit: 'µS/cm' },
    nitrogen: { label: 'Đạm (N)', unit: 'mg/kg' }, phosphorus: { label: 'Lân (P)', unit: 'mg/kg' }, potassium: { label: 'Kali (K)', unit: 'mg/kg' },
    air_temp: { label: 'Nhiệt độ không khí', unit: '°C' }, air_humidity: { label: 'Độ ẩm không khí', unit: '%' }, wind_speed: { label: 'Tốc độ gió', unit: 'm/s' },
    wind_direction: { label: 'Hướng gió', unit: '°' }, light: { label: 'Ánh sáng', unit: 'lux' }, pressure: { label: 'Áp suất', unit: 'hPa' }, rainfall_total: { label: 'Mưa cộng dồn', unit: 'mm' },
    water_ph: { label: 'pH nước', unit: '' }, water_ec: { label: 'EC nước', unit: 'µS/cm' }, water_temp: { label: 'Nhiệt độ nước', unit: '°C' }
  };

  /* ---------- dữ liệu mẫu (giả lập có quy luật, cố định theo giờ) ---------- */
  const H = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s) };
  const sm = (t, k) => { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return H(i, k) * (1 - u) + H(i + 1, k) * u };
  const NODE_ZONE = ['C1', 'A', 'A', 'B1', 'B2', 'C4', 'C2', 'C3', 'C4'];
  const PLANTED = '2026-07-01';
  const STEP = 36e5; // một điểm mỗi giờ
  function vnDate(ms) { const d = new Date(ms + 7 * 36e5); return d.toISOString().slice(0, 16).replace('T', ' ') }
  const day = ms => vnDate(ms).slice(0, 10);
  const hourOf = ms => new Date(ms + 7 * 36e5).getUTCHours() + new Date(ms + 7 * 36e5).getUTCMinutes() / 60;
  // mưa: vài trận chiều đầu tháng 11, rồi khô dần
  function rainAt(ms) {
    const dI = Math.floor((ms + 7 * 36e5) / 864e5), h = hourOf(ms);
    const wet = H(dI, 3) < 0.32 - Math.max(0, (dI - 20405) * 0.012);
    return wet && h >= 14 && h < 18 ? +(H(dI * 7 + Math.floor(h), 5) * 3.2).toFixed(1) : 0;
  }
  function irrigAt(ms) { // tưới gốc buổi sáng ngày khô, m³/giờ
    const dI = Math.floor((ms + 7 * 36e5) / 864e5), h = hourOf(ms);
    return H(dI, 9) > 0.45 && h >= 6 && h < 9 ? 14 + H(dI, 11) * 10 : 0;
  }
  function airT(ms) { const h = hourOf(ms); return 22.5 + 5.5 * Math.sin((h - 9) / 24 * 2 * Math.PI) + (sm(ms / 864e5 * 2, 2) - 0.5) * 3 - (rainAt(ms) ? 3 : 0) }
  function airRH(ms) { const h = hourOf(ms); return Math.min(98, 74 - 18 * Math.sin((h - 9) / 24 * 2 * Math.PI) + (sm(ms / 864e5 * 2, 4) - 0.5) * 12 + (rainAt(ms) ? 15 : 0)) }
  function wind(ms) { const h = hourOf(ms); return Math.max(0.2, 1.6 + 1.8 * Math.max(0, Math.sin((h - 10) / 12 * Math.PI)) + (sm(ms / 36e5 / 3, 6) - 0.5) * 2.4) }
  function light(ms) { const h = hourOf(ms), s = Math.max(0, Math.sin((h - 6) / 12 * Math.PI)); return Math.round(98000 * Math.pow(s, 1.2) * (0.55 + 0.45 * sm(ms / 36e5 / 2, 7)) * (rainAt(ms) ? 0.25 : 1)) }
  function moist(i, ms) { // ẩm đất phản ứng với mưa, tưới, bốc hơi
    let m = 28 + (H(i, 21) - 0.5) * 8; const t0 = ms - 10 * 864e5;
    for (let t = t0; t <= ms; t += STEP) { m += rainAt(t) * 0.8 + irrigAt(t) * 0.05; const h = hourOf(t); m -= 0.05 + 0.09 * Math.max(0, Math.sin((h - 7) / 12 * Math.PI)); m += (29 - m) * 0.006 }
    return Math.max(14, Math.min(55, m + (sm(ms / 36e5 / 5, 30 + i) - 0.5) * 1.2));
  }
  function soilT(i, ms) { const h = hourOf(ms); return 23 + 2.4 * Math.sin((h - 13) / 24 * 2 * Math.PI) + (H(i, 22) - 0.5) * 1.6 + (sm(ms / 864e5, 40 + i) - 0.5) * 1.2 }
  function soilPH(i, ms) { return 5.95 + (H(i, 23) - 0.5) * 0.75 + (sm(ms / 864e5 / 2, 50 + i) - 0.5) * 0.12 }
  function soilEC(i, ms, mo) { return Math.round(160 + H(i, 24) * 260 + (mo - 30) * 4 + (sm(ms / 864e5, 60 + i) - 0.5) * 30) }
  const npk = (ec, i) => ({ nitrogen: Math.round(ec * (0.16 + H(i, 25) * 0.04)), phosphorus: Math.round(ec * (0.07 + H(i, 26) * 0.03)), potassium: Math.round(ec * (0.2 + H(i, 27) * 0.06)) });
  function node(i, ms) {
    const mo = moist(i, ms), ec = soilEC(i, ms, mo);
    return { moisture: +mo.toFixed(1), temperature: +soilT(i, ms).toFixed(1), ph: +soilPH(i, ms).toFixed(2), ec, ...npk(ec, i) };
  }
  function nowSlot() { return Math.floor(Date.now() / 6e5) * 6e5 } // 10 phút
  function center(ms) {
    const r = Math.max(0, irrigAt(ms));
    return {
      air_temp: +airT(ms).toFixed(1), air_humidity: Math.round(airRH(ms)), pressure: +(927 + (sm(ms / 864e5, 8) - 0.5) * 4).toFixed(1), light: light(ms),
      wind_speed: +wind(ms).toFixed(1), wind_direction: Math.round((45 + (sm(ms / 864e5, 12) - 0.5) * 70 + 360) % 360), rainfall_total: 0,
      water_ph: +(7.05 + (sm(ms / 864e5, 13) - 0.5) * 0.5).toFixed(2), water_ec: Math.round(310 + (sm(ms / 864e5, 14) - 0.5) * 80), water_temp: +(24.5 + (airT(ms) - 22.5) * 0.25).toFixed(1),
      pump1_rate: r ? +r.toFixed(1) : 0, pump2_rate: 0
    };
  }
  function series(fn, from, to, step) { const t = [], v = []; for (let x = from; x <= to; x += step) { t.push(vnDate(x)); v.push(fn(x)) } return { t, v } }
  function rangeMs(range) { return range === '24h' ? 864e5 : range === '30d' ? 30 * 864e5 : 7 * 864e5 }
  function rangeStep(range) { return range === '24h' ? 36e5 / 2 : range === '30d' ? 6 * 36e5 : 2 * 36e5 }
  function daily(days) {
    const out = [], now = nowSlot();
    for (let d = days - 1; d >= 0; d--) {
      const st = Math.floor((now + 7 * 36e5) / 864e5 - d) * 864e5 - 7 * 36e5; let rain = 0, irr = 0, tmin = 99, tmax = -99, h = 0, w = 0, n = 0;
      for (let t = st; t < Math.min(st + 864e5, now + 1); t += STEP) { rain += rainAt(t); irr += irrigAt(t); const a = airT(t); tmin = Math.min(tmin, a); tmax = Math.max(tmax, a); h += airRH(t); w = Math.max(w, wind(t)); n++ }
      out.push({ date: day(st + 12 * 36e5), rain_mm: +rain.toFixed(1), m3: Math.round(irr), pump1: Math.round(irr), pump2: 0, t: [+tmin.toFixed(1), +tmax.toFixed(1)], h: Math.round(h / n), w_max: +w.toFixed(1) });
    }
    return out;
  }
  function stage(now) {
    const p = Date.parse(PLANTED + 'T00:00:00+07:00'), age = Math.max(0, (now - p) / (30.44 * 864e5));
    const yr = Math.floor(age / 12) + 1, steps = ['KTCB năm 1', 'KTCB năm 2', 'KTCB năm 3', 'Thu bói'];
    return { planted: PLANTED, age_months: Math.floor(age) + 1, label: `KTCB năm ${Math.min(yr, 3)} · tháng thứ ${Math.floor(age) + 1} sau trồng`, steps: steps.map((s, i) => ({ label: s, state: i < yr - 1 ? 'done' : i === yr - 1 ? 'now' : 'next' })), first_harvest: null, months_to_harvest: null, progress: Math.min(1, age / 36) };
  }
  const DEMO = {
    farms: () => ({ farms: [{ id: 'iako-01', name: 'Vườn Ia Ko', area_ha: 22, configured: true, readings: true }], default: 'iako-01' }),
    soil: (q) => {
      const now = nowSlot(), from = now - rangeMs(q.range), step = rangeStep(q.range), nodes = [], ser = {}, t = series(() => 0, from, now, step).t;
      METRICS.forEach(m => ser[m] = {});
      for (let i = 0; i < 9; i++) {
        const id = 'SOIL-' + String(i + 1).padStart(2, '0'), cur = node(i, now), prev = node(i, now - 864e5);
        const d24 = Object.fromEntries(METRICS.map(m => [m, +(cur[m] - prev[m]).toFixed(2)]));
        nodes.push({ station: id, at: vnDate(now), zone: NODE_ZONE[i], depth_cm: 30, ...cur, d24, levels: Object.fromEntries(METRICS.map(m => [m, lv(m, cur[m])])) });
        const vals = []; for (let x = from; x <= now; x += step) vals.push(node(i, x));
        METRICS.forEach(m => ser[m][id] = vals.map(v => v[m]));
      }
      const avg = Object.fromEntries(METRICS.map(m => [m, +(nodes.reduce((a, n) => a + n[m], 0) / 9).toFixed(2)]));
      return { range: q.range || '7d', nodes, avg, series: { t, series: ser }, labels: LABELS, rain: daily(7).map(d => ({ date: d.date, mm: d.rain_mm })), thresholds: TH, moisture_band: { low: 25, high: 40, basis: 'mẫu' }, npk_derived: true };
    },
    climate: (q) => {
      const now = nowSlot(), from = now - rangeMs(q.range), step = rangeStep(q.range), c = center(now);
      const s = { t: [], air_temp: [], air_humidity: [], wind_speed: [], light: [], pressure: [], water_ph: [], water_ec: [], water_temp: [] };
      for (let x = from; x <= now; x += step) { const v = center(x); s.t.push(vnDate(x)); Object.keys(s).forEach(k => k !== 't' && s[k].push(v[k])) }
      const dd = daily(q.range === '30d' ? 30 : 7), today = dd[dd.length - 1];
      const levels = Object.fromEntries(CENTER.map(m => [m, lv(m, c[m])]));
      return {
        range: q.range || '7d', now: { ...c, at: vnDate(now), levels, rain_today: today.rain_mm }, series: s, daily: dd, area_ha: 22, thresholds: TH, labels: LABELS,
        pumps: [{ id: 1, name: 'Bơm 1', rate: c.pump1_rate, today_m3: today.m3, total: 18240 + Math.round((now / 864e5 % 100) * 30), running: c.pump1_rate > 0, stale: false, last_update: vnDate(now) },
          { id: 2, name: 'Bơm 2', rate: 0, today_m3: 0, total: 6120, running: false, stale: false, last_update: vnDate(now) }],
        share: { rh_red: Math.round(s.air_humidity.filter(v => v > 85).length / s.air_humidity.length * 100), wph_red: 0, wind_gt5: s.wind_speed.filter(v => v > 5).length }, alerts: []
      };
    },
    forecast: () => { // 24 giờ tới theo khung 3 giờ và 3 ngày
      const now = Math.ceil(Date.now() / 36e5) * 36e5, hours = [], days = [];
      for (let k = 1; k <= 8; k++) { const t = now + k * 3 * 36e5; hours.push({ t: vnDate(t), rain: rainAt(t), wind: +wind(t).toFixed(1), temp: +airT(t).toFixed(0) }) }
      for (let d = 1; d <= 3; d++) { const st = now + d * 864e5; let r = 0, mn = 99, mx = -99, w = 0; for (let t = st - 12 * 36e5; t < st + 12 * 36e5; t += STEP) { r += rainAt(t); mn = Math.min(mn, airT(t)); mx = Math.max(mx, airT(t)); w = Math.max(w, wind(t)) } days.push({ date: day(st), sky: r > 2 ? 'rain' : r > 0 ? 'cloud' : 'sun', tmin: Math.round(mn), tmax: Math.round(mx), rain: +r.toFixed(1), wind: +w.toFixed(1) }) }
      let spray = null; for (let k = 1; k < 48 && !spray; k++) { const t = now + k * 36e5, h = hourOf(t); if (h >= 6 && h <= 16 && wind(t) < 4 && ![0, 1, 2, 3, 4].some(j => rainAt(t + j * 36e5))) spray = { date: day(t), from: String(Math.floor(h)).padStart(2, '0') + ':00', to: String(Math.min(17, Math.floor(h) + 3)).padStart(2, '0') + ':00', wind: +wind(t).toFixed(1) } }
      return { updated: vnDate(now), hours, days, spray, source: 'mẫu', wind_limit: 4, dry_hours: 4 };
    },
    devices: () => {
      const now = nowSlot(), devices = [];
      for (let i = 0; i < 9; i++) devices.push({ device_id: 'SOIL-' + String(i + 1).padStart(2, '0'), sensor_type: 'soil', label: 'Điểm đo ' + (i + 1), zone: NODE_ZONE[i], depth_cm: 30, position_source: 'plan', stats: { n: 4300 + i * 37, last: vnDate(now) }, issues: [], status: 'ok' });
      devices.push({ device_id: 'CENTER-01', sensor_type: 'center', label: 'Trạm trung tâm', zone: null, position_source: 'plan', stats: { n: 4310, last: vnDate(now) }, issues: [], status: 'ok' });
      const inv = [['Đất', 'temperature', '°C'], ['Đất', 'moisture', '%'], ['Đất', 'ph', ''], ['Đất', 'ec', 'µS/cm'], ['Đất', 'nitrogen', 'mg/kg'], ['Đất', 'phosphorus', 'mg/kg'], ['Đất', 'potassium', 'mg/kg'],
        ['Thời tiết', 'air_temp', '°C'], ['Thời tiết', 'air_humidity', '%'], ['Thời tiết', 'wind_speed', 'm/s'], ['Thời tiết', 'wind_direction', '°'], ['Thời tiết', 'rainfall_total', 'mm'], ['Thời tiết', 'pressure', 'hPa'], ['Thời tiết', 'light', 'lux'],
        ['Nước', 'water_ph', ''], ['Nước', 'water_ec', 'µS/cm'], ['Nước', 'water_temp', '°C'], ['Bơm 1/2', 'pump_rate', 'm³/h'], ['Bơm 1/2', 'pump_total', 'm³'], ['Bơm 1/2', 'pump_velocity', 'm/s'], ['Bơm 1/2', 'pump_empty', '0/1']]
        .map(([g, f, u]) => ({ group: g, field: f, label: (LABELS[f] || { label: { pump_rate: 'Lưu lượng bơm', pump_total: 'Tổng nước bơm', pump_velocity: 'Vận tốc dòng', pump_empty: 'Báo ống rỗng' }[f] }).label, unit: u, at: vnDate(now), shown: g === 'Bơm 1/2' ? 'Thời tiết & nước' : g === 'Đất' ? 'Đất, Sa bàn' : 'Thời tiết & nước, Sa bàn' }));
      return { devices, cadence: { median_min: 10, max_min: 20, gaps_over_30: 0 }, quality: [], sync: { last_run: vnDate(now), status: 'ok' }, total_rows: devices.reduce((a, d) => a + d.stats.n, 0), inventory: inv, cameras: 6 };
    },
    cameras: () => ({ planned: 22, installed: 6, ready: 5 }),
    overview: () => ({ farm: { name: 'Vườn Ia Ko', area_ha: 22, soil: 'Đất đỏ bazan', crops: [{ name: 'Cà phê Robusta ghép Thiện Trường', role: 'chính', per_ha: 2200 }], stage: stage(Date.now()) } })
  };
  function demoLive() {
    const s = DEMO.soil({ range: '7d' }), c = DEMO.climate({ range: '7d' }), d = DEMO.devices(), dd = c.daily, today = dd[dd.length - 1];
    const now = nowSlot(), ph = s.nodes.map(n => n.ph).sort((a, b) => a - b);
    const att = [];
    ['temperature', 'ph'].forEach(m => { const st = s.nodes.filter(n => n.levels[m]); if (st.length) { const l = st[0].levels[m]; att.push({ kind: 'threshold', metric: LABELS[m].label, level: l.level, label: l.label, stations: st.map(n => n.station) }) } });
    Object.keys(c.now.levels).forEach(m => { const l = c.now.levels[m]; if (l) att.push({ kind: 'threshold', metric: LABELS[m].label, level: l.level, label: l.label, stations: ['CENTER'] }) });
    return {
      at: vnDate(now), demo: true,
      center: { at: vnDate(now), ...pick(c.now, CENTER), levels: c.now.levels },
      nodes: s.nodes.map(n => ({ id: n.station, at: n.at, zone: n.zone, ...pick(n, METRICS), d24: pick(n.d24, METRICS), levels: n.levels, hist: Object.fromEntries(['moisture', 'temperature', 'ph', 'ec'].map(m => [m, s.series.series[m][n.station].slice(-84)])) })),
      kpi: { moisture: s.avg.moisture, soil_temp: s.avg.temperature, ph: ph[4], ec: s.avg.ec, rain_today: today.rain_mm, rain_7d: +dd.reduce((a, x) => a + x.rain_mm, 0).toFixed(1), irrigation_today: today.m3, irrigation_7d: dd.reduce((a, x) => a + x.m3, 0) },
      attention: att, device_status: Object.fromEntries(d.devices.map(x => [x.device_id, x.status])), cadence: d.cadence, sync: d.sync, total_rows: d.total_rows, cameras: 6, received_at: new Date().toISOString()
    };
  }

  /* ---------- API thật ---------- */
  function clean(raw) { // giống live/bridge.mjs: chỉ số đo đi qua, không mang tên người hay toạ độ
    const series = raw.soil?.series?.series || {};
    const nodes = (raw.map?.nodes || []).map(n => ({
      id: String(n.station), at: String(n.at || ''), zone: n.zone ? String(n.zone) : null, ...pick(n, METRICS), d24: pick(n.d24, METRICS),
      levels: Object.fromEntries(METRICS.map(m => [m, level(n.levels?.[m])])),
      hist: Object.fromEntries(['moisture', 'temperature', 'ph', 'ec'].map(m => [m, (series[m]?.[n.station] || []).map(num)]))
    }));
    const c = raw.map?.center || {}, k = raw.overview?.kpi || {};
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
      received_at: new Date().toISOString()
    };
  }

  const VS = {
    mode: 'demo', farm: null, me: null, ready: null, labels: LABELS, thresholds: TH, lv,
    async init() {
      if (/[?&]mau/.test(location.search)) return (this.mode = 'demo');
      if (location.protocol.startsWith('http')) {
        try {
          const r = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' });
          if (r.ok && (r.headers.get('content-type') || '').includes('json')) {
            this.me = await r.json();
            const f = await (await fetch('/api/farms', { credentials: 'same-origin' })).json();
            this.farm = f.default || f.farms?.[0]?.id; this.mode = 'api'; return this.mode;
          }
        } catch (e) { }
        try { const r = await fetch('live.json', { cache: 'no-store' }); if (r.ok) { const d = await r.json(); if (d.nodes) return (this.mode = 'bridge') } } catch (e) { }
      }
      return (this.mode = 'demo');
    },
    async get(ep, q = {}) {
      if (this.mode === 'api') {
        const qs = new URLSearchParams({ farm: this.farm, ...q }).toString();
        const r = await fetch(`/api/${ep}?${qs}`, { credentials: 'same-origin' });
        if (!r.ok) throw new Error(r.status === 403 ? 'Tài khoản này chưa được xem phần này' : 'Không tải được dữ liệu (' + r.status + ')');
        return r.json();
      }
      if (ep === 'onescreen') return { forecast: DEMO.forecast() };
      if (!DEMO[ep]) return { locked: true };
      return DEMO[ep](q);
    },
    async live() {
      if (this.mode === 'api') {
        const [map, overview, soil, devices] = await Promise.all(['map', 'overview', 'soil', 'devices'].map(p => this.get(p)));
        return clean({ map, overview, soil, devices });
      }
      if (this.mode === 'bridge') { const r = await fetch('live.json', { cache: 'no-store' }); if (!r.ok) throw 0; return r.json() }
      return demoLive();
    },
    canWrite() { return this.mode === 'api' && ['admin', 'expert', 'quan_tri', 'chuyen_gia'].includes(String(this.me?.user?.role || '').toLowerCase()) },
    isStaff() { return this.mode !== 'api' || !this.me || /admin|expert|quan|chuyen/i.test(String(this.me?.user?.role || '')) }
  };
  VS.ready = VS.init();
  window.VS = VS;
})();
