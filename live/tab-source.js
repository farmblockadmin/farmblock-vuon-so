// Dán vào Console của tab dashboard.farmblock.vn đã đăng nhập (bản thử, thay cho khóa chỉ đọc).
// Mỗi phút chỉ đọc số liệu rồi gửi sang cầu trên chính máy này; tab đóng là dừng.
(async () => {
  clearInterval(window.__fbLive);
  const farm = (await fetch('/api/farms').then(r => r.json())).farms[0].id;
  const get = (p, q = '') => fetch(`/api/${p}?farm=${farm}${q}`).then(r => r.json());
  const push = async () => {
    const [map, overview, soil, devices] = await Promise.all([get('map'), get('overview'), get('soil'), get('devices')]);
    await fetch('http://127.0.0.1:18940/ingest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ map, overview, soil, devices }) });
  };
  await push();
  window.__fbLive = setInterval(() => push().catch(e => console.warn('Cầu dữ liệu:', e.message)), 60000);
  return 'đang gửi';
})();
