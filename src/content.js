// Portfolio content store — default data + localStorage persistence.
export const KEY = 'portfolio.content.v1';

export const uid = () => Math.random().toString(36).slice(2, 9);

export const DEFAULT = {
  profile: {
    name: 'Nguyễn Văn A',
    role: { vi: 'Kỹ sư phần mềm Full-stack', en: 'Full-stack Software Engineer' },
    tagline: {
      vi: 'Tôi xây sản phẩm web, mobile và hệ thống backend cho startup và doanh nghiệp. 6 năm kinh nghiệm, làm việc trực tiếp, bàn giao đúng hẹn.',
      en: 'I build web, mobile and backend systems for startups and companies. 6 years of experience, direct collaboration, delivered on time.'
    },
    about: {
      vi: 'Tôi nhận dự án freelance từ ý tưởng đến khi lên production: kiến trúc, phát triển, triển khai và bàn giao tài liệu. Quen làm việc async với đội ngũ nước ngoài.',
      en: 'I take freelance projects from idea to production: architecture, development, deployment and handover docs. Comfortable working async with overseas teams.'
    },
    location: 'Hà Nội, Việt Nam (GMT+7)',
    email: 'hello@example.com',
    phone: '+84 900 000 000',
    availability: { vi: 'Còn nhận 1 dự án từ tháng 9', en: 'Open for 1 project from September' },
    links: [
      { id: uid(), label: 'GitHub', url: 'https://github.com/' },
      { id: uid(), label: 'LinkedIn', url: 'https://linkedin.com/' },
      { id: uid(), label: 'Email', url: 'mailto:hello@example.com' }
    ]
  },
  services: [
    { id: uid(), name: { vi: 'Sản phẩm web trọn gói', en: 'Full web product' }, desc: { vi: 'Frontend, API, database và triển khai. Phù hợp MVP hoặc sản phẩm nội bộ.', en: 'Frontend, API, database and deployment. Fits MVPs and internal tools.' }, price: 'từ 60tr / from $2,400', unit: { vi: 'theo dự án', en: 'per project' } },
    { id: uid(), name: { vi: 'Tích hợp AI / LLM', en: 'AI / LLM integration' }, desc: { vi: 'RAG, agent, tự động hoá quy trình bằng LLM, kèm đánh giá chất lượng đầu ra.', en: 'RAG, agents, LLM workflow automation, with output evaluation.' }, price: 'từ 35tr / from $1,400', unit: { vi: 'theo dự án', en: 'per project' } },
    { id: uid(), name: { vi: 'Thuê theo tháng', en: 'Monthly retainer' }, desc: { vi: 'Tham gia đội ngũ của bạn 20–40 giờ/tuần, cam kết tối thiểu 1 tháng.', en: 'Join your team 20–40 hrs/week, one month minimum.' }, price: '25 USD/giờ / $25/hr', unit: { vi: 'theo giờ', en: 'hourly' } }
  ],
  projects: [
    { id: uid(), title: 'Fleetline', year: '2025', kicker: { vi: 'Logistics · Full-stack', en: 'Logistics · Full-stack' }, summary: { vi: 'Hệ thống điều phối xe tải thời gian thực cho 120 tài xế. React, NestJS, PostgreSQL, WebSocket.', en: 'Real-time truck dispatch system for 120 drivers. React, NestJS, PostgreSQL, WebSocket.' }, result: { vi: 'Giảm 31% thời gian điều xe', en: '31% faster dispatch' }, tags: ['React', 'NestJS', 'PostgreSQL'], url: '' },
    { id: uid(), title: 'Mint Ledger', year: '2024', kicker: { vi: 'Fintech · Backend', en: 'Fintech · Backend' }, summary: { vi: 'API đối soát giao dịch xử lý 4 triệu bản ghi/ngày, hàng đợi Kafka và báo cáo tự động.', en: 'Reconciliation API processing 4M records/day, Kafka queues and automated reporting.' }, result: { vi: 'Đối soát từ 6 giờ xuống 12 phút', en: 'Reconciliation from 6h to 12min' }, tags: ['Go', 'Kafka', 'AWS'], url: '' },
    { id: uid(), title: 'Nomi', year: '2024', kicker: { vi: 'Mobile · AI', en: 'Mobile · AI' }, summary: { vi: 'Ứng dụng ghi chú giọng nói với tóm tắt LLM, offline-first. React Native, Whisper, Claude API.', en: 'Voice note app with LLM summaries, offline-first. React Native, Whisper, Claude API.' }, result: { vi: '18k lượt tải trong 3 tháng', en: '18k downloads in 3 months' }, tags: ['React Native', 'LLM', 'Supabase'], url: '' }
  ],
  skills: [
    { id: uid(), group: { vi: 'Frontend', en: 'Frontend' }, items: 'React, Next.js, TypeScript, React Native, Tailwind' },
    { id: uid(), group: { vi: 'Backend & API', en: 'Backend & API' }, items: 'Node.js, NestJS, Go, PostgreSQL, Redis, GraphQL' },
    { id: uid(), group: { vi: 'AI & Dữ liệu', en: 'AI & Data' }, items: 'LLM/RAG, Python, Airflow, dbt, vector DB' },
    { id: uid(), group: { vi: 'Hạ tầng', en: 'Infrastructure' }, items: 'AWS, Docker, Kubernetes, Terraform, CI/CD' }
  ],
  experience: [
    { id: uid(), company: 'Freelance', role: { vi: 'Kỹ sư phần mềm độc lập', en: 'Independent software engineer' }, period: '2023 — nay', desc: { vi: '14 dự án bàn giao cho khách ở Việt Nam, Singapore và Đức.', en: '14 projects delivered for clients in Vietnam, Singapore and Germany.' } },
    { id: uid(), company: 'Tekhub', role: { vi: 'Senior Software Engineer', en: 'Senior Software Engineer' }, period: '2021 — 2023', desc: { vi: 'Dẫn đội 4 người xây nền tảng thương mại điện tử B2B.', en: 'Led a team of 4 building a B2B commerce platform.' } },
    { id: uid(), company: 'Base Studio', role: { vi: 'Software Engineer', en: 'Software Engineer' }, period: '2019 — 2021', desc: { vi: 'Phát triển web app cho khách hàng agency, tập trung frontend.', en: 'Built web apps for agency clients, frontend focused.' } }
  ],
  process: [
    { id: uid(), title: { vi: 'Trao đổi & phạm vi', en: 'Scoping call' }, desc: { vi: 'Một buổi 45 phút để hiểu bài toán, sau đó tôi gửi phạm vi, mốc thời gian và báo giá cố định.', en: 'A 45-minute call to understand the problem, then I send scope, timeline and a fixed quote.' } },
    { id: uid(), title: { vi: 'Bản chạy được sớm', en: 'Early working build' }, desc: { vi: 'Trong 1–2 tuần đầu bạn đã có bản chạy được để dùng thử, không chỉ là bản thiết kế.', en: 'Within the first 1–2 weeks you get a running build to try, not just mockups.' } },
    { id: uid(), title: { vi: 'Lặp hàng tuần', en: 'Weekly iteration' }, desc: { vi: 'Mỗi tuần một bản demo và báo cáo ngắn. Bạn thấy tiến độ, tôi nhận phản hồi sớm.', en: 'A demo and a short report every week. You see progress, I get feedback early.' } },
    { id: uid(), title: { vi: 'Bàn giao & hỗ trợ', en: 'Handover & support' }, desc: { vi: 'Mã nguồn, tài liệu, hướng dẫn vận hành và 30 ngày hỗ trợ sửa lỗi miễn phí.', en: 'Source, docs, runbook and 30 days of free bug support.' } }
  ],
  testimonials: [
    { id: uid(), quote: { vi: 'Bàn giao đúng hẹn, chủ động đề xuất giải pháp rẻ hơn cho hạ tầng. Chúng tôi thuê tiếp ngay dự án sau.', en: 'Delivered on time and proactively proposed a cheaper infrastructure setup. We hired him again right after.' }, author: 'Linh Trần', company: 'CTO, Fleetline' },
    { id: uid(), quote: { vi: 'Giao tiếp rõ ràng qua async, code sạch và có test. Rất dễ làm việc dù lệch múi giờ.', en: 'Clear async communication, clean and tested code. Easy to work with despite the time zones.' }, author: 'Martin Weber', company: 'Founder, Mint Ledger' }
  ],
  posts: [
    { id: uid(), title: { vi: 'Cách tôi ước lượng dự án freelance', en: 'How I estimate freelance projects' }, excerpt: { vi: 'Ba câu hỏi tôi luôn hỏi trước khi báo giá, và vì sao tôi tránh tính theo giờ cho dự án nhỏ.', en: 'Three questions I always ask before quoting, and why I avoid hourly billing on small projects.' }, date: '2026-05-14', tag: 'Freelance', url: '' },
    { id: uid(), title: { vi: 'RAG trong sản phẩm thật', en: 'RAG in a real product' }, excerpt: { vi: 'Những chỗ pipeline RAG hay hỏng khi dữ liệu khách hàng lộn xộn, và cách tôi đo chất lượng.', en: 'Where RAG pipelines break on messy client data, and how I measure quality.' }, date: '2026-03-02', tag: 'AI', url: '' }
  ]
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    return { ...structuredClone(DEFAULT), ...JSON.parse(raw) };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function reset() {
  localStorage.removeItem(KEY);
}
