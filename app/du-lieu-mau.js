/* Vườn số Ia Ko · DỮ LIỆU MẪU cho các màn Canh tác và Hồ sơ.
   Đúng tên trường của API dashboard.farmblock.vn (kiểm kê 12/11/2026): care-logs, operations, stock,
   stock/receipts, ppp, dossier. Nội dung là ví dụ minh hoạ cho vườn cà phê trồng 7/2026, KHÔNG phải
   việc thật ở vườn; mọi màn dùng dữ liệu này đều gắn nhãn "Dữ liệu mẫu".
   Không có tên người, số điện thoại, toạ độ. Người ghi chỉ ghi vai trò. */
(function () {
  'use strict';
  const VS = window.VS; if (!VS || !VS.demo) return;
  const { H, irrigAt, vnDate, day } = VS._h, DEMO = VS.demo;
  const ZONES = ['A', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C5'];
  const D0 = Date.parse('2026-07-02T00:00:00+07:00');
  const dIdx = ms => Math.floor((ms + 7 * 36e5) / 864e5);
  const msOf = di => di * 864e5 - 7 * 36e5;
  const r1 = n => Math.round(n * 10) / 10;
  const today = () => dIdx(Date.now());
  const pickZ = (di, n, k) => { const s = Math.floor(H(di, k) * 8), out = []; for (let i = 0; i < n; i++) out.push(ZONES[(s + i * 3) % 8]); return [...new Set(out)] };

  /* ---------- nhật ký từng ngày ---------- */
  function logDay(di) {
    const ms = msOf(di), date = day(ms + 12 * 36e5), dw = new Date(ms + 12 * 36e5).getUTCDay(), parts = [];
    if (ms < D0 || dw === 0) return null;
    const m = +date.slice(5, 7), dd = +date.slice(8, 10);
    const add = (task, text, wd) => parts.push({ task, label: task, text, work_days: r1(wd) });
    if (m === 7 && dd <= 26) { const z = pickZ(di, 1, 1)[0]; add('Trồng mới', `Trồng cây con cà phê ghép khu ${z}, tưới đẫm sau trồng`, 8 + H(di, 2) * 5) }
    else {
      let wet = false; for (let h = 6; h < 9; h++) if (irrigAt(ms + h * 36e5)) wet = true;
      if (m >= 11 && (wet || H(di, 3) > .55)) add('Tưới', `Tưới gốc khu ${pickZ(di, 2, 4).join(', ')} theo lịch, kiểm tra áp lực ống`, .5 + H(di, 5) * .5);
      if (dw === 1 || dw === 4) add('Làm cỏ', `Làm cỏ quanh bồn khu ${pickZ(di, 2, 6).join(', ')}`, 3 + H(di, 7) * 2);
      if (m >= 11 && (dw === 2 || dw === 5)) add('Tủ gốc', `Tủ gốc bằng rơm khô khu ${pickZ(di, 1, 8)[0]} giữ ẩm đầu mùa khô`, 2 + H(di, 9) * 1.5);
      if (dw === 3) add('Trồng dặm', `Rà cây chết, cây yếu; trồng dặm ${2 + Math.floor(H(di, 10) * 9)} cây khu ${pickZ(di, 1, 11)[0]}`, 1 + H(di, 12));
      if ((m === 8 || m === 9 || m === 10) && dd === 15) add('Bón phân', `Bón thúc NPK 16-16-8 quanh gốc khu ${pickZ(di, 3, 13).join(', ')}, lấp đất sau bón`, 4 + H(di, 14) * 2);
      if (m === 11 && dd === 2) add('Phun thuốc', 'Phun dầu khoáng cục bộ trừ rệp sáp khu B2, phun chiều mát, gió nhẹ', 1);
      if (H(di, 15) > .86) add('Sửa ống tưới', `Thay đầu tưới hỏng khu ${pickZ(di, 1, 16)[0]}`, .5);
    }
    if (!parts.length) return null;
    const wd = r1(parts.reduce((a, p) => a + p.work_days, 0)), at = date + ' 07:00', cr = date + ' 17:' + String(10 + Math.floor(H(di, 17) * 40)).padStart(2, '0');
    return { id: 'mau-' + di, at, at_local: at, created_at: cr, created_local: cr, description: parts.map(p => p.text).join('. '), note: '', work_days: wd, tasks: parts.map(p => p.task).join(', '), crop_type: 'Cà phê', by: 'Quản lý vườn', by_role: 'Quản lý vườn', media: [], hidden: false, public_text: parts.map(p => p.text).join('. '), parts, public_state: 'shown' };
  }
  const logsBetween = (a, b) => { const out = []; for (let d = b; d >= a; d--) { const x = logDay(d); if (x) out.push(x) } return out };

  DEMO['care-logs'] = q => {
    const n = +(q && q.recent) || 30, items = logsBetween(today() - n + 1, today());
    return { source: 'mẫu', items, days: {}, page: 1, last_page: 1, total: items.length, today: day(Date.now()), delayed: 0, warning: null };
  };
  DEMO.operations = () => {
    const items = logsBetween(dIdx(D0), today()).reverse(), monthly = {}, cats = {};
    items.forEach(it => { const mo = it.at.slice(0, 7); (monthly[mo] = monthly[mo] || { month: mo, ops: 0, work_days: 0 }); monthly[mo].ops += it.parts.length; monthly[mo].work_days = r1(monthly[mo].work_days + it.work_days); it.parts.forEach(p => cats[p.task] = (cats[p.task] || 0) + 1) });
    const ops = items.flatMap(it => it.parts.map((p, i) => ({ id: it.id + '-' + i, at: it.at, description: p.text, work_days: p.work_days, note: '', groups: [p.task], wd_share: p.work_days, part_of: it.id, label_mismatch: false })));
    return { farm: { name: 'Vườn Ia Ko' }, ops, total_ops: ops.length, total_work_days: r1(ops.reduce((a, o) => a + o.work_days, 0)), first_at: items[0]?.at, last_at: items[items.length - 1]?.at, monthly: Object.values(monthly), categories: Object.entries(cats).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count), moisture: null, water_days: null, db_yields: [], moisture_band: null };
  };

  /* ---------- kho vật tư ---------- */
  const ago = n => day(Date.now() - n * 864e5);
  DEMO.stock = () => ({
    today: ago(0), internal: true, read: { pending: 1 },
    rows: [
      { key: 's1', name: 'Phân NPK 16-16-8', kind: 'Phân bón', state: 'in', qty: [{ qty: 6, unit: 'bao 50 kg' }], expiry: '2027-09-30', expired: false, soon: false, last_in: ago(41), active: true, out: false, read_state: 'ok', photos: [] },
      { key: 's2', name: 'Phân hữu cơ vi sinh', kind: 'Phân bón', state: 'in', qty: [{ qty: 12, unit: 'bao 40 kg' }], expiry: ago(-40), expired: false, soon: true, last_in: ago(20), active: true, out: false, read_state: 'ok', photos: [] },
      { key: 's3', name: 'Vôi bột', kind: 'Phân bón', state: 'out', qty: [], expiry: null, expired: false, soon: false, last_in: ago(96), active: true, out: true, read_state: 'ok', photos: [] },
      { key: 's4', name: 'Phân bón lá', kind: 'Phân bón', state: 'in', qty: [{ qty: 2, unit: 'chai 1 lít' }], expiry: ago(12), expired: true, soon: false, last_in: ago(95), active: true, out: false, read_state: 'ok', photos: [] },
      { key: 's5', name: 'Dầu khoáng trừ rệp sáp', kind: 'Thuốc BVTV', state: 'in', qty: [{ qty: 4, unit: 'lít' }], expiry: '2027-06-30', expired: false, soon: false, last_in: ago(14), active: true, out: false, read_state: 'ok', photos: [] },
      { key: 's6', name: 'Dầu diesel máy bơm', kind: 'Xăng dầu', state: 'in', qty: [{ qty: 80, unit: 'lít' }], expiry: null, expired: false, soon: false, last_in: ago(6), active: true, out: false, read_state: 'ok', photos: [] },
      { key: 's7', name: 'Ống PE phi 16', kind: 'Vật tư tưới', state: 'in', qty: [{ qty: 3, unit: 'cuộn 200 m' }], expiry: null, expired: false, soon: false, last_in: ago(33), active: true, out: false, read_state: 'ok', photos: [] },
      { key: 's8', name: 'Đầu tưới nhỏ giọt', kind: 'Vật tư tưới', state: 'in', qty: [{ qty: 150, unit: 'cái' }], expiry: null, expired: false, soon: false, last_in: ago(33), active: true, out: false, read_state: 'ok', photos: [] },
      { key: 's9', name: 'Rơm khô tủ gốc', kind: 'Vật tư khác', state: 'in', qty: [{ qty: 40, unit: 'bó' }], expiry: null, expired: false, soon: false, last_in: ago(9), active: true, out: false, read_state: 'ok', photos: [] },
      { key: 's10', name: 'Găng tay, khẩu trang phun', kind: 'Bảo hộ', state: 'in', qty: [{ qty: 6, unit: 'bộ' }], expiry: null, expired: false, soon: false, last_in: ago(60), active: true, out: false, read_state: 'ok', photos: [] },
      { key: 's11', name: '(Phiếu chưa đọc)', kind: 'Chờ đọc ảnh', state: 'in', qty: [], expiry: null, expired: false, soon: false, last_in: ago(1), active: true, out: false, unnamed: true, read_state: 'pending', read_note: 'Ảnh hoá đơn mới gửi, AI chưa đọc xong', photos: [] }
    ],
    goods: [], products: []
  });
  DEMO['stock/receipts'] = () => ({
    open: 1,
    recent: [
      { id: 'r1', work_date: ago(1), status: 'pending', author: 'Quản lý vườn', supplier: 'Đại lý vật tư nông nghiệp', items_text: 'Ảnh hoá đơn, chờ đọc', amount: null, media: [] },
      { id: 'r2', work_date: ago(6), status: 'ok', author: 'Quản lý vườn', supplier: 'Cây xăng gần vườn', items_text: 'Dầu diesel 100 lít', amount: 2150000, media: [] },
      { id: 'r3', work_date: ago(9), status: 'ok', author: 'Quản lý vườn', supplier: 'Hộ dân trong xã', items_text: 'Rơm khô 60 bó', amount: 1800000, media: [] },
      { id: 'r4', work_date: ago(14), status: 'ok', author: 'Quản lý vườn', supplier: 'Đại lý vật tư nông nghiệp', items_text: 'Dầu khoáng 5 lít', amount: 900000, media: [] },
      { id: 'r5', work_date: ago(20), status: 'ok', author: 'Quản lý vườn', supplier: 'Đại lý vật tư nông nghiệp', items_text: 'Phân hữu cơ vi sinh 15 bao', amount: 4200000, media: [] }
    ], goods: [], products: []
  });

  /* ---------- thuốc BVTV ---------- */
  DEMO.ppp = () => ({
    registry: { total: null, coffee: null, imports: [] },
    legal_basis: { current: 'Danh mục thuốc bảo vệ thực vật được phép sử dụng tại Việt Nam, bản hiện hành của Bộ Nông nghiệp và Môi trường' },
    lists: [
      { id: 'vn_banned', label: 'Cấm sử dụng tại Việt Nam', level: 'red', block: true, verified: false, basis: 'Danh mục cấm của Bộ', items: ['Paraquat', 'Glyphosate', '2,4-D', 'Chlorpyrifos ethyl', 'Fipronil', 'Carbendazim', 'Benomyl', 'Thiophanate-methyl'].map(name => ({ name, note: 'cần đối chiếu bản gốc' })) },
      { id: 'eu_mrl', label: 'Dư lượng EU rất thấp trên cà phê', level: 'yellow', block: false, verified: false, basis: 'Giới hạn dư lượng tối đa của EU', items: [{ name: 'Chlorpyrifos', note: 'EU đã rút phép, giới hạn ở mức phát hiện; cần đối chiếu bản gốc' }] },
      { id: 'ra', label: 'Rainforest Alliance cấm', level: 'yellow', block: false, verified: false, basis: 'Danh sách thuốc cấm của Rainforest Alliance', items: [{ name: 'Paraquat', note: 'cần đối chiếu bản gốc' }] }
    ],
    used: [{ name: 'Dầu khoáng trừ rệp sáp', active: 'Dầu khoáng', times: 1, last: ago(10), zones: ['B2'], phi_days: 0, state: 'ok' }],
    stock: 1
  });

  /* ---------- hồ sơ tiêu chuẩn ---------- */
  const STD = [
    { id: 'farm', short: 'Trang trại', title: 'Hồ sơ trang trại', total: 51 },
    { id: 'eudr', short: 'EUDR', title: 'Quy định chống mất rừng của EU', total: 36 },
    { id: 'vietgap', short: 'VietGAP', title: 'VietGAP trồng trọt', total: 61 },
    { id: 'globalgap', short: 'GLOBALG.A.P.', title: 'GLOBALG.A.P. IFA v6', total: 33 }
  ];
  // mỗi mục: [mã, tiêu đề, trạng thái done|doing|missing|na, tự động?]
  const G = {
    farm: [
      ['Chủ thể', [['F-ORG-1', 'Tên và loại hình chủ thể sản xuất', 'done'], ['F-ORG-2', 'Người đại diện, đầu mối liên hệ', 'done'], ['F-ORG-3', 'Giấy đăng ký kinh doanh hoặc hộ kinh doanh', 'doing']]],
      ['Đất và vị trí', [['F-LND-1', 'Diện tích và ranh giới từng khu', 'done', 1], ['F-LND-2', 'Giấy tờ quyền sử dụng đất hoặc hợp đồng thuê', 'doing'], ['F-LND-3', 'Loại đất và kết quả phân tích đất', 'doing']]],
      ['Cây trồng', [['F-CRP-1', 'Giống, nguồn gốc cây con, ngày trồng', 'done'], ['F-CRP-2', 'Mật độ và sơ đồ trồng', 'done', 1], ['F-CRP-3', 'Giai đoạn sinh trưởng', 'done', 1]]],
      ['Mã số vùng trồng', [['F-PUC-1', 'Hồ sơ đăng ký mã số vùng trồng', 'missing'], ['F-PUC-2', 'Nhật ký canh tác phục vụ mã số vùng trồng', 'doing', 1]]],
      ['Nước và hạ tầng', [['F-WTR-1', 'Nguồn nước tưới và chất lượng nước', 'doing', 1], ['F-WTR-2', 'Hệ thống tưới và hồ chứa', 'done'], ['F-INF-1', 'Nhà điều hành, kho, điện mặt trời', 'done']]],
      ['Lao động', [['F-LAB-1', 'Danh sách người làm và hợp đồng', 'doing'], ['F-LAB-2', 'Tập huấn an toàn khi phun thuốc', 'missing']]],
      ['Kê khai kinh tế trang trại', [['F-ECO-1', 'Tiêu chí kinh tế trang trại', 'missing']]],
      ['Chương trình và liên kết', [['F-LNK-1', 'Liên kết tiêu thụ, hợp tác xã', 'na']]]
    ],
    eudr: [
      ['Nhà sản xuất và lô đất', [['E-1', 'Thông tin nhà sản xuất', 'done', 0, 'Điều 9(1)(f)'], ['E-2', 'Danh sách lô đất và diện tích', 'done', 1, 'Điều 9(1)(d)']]],
      ['Định vị địa lý', [['E-3', 'Ranh giới đa giác cho lô trên 4 ha', 'done', 1, 'Điều 9(1)(d)'], ['E-4', 'Tệp GeoJSON gửi kèm khai báo', 'done', 1, 'Điều 9(1)(d)']]],
      ['Không gây mất rừng', [['E-5', 'Đối chiếu bản đồ rừng mốc 31/12/2020', 'doing', 0, 'Điều 2(13), Điều 3(a)'], ['E-6', 'Ảnh vệ tinh trước và sau khi trồng', 'doing']]],
      ['Sản xuất hợp pháp', [['E-7', 'Quyền sử dụng đất', 'doing', 0, 'Điều 2(40)'], ['E-8', 'Tuân thủ luật môi trường và lao động', 'missing', 0, 'Điều 2(40)']]],
      ['Truy xuất sản lượng (áp dụng từ 2029)', [['E-9', 'Sản lượng theo lô và lần thu hoạch', 'na', 0, 'Điều 9(1)(c)']]],
      ['Đánh giá rủi ro và lưu hồ sơ', [['E-10', 'Lưu hồ sơ 5 năm', 'doing', 1, 'Điều 12(3)'], ['E-11', 'Đánh giá rủi ro theo lô', 'missing', 0, 'Điều 10']]]
    ],
    vietgap: [
      ['3.1 Yêu cầu chung', [['V-3.1.1', 'Tập huấn VietGAP cho người làm', 'missing'], ['V-3.1.2', 'Quy trình sản xuất nội bộ', 'doing'], ['V-3.1.3', 'Ghi chép và lưu hồ sơ', 'doing', 1]]],
      ['3.2.1 Khu vực sản xuất', [['V-3.2.1a', 'Đánh giá nguy cơ khu sản xuất', 'doing'], ['V-3.2.1b', 'Sơ đồ khu sản xuất', 'done', 1]]],
      ['3.2.2 Đất, nước, giống, phân, thuốc', [['V-3.2.2a', 'Phân tích đất và nước', 'doing', 1], ['V-3.2.2b', 'Nguồn gốc giống', 'done'], ['V-3.2.2c', 'Ghi chép sử dụng phân bón', 'done', 1], ['V-3.2.2d', 'Chỉ dùng thuốc trong danh mục', 'done', 1], ['V-3.2.2e', 'Kho thuốc, phân riêng, có khoá', 'doing']]],
      ['3.2.3–3.2.5 Thu hoạch, chất thải, lao động', [['V-3.2.3', 'Quy trình thu hoạch, sơ chế', 'na'], ['V-3.2.4', 'Thu gom vỏ bao bì thuốc', 'missing'], ['V-3.2.5', 'Bảo hộ lao động khi phun', 'doing']]],
      ['Yêu cầu mới bản 2026', [['V-NEW-1', 'Truy xuất nguồn gốc điện tử', 'doing', 1]]]
    ],
    globalgap: [
      ['Quản lý và truy xuất', [['G-1', 'Hồ sơ đăng ký và phạm vi chứng nhận', 'missing'], ['G-2', 'Truy xuất theo lô', 'doing', 1]]],
      ['Con người', [['G-3', 'Đào tạo an toàn lao động', 'missing'], ['G-4', 'Sơ cứu và trang bị bảo hộ', 'doing']]],
      ['Địa điểm và môi trường', [['G-5', 'Đánh giá rủi ro địa điểm', 'doing'], ['G-6', 'Bảo vệ đa dạng sinh học', 'missing']]],
      ['Canh tác', [['G-7', 'Quản lý dinh dưỡng có ghi chép', 'done', 1], ['G-8', 'Quản lý dịch hại tổng hợp', 'doing'], ['G-9', 'Quản lý nước tưới', 'done', 1]]]
    ]
  };
  // tỉ lệ đã có / đang làm / chưa có / chưa áp dụng cho tổng số mục (ước theo phần mẫu)
  const COUNT = { farm: [22, 15, 11, 3], eudr: [9, 11, 10, 6], vietgap: [14, 22, 20, 5], globalgap: [6, 10, 15, 2] };
  DEMO.dossier = () => ({ standards: STD.map(s => ({ id: s.id, title: s.title, short: s.short, total: s.total, counts: { done: COUNT[s.id][0], doing: COUNT[s.id][1], missing: COUNT[s.id][2], na: COUNT[s.id][3] } })) });
  STD.forEach(s => {
    DEMO['dossier/' + s.id] = () => ({
      id: s.id, title: s.title, total: s.total, counts: DEMO.dossier().standards.find(x => x.id === s.id).counts,
      groups: G[s.id].map(([name, items]) => ({ name, items: items.map(([code, title, status, auto, basis]) => ({ code, title, status, auto: !!auto, basis: basis || '', evidence: auto ? 'Lấy tự động từ dữ liệu vườn' : '' })) }))
    });
  });

  /* ---------- khuyến nghị việc (mẫu) ---------- */
  const ovBase = DEMO.overview;
  DEMO.overview = q => {
    const o = ovBase(q);
    o.advisory = { latest: { result: { confidence: 'mẫu', ops: { next: [
      { text: 'Tủ gốc bằng rơm khô cho các khu còn lại trước khi khô hạn', zones: ['C2', 'C3'], when: 'week' },
      { text: 'Rà cây chết, cây yếu; chuẩn bị cây để trồng dặm', zones: ['B1'], when: 'week' },
      { text: 'Kiểm tra lại rệp sáp ở khu đã phun dầu khoáng', zones: ['B2'], when: 'today' }
    ] } } } };
    return o;
  };
})();
