import './styles.css';
import { load } from './content.js';
import { COPY, getLang, setLang, t } from './i18n.js';
import { createGrassField } from './grass.js';

const esc = (s) => String(s ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const corners = () =>
  '<i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>';

const sectionHead = (num, title) => `
  <div class="section-head">
    <span class="num">${num}</span>
    <h2>${esc(title)}</h2>
  </div>`;

function render() {
  const lang = getLang();
  const c = COPY[lang];
  const d = load();
  const p = d.profile;
  const T = (v) => t(v, lang);

  document.documentElement.lang = lang;
  document.title = `${p.name} — ${T(p.role)}`;

  document.getElementById('brand').textContent = p.name;
  document.getElementById('lang-toggle').textContent = c.langLabel;
  document.getElementById('admin-link').textContent = c.nav.admin;

  document.getElementById('nav').innerHTML = `
    <a href="#work">${esc(c.nav.work)}</a>
    <a href="#services">${esc(c.nav.services)}</a>
    <a href="#process">${esc(c.nav.process)}</a>
    <a href="#writing">${esc(c.nav.writing)}</a>
    <a href="#contact">${esc(c.nav.contact)}</a>`;

  // — hero —
  const mailto = 'mailto:' + p.email;
  document.getElementById('hero').innerHTML = `
    <div>
      <div class="hero-avail"><span class="dot7"></span><span>${esc(T(p.availability))}</span></div>
      <h1>${esc(T(p.role))}</h1>
      <p class="tagline">${esc(T(p.tagline))}</p>
      <div class="hero-cta">
        <a class="btn btn-primary blueprint" href="#contact">${corners()}${esc(c.cta.hire)}</a>
        <a class="btn btn-secondary" href="#work">${esc(c.cta.work)}</a>
      </div>
    </div>
    <div class="blueprint panel hero-card">
      ${corners()}
      <p class="about">${esc(T(p.about))}</p>
      <dl>
        <dt>${esc(c.labels.base)}</dt><dd>${esc(p.location)}</dd>
        <dt>${esc(c.labels.email)}</dt><dd><a href="${esc(mailto)}">${esc(p.email)}</a></dd>
        <dt>${esc(c.labels.phone)}</dt><dd>${esc(p.phone)}</dd>
      </dl>
      <div class="hero-links">
        ${(p.links || []).map((l) => `<a class="btn btn-secondary" href="${esc(l.url)}">${esc(l.label)}</a>`).join('')}
      </div>
    </div>`;

  // — work —
  document.getElementById('work').innerHTML = sectionHead('01', c.headings.work) + `
    <div class="grid-3">
      ${(d.projects || []).map((x) => `
        <article class="card blueprint panel">
          ${corners()}
          <div class="kicker-row"><span>${esc(T(x.kicker))}</span><span>${esc(x.year)}</span></div>
          <h3>${esc(x.title)}</h3>
          <p class="summary">${esc(T(x.summary))}</p>
          <div class="result">${esc(T(x.result))}</div>
          <div class="tags">${(x.tags || []).map((g) => `<span class="tag tag-outline">${esc(g)}</span>`).join('')}</div>
          ${x.url ? `<a class="case-link" href="${esc(x.url)}">${esc(c.labels.viewCase)} →</a>` : ''}
        </article>`).join('')}
    </div>`;

  // — services —
  document.getElementById('services').innerHTML = sectionHead('02', c.headings.services) + `
    <div class="grid-3">
      ${(d.services || []).map((s) => `
        <div class="card service blueprint panel">
          ${corners()}
          <h3>${esc(T(s.name))}</h3>
          <p class="summary">${esc(T(s.desc))}</p>
          <div class="price-row">
            <span class="price">${esc(s.price)}</span>
            <span class="unit">${esc(T(s.unit))}</span>
          </div>
        </div>`).join('')}
    </div>`;

  // — stack & experience —
  document.getElementById('stack').innerHTML = `
    <div>
      ${sectionHead('03', c.headings.stack)}
      <div style="display: grid; gap: 20px;">
        ${(d.skills || []).map((g) => `
          <div class="skill-row">
            <div class="group">${esc(T(g.group))}</div>
            <div class="items">${esc(g.items)}</div>
          </div>`).join('')}
      </div>
    </div>
    <div>
      ${sectionHead('04', c.headings.experience)}
      <div style="display: grid; gap: 20px;">
        ${(d.experience || []).map((e) => `
          <div class="xp-row">
            <div class="top"><h4>${esc(e.company)}</h4><span class="period">${esc(e.period)}</span></div>
            <div class="role">${esc(T(e.role))}</div>
            <p>${esc(T(e.desc))}</p>
          </div>`).join('')}
      </div>
    </div>`;

  // — process —
  document.getElementById('process').innerHTML = sectionHead('05', c.headings.process) + `
    <div class="grid-4">
      ${(d.process || []).map((s, i) => `
        <div class="step">
          <div class="num">${String(i + 1).padStart(2, '0')}</div>
          <h4>${esc(T(s.title))}</h4>
          <p>${esc(T(s.desc))}</p>
        </div>`).join('')}
    </div>`;

  // — testimonials — (hidden when empty, same as writing below)
  const testimonials = d.testimonials || [];
  document.getElementById('testimonials').innerHTML = testimonials.length
    ? sectionHead('06', c.headings.testimonials) + `
      <div class="grid-2">
        ${testimonials.map((x) => `
          <blockquote class="quote blueprint panel">
            ${corners()}
            <p>“${esc(T(x.quote))}”</p>
            <footer>${esc(x.author)} · ${esc(x.company)}</footer>
          </blockquote>`).join('')}
      </div>`
    : '';

  // — writing —
  const posts = d.posts || [];
  document.getElementById('writing').innerHTML = posts.length
    ? sectionHead('07', c.headings.writing) + `
      <div>
        ${posts.map((x) => `
          <a class="post-row" href="${esc(x.url || '#')}">
            <span class="date">${esc(x.date)}</span>
            <span>
              <span class="post-title">${esc(T(x.title))}</span>
              <span class="excerpt">${esc(T(x.excerpt))}</span>
            </span>
            <span class="tag tag-accent">${esc(x.tag)}</span>
          </a>`).join('')}
      </div>`
    : '';

  // — contact —
  const tel = 'tel:' + String(p.phone).replace(/\s/g, '');
  document.getElementById('contact').innerHTML = `
    <div>
      <h2>${esc(c.headings.contact)}</h2>
      <p class="blurb">${esc(c.contactBlurb)}</p>
    </div>
    <div class="actions">
      <a class="btn btn-mail" href="${esc(mailto)}">${esc(p.email)} <span>→</span></a>
      <a class="btn btn-tel" href="${esc(tel)}">${esc(p.phone)} <span>→</span></a>
      <p class="avail">${esc(T(p.availability))}</p>
    </div>`;

  // — footer —
  document.getElementById('footer').innerHTML = `
    <span>© ${new Date().getFullYear()} ${esc(p.name)}</span>
    <a href="./admin.html">${esc(c.nav.admin)}</a>`;
}

render();

document.getElementById('lang-toggle').addEventListener('click', () => {
  setLang(getLang() === 'vi' ? 'en' : 'vi');
  render();
});

// Re-render when the admin tab saves content.
window.addEventListener('storage', (e) => {
  if (e.key === 'portfolio.content.v1') render();
});
window.addEventListener('focus', render);

createGrassField(document.getElementById('bg-canvas'));
