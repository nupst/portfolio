import './styles.css';
import * as store from './content.js';

// field types: t=text, a=textarea, bt=bilingual text, ba=bilingual textarea, tags=comma list
const SCHEMA = {
  profile: {
    label: 'Hồ sơ · Profile', single: true,
    hint: 'Thông tin hiển thị ở đầu trang và mục liên hệ. Các trường có (VI)/(EN) hiện theo ngôn ngữ người xem chọn.',
    fields: [
      ['name', 'Họ tên', 't'], ['location', 'Địa điểm', 't'],
      ['email', 'Email', 't'], ['phone', 'Điện thoại', 't'],
      ['role', 'Chức danh', 'bt'], ['availability', 'Tình trạng nhận việc', 'bt'],
      ['tagline', 'Giới thiệu ngắn (hero)', 'ba'], ['about', 'Mô tả bản thân', 'ba']
    ]
  },
  links: {
    label: 'Liên kết · Links', path: ['profile', 'links'],
    hint: 'Nút liên kết ở thẻ giới thiệu (GitHub, LinkedIn…).',
    fields: [['label', 'Nhãn', 't'], ['url', 'Đường dẫn', 't']],
    blank: () => ({ label: 'Website', url: 'https://' })
  },
  projects: {
    label: 'Dự án · Projects', hint: 'Case study khách hàng nhìn đầu tiên. Nên có kết quả đo được.',
    fields: [
      ['title', 'Tên dự án', 't'], ['year', 'Năm', 't'],
      ['kicker', 'Lĩnh vực / vai trò', 'bt'], ['result', 'Kết quả nổi bật', 'bt'],
      ['tags', 'Công nghệ (cách nhau bởi dấu phẩy)', 'tags'], ['url', 'Link chi tiết (tùy chọn)', 't'],
      ['summary', 'Mô tả', 'ba']
    ],
    blank: () => ({ title: 'Dự án mới', year: '2026', kicker: { vi: '', en: '' }, summary: { vi: '', en: '' }, result: { vi: '', en: '' }, tags: [], url: '' })
  },
  services: {
    label: 'Dịch vụ · Services', hint: 'Gói dịch vụ và mức giá.',
    fields: [['name', 'Tên gói', 'bt'], ['price', 'Giá', 't'], ['unit', 'Đơn vị', 'bt'], ['desc', 'Mô tả', 'ba']],
    blank: () => ({ name: { vi: '', en: '' }, desc: { vi: '', en: '' }, price: '', unit: { vi: 'theo dự án', en: 'per project' } })
  },
  skills: {
    label: 'Kỹ năng · Stack', hint: 'Mỗi dòng là một nhóm công nghệ.',
    fields: [['group', 'Nhóm', 'bt'], ['items', 'Danh sách', 'a']],
    blank: () => ({ group: { vi: '', en: '' }, items: '' })
  },
  experience: {
    label: 'Kinh nghiệm · Experience', hint: 'Nơi làm việc, sắp xếp mới nhất lên trên.',
    fields: [['company', 'Công ty', 't'], ['period', 'Thời gian', 't'], ['role', 'Vị trí', 'bt'], ['desc', 'Mô tả', 'ba']],
    blank: () => ({ company: '', period: '', role: { vi: '', en: '' }, desc: { vi: '', en: '' } })
  },
  process: {
    label: 'Quy trình · Process', hint: 'Các bước làm việc, đánh số tự động theo thứ tự.',
    fields: [['title', 'Tên bước', 'bt'], ['desc', 'Mô tả', 'ba']],
    blank: () => ({ title: { vi: '', en: '' }, desc: { vi: '', en: '' } })
  },
  testimonials: {
    label: 'Đánh giá · Testimonials', hint: 'Trích dẫn từ khách hàng cũ.',
    fields: [['author', 'Người nói', 't'], ['company', 'Vai trò, công ty', 't'], ['quote', 'Nội dung', 'ba']],
    blank: () => ({ author: '', company: '', quote: { vi: '', en: '' } })
  },
  posts: {
    label: 'Bài viết · Writing', hint: 'Bài viết ngắn giúp khách hàng tin vào chuyên môn.',
    fields: [['title', 'Tiêu đề', 'bt'], ['date', 'Ngày (YYYY-MM-DD)', 't'], ['tag', 'Chủ đề', 't'], ['url', 'Đường dẫn', 't'], ['excerpt', 'Tóm tắt', 'ba']],
    blank: () => ({ title: { vi: '', en: '' }, excerpt: { vi: '', en: '' }, date: '2026-01-01', tag: '', url: '' })
  }
};

let data = store.load();
let tab = 'profile';
let savedTimer = 0;

const esc = (s) => String(s ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const corners = () =>
  '<i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>';

function commit(next) {
  data = next;
  store.save(data);
  const label = document.getElementById('saved-label');
  label.textContent = 'Đã lưu';
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { label.textContent = ''; }, 1600);
}

const listOf = (key) => {
  const cfg = SCHEMA[key];
  if (cfg.single) return null;
  return cfg.path ? (data[cfg.path[0]][cfg.path[1]] || []) : (data[key] || []);
};

function writeList(key, list) {
  const cfg = SCHEMA[key];
  const next = { ...data };
  if (cfg.path) next[cfg.path[0]] = { ...next[cfg.path[0]], [cfg.path[1]]: list };
  else next[key] = list;
  return next;
}

function rowName(item) {
  const pick = (v) => (v && typeof v === 'object' ? (v.vi || v.en || '') : (v || ''));
  return pick(item.title) || pick(item.company) || pick(item.author) || pick(item.label) || pick(item.name) || pick(item.group) || '';
}

function setField(key, index, path, value) {
  const d = structuredClone(data);
  const target = SCHEMA[key].single ? d.profile : (SCHEMA[key].path ? d[SCHEMA[key].path[0]][SCHEMA[key].path[1]] : d[key])[index];
  const parts = path.split('.');
  let o = target;
  while (parts.length > 1) {
    const p = parts.shift();
    if (typeof o[p] !== 'object' || o[p] === null) o[p] = {};
    o = o[p];
  }
  o[parts[0]] = value;
  commit(d);
}

function renderTabs() {
  const el = document.getElementById('tabs');
  el.innerHTML = Object.keys(SCHEMA).map((k) => {
    const cfg = SCHEMA[k];
    const count = cfg.single ? '' : String((cfg.path ? data[cfg.path[0]][cfg.path[1]] : data[k])?.length ?? 0);
    return `
      <button class="admin-tab${k === tab ? ' active' : ''}" data-tab="${k}">
        <span>${esc(cfg.label.split(' · ')[0])}</span>
        <span class="count">${count}</span>
      </button>`;
  }).join('');
  el.querySelectorAll('[data-tab]').forEach((btn) =>
    btn.addEventListener('click', () => { tab = btn.dataset.tab; render(); }));
}

function fieldControls(key, item, i) {
  const cfg = SCHEMA[key];
  const out = [];
  cfg.fields.forEach(([fk, label, type]) => {
    if (type === 'bt' || type === 'ba') {
      for (const lg of ['vi', 'en']) {
        out.push({
          label: `${label} (${lg.toUpperCase()})`,
          value: (item[fk] && item[fk][lg]) || '',
          area: type === 'ba',
          wide: type === 'ba',
          path: `${fk}.${lg}`,
          parse: (v) => v
        });
      }
    } else if (type === 'tags') {
      out.push({
        label, value: (item[fk] || []).join(', '), area: false, wide: true,
        placeholder: 'React, Node.js, AWS', path: fk,
        parse: (v) => v.split(',').map((s) => s.trim()).filter(Boolean)
      });
    } else {
      out.push({
        label, value: item[fk] || '', area: type === 'a', wide: type === 'a',
        path: fk, parse: (v) => v
      });
    }
  });
  return out.map((f, fi) => `
    <div class="field${f.wide ? ' wide' : ''}">
      <label>${esc(f.label)}</label>
      ${f.area
        ? `<textarea class="input" rows="3" data-field="${i}:${fi}">${esc(f.value)}</textarea>`
        : `<input class="input" type="text" value="${esc(f.value)}" placeholder="${esc(f.placeholder || '')}" data-field="${i}:${fi}">`}
    </div>`).join('');
}

function renderEditor() {
  const cfg = SCHEMA[tab];
  const items = cfg.single ? [data.profile] : listOf(tab);
  const el = document.getElementById('editor');

  el.innerHTML = `
    <div class="page-head">
      <div style="min-width: 0;">
        <h1>${esc(cfg.label)}</h1>
        <p>${esc(cfg.hint)}</p>
      </div>
      ${cfg.single ? '' : `
        <button class="btn btn-primary blueprint" id="btn-add" style="padding: 9px 18px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;">
          ${corners()}+ Thêm mục
        </button>`}
    </div>
    <div class="rows">
      ${items.map((item, i) => `
        <section class="blueprint row-card" data-row="${i}">
          ${corners()}
          <div class="row-head">
            <span class="row-title">${cfg.single ? 'Hồ sơ' : `${String(i + 1).padStart(2, '0')} · ${esc(rowName(item) || 'Mục')}`}</span>
            ${cfg.single ? '' : `
              <button class="btn btn-secondary" data-up="${i}" style="padding: 4px 10px; font-size: 13px;">↑</button>
              <button class="btn btn-secondary" data-down="${i}" style="padding: 4px 10px; font-size: 13px;">↓</button>
              <button class="btn btn-secondary" data-del="${i}" style="padding: 4px 12px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-accent-800);">Xóa</button>`}
          </div>
          <div class="fields">${fieldControls(tab, item, i)}</div>
        </section>`).join('')}
    </div>
    ${items.length === 0 ? '<div class="empty" style="margin-top: 26px;">Chưa có mục nào. Bấm "Thêm mục" để tạo mới.</div>' : ''}`;

  // change handlers — recompute the control map per row
  el.querySelectorAll('[data-field]').forEach((input) => {
    input.addEventListener('change', () => {
      const [i, fi] = input.dataset.field.split(':').map(Number);
      const item = cfg.single ? data.profile : listOf(tab)[i];
      const controls = controlDefs(tab, item);
      const f = controls[fi];
      setField(tab, i, f.path, f.parse(input.value));
      renderTabs(); // counts / row titles may change
      const row = el.querySelector(`[data-row="${i}"] .row-title`);
      if (row && !cfg.single) {
        const fresh = listOf(tab)[i];
        row.textContent = `${String(i + 1).padStart(2, '0')} · ${rowName(fresh) || 'Mục'}`;
      }
    });
  });

  el.querySelector('#btn-add')?.addEventListener('click', () => {
    const list = listOf(tab).slice();
    list.push({ id: store.uid(), ...cfg.blank() });
    commit(writeList(tab, list));
    render();
  });
  el.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => move(Number(b.dataset.up), -1)));
  el.querySelectorAll('[data-down]').forEach((b) => b.addEventListener('click', () => move(Number(b.dataset.down), 1)));
  el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('Xóa mục này?')) return;
    commit(writeList(tab, listOf(tab).filter((_, x) => x !== Number(b.dataset.del))));
    render();
  }));
}

// Mirror of fieldControls' ordering, but only label/path/parse (no markup).
function controlDefs(key, item) {
  const out = [];
  SCHEMA[key].fields.forEach(([fk, label, type]) => {
    if (type === 'bt' || type === 'ba') {
      for (const lg of ['vi', 'en']) out.push({ path: `${fk}.${lg}`, parse: (v) => v });
    } else if (type === 'tags') {
      out.push({ path: fk, parse: (v) => v.split(',').map((s) => s.trim()).filter(Boolean) });
    } else {
      out.push({ path: fk, parse: (v) => v });
    }
  });
  return out;
}

function move(i, delta) {
  const list = listOf(tab).slice();
  const j = i + delta;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  commit(writeList(tab, list));
  render();
}

function render() {
  renderTabs();
  renderEditor();
}

document.getElementById('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'portfolio-content.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('input-import').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  file.text().then((txt) => {
    try {
      commit(JSON.parse(txt));
      render();
    } catch {
      alert('File JSON không hợp lệ');
    }
  });
  e.target.value = '';
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (!confirm('Khôi phục toàn bộ nội dung mẫu? Thay đổi hiện tại sẽ mất.')) return;
  store.reset();
  data = store.load();
  commit(data);
  render();
});

render();
