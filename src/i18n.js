export const LANG_KEY = 'portfolio.lang';

export const COPY = {
  vi: {
    nav: { work: 'Dự án', services: 'Dịch vụ', process: 'Quy trình', writing: 'Bài viết', contact: 'Liên hệ', admin: 'Quản lý' },
    headings: { work: 'Dự án đã làm', services: 'Dịch vụ & báo giá', stack: 'Kỹ năng', experience: 'Kinh nghiệm', process: 'Quy trình làm việc', testimonials: 'Khách hàng nói gì', writing: 'Bài viết', contact: 'Cùng bắt đầu dự án của bạn' },
    labels: { base: 'Địa điểm', email: 'Email', phone: 'Điện thoại', viewCase: 'Xem chi tiết' },
    cta: { hire: 'Thuê tôi', work: 'Xem dự án' },
    contactBlurb: 'Gửi tôi vài dòng về sản phẩm bạn muốn xây. Tôi trả lời trong 24 giờ và gửi phạm vi công việc kèm báo giá sau buổi trao đổi đầu tiên.',
    langLabel: 'EN'
  },
  en: {
    nav: { work: 'Work', services: 'Services', process: 'Process', writing: 'Writing', contact: 'Contact', admin: 'Admin' },
    headings: { work: 'Selected work', services: 'Services & pricing', stack: 'Stack', experience: 'Experience', process: 'How I work', testimonials: 'Client feedback', writing: 'Writing', contact: "Let's start your project" },
    labels: { base: 'Based in', email: 'Email', phone: 'Phone', viewCase: 'View case' },
    cta: { hire: 'Hire me', work: 'See work' },
    contactBlurb: 'Send me a few lines about what you want to build. I reply within 24 hours and send scope plus a quote after the first call.',
    langLabel: 'VI'
  }
};

/** Default language from the browser/system locale (Vietnamese → vi, else en). */
function systemLang() {
  const list = (typeof navigator !== 'undefined'
    && (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]))
    || [];
  return list.some((l) => l && l.toLowerCase().startsWith('vi')) ? 'vi' : 'en';
}

export function getLang() {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored === 'en' || stored === 'vi') return stored;
  return systemLang();
}

export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
}

/** Pick a bilingual value for the current language. */
export function t(v, lang) {
  return v && typeof v === 'object' ? (v[lang] ?? v.vi ?? v.en ?? '') : (v ?? '');
}
