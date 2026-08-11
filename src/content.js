// Portfolio content store — default data + localStorage persistence.
// Bump the version suffix whenever DEFAULT changes so cached content in
// localStorage does not mask the new defaults on existing visitors.
export const KEY = 'portfolio.content.v2';

export const uid = () => Math.random().toString(36).slice(2, 9);

export const DEFAULT = {
  profile: {
    name: 'Tín Trần',
    role: {
      vi: 'Kỹ sư phần mềm · R&D & Đồ họa thời gian thực',
      en: 'Software Engineer · R&D & Real-time Graphics'
    },
    tagline: {
      vi: '8 năm phát triển phần mềm. Hiện là key member trong một dự án R&D automotive cho khách hàng Nhật — nơi công việc là luôn đổi mới và chinh phục mọi nhiệm vụ phi lý từ ý tưởng của khách.',
      en: '8 years building software. Currently a key member of an automotive R&D project for a Japanese client — where the job is to keep innovating and conquer every seemingly impossible idea the client throws at us.'
    },
    about: {
      vi: '8 năm kinh nghiệm: 4 năm freelance và 4 năm tại FPT Software. Tôi biến những ý tưởng phi lý nhất thành sản phẩm chạy được — từ engine game, đồ họa/shader thời gian thực đến công cụ AI. Ngoài giờ tôi liên tục xây engine, công cụ procedural và ứng dụng thử nghiệm để không ngừng học và đẩy giới hạn.',
      en: '8 years of experience: 4 years freelancing and 4 years at FPT Software. I turn the most far-fetched ideas into working products — from game engines and real-time graphics/shaders to AI tools. After hours I keep building engines, procedural tooling and experimental apps to keep pushing my limits.'
    },
    location: 'Việt Nam (GMT+7)',
    email: 'tptin.dev@gmail.com',
    phone: '0778010476',
    availability: {
      vi: 'Nhận trao đổi dự án đồ họa / engine / R&D',
      en: 'Open to graphics / engine / R&D collaborations'
    },
    links: [
      { id: uid(), label: 'GitHub', url: 'https://github.com/tptindev' },
      { id: uid(), label: 'Email', url: 'mailto:tptin.dev@gmail.com' }
    ]
  },
  services: [
    { id: uid(), name: { vi: 'Đồ họa & shader thời gian thực', en: 'Real-time graphics & shaders' }, desc: { vi: 'Rendering, shader (GLSL/WGSL), procedural generation và tối ưu hiệu năng cho web, desktop và game.', en: 'Rendering, shaders (GLSL/WGSL), procedural generation and performance tuning for web, desktop and games.' }, price: 'Trao đổi / On request', unit: { vi: 'theo dự án', en: 'per project' } },
    { id: uid(), name: { vi: 'Prototyping R&D', en: 'R&D prototyping' }, desc: { vi: 'Biến ý tưởng phi lý thành proof-of-concept chạy được nhanh, đủ để chứng minh tính khả thi và ra quyết định.', en: 'Turning far-fetched ideas into fast working proof-of-concepts — enough to prove feasibility and drive decisions.' }, price: 'Trao đổi / On request', unit: { vi: 'theo dự án', en: 'per project' } },
    { id: uid(), name: { vi: 'Game engine & công cụ', en: 'Engine & tooling' }, desc: { vi: 'Xây engine, editor và pipeline bằng C++/Rust: ECS, physics, rendering, hot-reload và công cụ nội bộ.', en: 'Building engines, editors and pipelines in C++/Rust: ECS, physics, rendering, hot-reload and internal tooling.' }, price: 'Trao đổi / On request', unit: { vi: 'theo dự án', en: 'per project' } }
  ],
  projects: [
    { id: uid(), title: 'Lotus Engine', year: '2025', kicker: { vi: 'Game Engine · C++20', en: 'Game Engine · C++20' }, summary: { vi: 'Engine game 2D + 3D viết from scratch với bgfx, EnTT ECS, SDL3, Box2D và Jolt physics, kèm editor docking (Dear ImGui).', en: 'From-scratch 2D + 3D game engine with bgfx, EnTT ECS, SDL3, Box2D and Jolt physics, plus a Dear ImGui docking editor.' }, result: { vi: 'Engine + editor + 2 sample hoàn chỉnh', en: 'Full engine + editor + 2 samples' }, tags: ['C++20', 'bgfx', 'EnTT', 'ImGui'], url: '' },
    { id: uid(), title: 'Environment Editor', year: '2025', kicker: { vi: 'Đồ họa 3D · Công cụ', en: '3D Graphics · Tooling' }, summary: { vi: 'Công cụ tạo rừng thông sương mù procedural với camera điện ảnh và hậu kỳ thật (DoF, tilt-shift, motion blur, color grade). Electron + Three.js + React.', en: 'Procedural misty pine-forest tool with a cinematic camera rig and real post-processing (DoF, tilt-shift, motion blur, color grades). Electron + Three.js + React.' }, result: { vi: '16 chế độ camera, xuất WebM/PNG', en: '16 camera modes, WebM/PNG export' }, tags: ['Three.js', 'Electron', 'React', 'GLSL'], url: '' },
    { id: uid(), title: 'ProcRock', year: '2025', kicker: { vi: 'Procedural · 3D', en: 'Procedural · 3D' }, summary: { vi: 'Trình tạo đá procedural: icosphere biến dạng bằng noise fBm có seed, gợi ý tham số bằng AI, vật liệu PBR triplanar, xuất glb/obj/stl.', en: 'Procedural rock generator: icosphere displaced by seeded fBm noise, AI parameter suggestions, triplanar PBR materials, export to glb/obj/stl.' }, result: { vi: 'Xuất mesh in 3D (STL) không seam', en: '3D-print-ready STL, no seams' }, tags: ['Three.js', 'Electron', 'TypeScript'], url: '' },
    { id: uid(), title: 'rayindie', year: '2025', kicker: { vi: 'Đồ họa thời gian thực · C++', en: 'Real-time Graphics · C++' }, summary: { vi: 'Demo lái xe 3D trên raylib: terrain và đường procedural vô tận, đèn Blinn-Phong thời gian thực, xe glTF tự lái.', en: '3D driving vignette on raylib: endless procedural terrain and road, real-time Blinn-Phong lighting, an auto-driving glTF car.' }, result: { vi: 'Terrain + đường vô tận thời gian thực', en: 'Endless real-time terrain + road' }, tags: ['C++23', 'raylib', 'GLSL'], url: '' },
    { id: uid(), title: 'Shader Thinking Tool', year: '2025', kicker: { vi: 'Shader · Công cụ học tập', en: 'Shaders · Learning tool' }, summary: { vi: 'Lab học shader: node graph biên dịch ra GLSL, preview WebGL trực tiếp, mô phỏng trên CPU, trợ lý AI và xuất code raylib C++.', en: 'Shader learning lab: node graph that compiles to GLSL, live WebGL preview, CPU simulation, an AI assistant and raylib C++ code export.' }, result: { vi: 'Node graph → GLSL + mô phỏng CPU', en: 'Node graph → GLSL + CPU sim' }, tags: ['React', 'Three.js', 'WebGL', 'TypeScript'], url: '' },
    { id: uid(), title: 'Procedural Vegetation Studio', year: '2025', kicker: { vi: 'Procedural · 3D', en: 'Procedural · 3D' }, summary: { vi: 'Trình tạo thực vật procedural trên web: 14 loài cây, texture PBR sinh từ noise, cành cong Catmull-Rom với gió, xuất GLB kèm texture.', en: 'Web procedural vegetation generator: 14 species, noise-based PBR textures, Catmull-Rom branches with wind, GLB export with embedded textures.' }, result: { vi: '14 loài cây, xuất GLB dùng ngay', en: '14 species, ready-to-use GLB export' }, tags: ['Three.js', 'JavaScript', 'WebGL'], url: '' },
    { id: uid(), title: 'Trợ Lý', year: '2025', kicker: { vi: 'Voice AI · Android', en: 'Voice AI · Android' }, summary: { vi: 'Trợ lý giọng nói cho người lớn tuổi nói giọng Nam: wake word offline (Vosk), nhận dạng và hiểu ý bằng Whisper/GPT, SOS khẩn cấp, điều khiển app rảnh tay.', en: 'Voice assistant for elderly Southern-Vietnamese speakers: offline wake word (Vosk), Whisper/GPT transcription and intent, emergency SOS, hands-free app control.' }, result: { vi: 'Điều khiển điện thoại rảnh tay cho người lớn tuổi', en: 'Hands-free phone control for elders' }, tags: ['Kotlin', 'Android', 'Whisper', 'LLM'], url: '' },
    { id: uid(), title: 'Frog Pond', year: '2025', kicker: { vi: 'Game · Bevy / Rust', en: 'Game · Bevy / Rust' }, summary: { vi: 'Game hành động top-down trên Bevy 0.18: ếch cầm vũ khí dây xích, hậu kỳ CRT (scanline, cong, vignette), nước procedural và dây xích Verlet.', en: 'Top-down action game on Bevy 0.18: a frog with a chain weapon, CRT post-processing (scanlines, curvature, vignette), procedural water and Verlet-rope chain.' }, result: { vi: 'CRT shader + dây xích Verlet, combo game-feel', en: 'CRT shader + Verlet chain, juicy game-feel' }, tags: ['Rust', 'Bevy', 'WGSL'], url: '' },
    { id: uid(), title: 'CodeDirector', year: '2025', kicker: { vi: 'Dev Tooling · Video', en: 'Dev Tooling · Video' }, summary: { vi: 'App desktop biến repo, spec và tài liệu thành video hướng dẫn lập trình deterministic: điều khiển VS Code và trình duyệt, keyframe camera, phụ đề và thuyết minh.', en: 'Desktop app that turns repos, specs and docs into deterministic, replayable coding tutorial videos: VS Code and browser control, camera keyframes, subtitles and narration.' }, result: { vi: 'Tự sinh video tutorial chạy lại được', en: 'Auto-generated replayable tutorial videos' }, tags: ['TypeScript', 'Electron', 'Remotion', 'Playwright'], url: '' }
  ],
  skills: [
    { id: uid(), group: { vi: 'Đồ họa & Rendering', en: 'Graphics & Rendering' }, items: 'Three.js, WebGL, GLSL, WGSL, bgfx, raylib, shaders, post-processing' },
    { id: uid(), group: { vi: 'Engine & Gameplay', en: 'Engine & Gameplay' }, items: 'C++20, Rust, Bevy, EnTT (ECS), Box2D, Jolt, Dear ImGui' },
    { id: uid(), group: { vi: 'Procedural & 3D', en: 'Procedural & 3D' }, items: 'Procedural generation, noise/fBm, PBR, glTF/GLB, CMake' },
    { id: uid(), group: { vi: 'App & Desktop', en: 'App & Desktop' }, items: 'TypeScript, React, Electron, Vite, Node.js, Kotlin/Android' },
    { id: uid(), group: { vi: 'AI & R&D', en: 'AI & R&D' }, items: 'LLM/OpenAI, Whisper, Vosk, automotive R&D, rapid prototyping' }
  ],
  experience: [
    { id: uid(), company: 'FPT Software', role: { vi: 'Key member · Kỹ sư R&D', en: 'Key member · R&D Engineer' }, period: '2022 — nay', desc: { vi: 'Key member trong dự án R&D automotive cho khách hàng Nhật. Đặc thù công việc là luôn đổi mới và chinh phục mọi nhiệm vụ phi lý từ ý tưởng của khách.', en: 'Key member of an automotive R&D project for a Japanese client. The work is to keep innovating and conquer every seemingly impossible idea the client brings.' } },
    { id: uid(), company: 'Freelance', role: { vi: 'Kỹ sư phần mềm độc lập', en: 'Independent Software Engineer' }, period: '2018 — 2022', desc: { vi: '4 năm nhận và bàn giao dự án web, app và đồ họa cho khách trong và ngoài nước.', en: '4 years taking and delivering web, app and graphics projects for local and overseas clients.' } }
  ],
  process: [
    { id: uid(), title: { vi: 'Mổ xẻ bài toán "phi lý"', en: 'Break down the "impossible"' }, desc: { vi: 'Bóc tách yêu cầu tưởng như bất khả thi thành các phần đo được, tìm ra đâu là rào cản kỹ thuật thật.', en: 'Decompose a seemingly impossible ask into measurable pieces and pinpoint the real technical blockers.' } },
    { id: uid(), title: { vi: 'Prototype nhanh', en: 'Rapid prototype' }, desc: { vi: 'Dựng proof-of-concept chạy được sớm để chứng minh tính khả thi trước khi đầu tư sâu.', en: 'Stand up a working proof-of-concept early to prove feasibility before investing further.' } },
    { id: uid(), title: { vi: 'Lặp & tối ưu', en: 'Iterate & optimize' }, desc: { vi: 'Tinh chỉnh theo phản hồi và ràng buộc thời gian thực: hiệu năng, chất lượng hình ảnh, độ ổn định.', en: 'Refine against feedback and real-time constraints: performance, visual quality, stability.' } },
    { id: uid(), title: { vi: 'Bàn giao & tài liệu', en: 'Deliver & document' }, desc: { vi: 'Bàn giao mã nguồn, tài liệu và hướng dẫn để đội ngũ tiếp tục phát triển được lâu dài.', en: 'Hand over source, docs and guides so the team can keep building long term.' } }
  ],
  testimonials: [],
  posts: [
    { id: uid(), title: { vi: 'Viết engine game từ con số 0 với C++20', en: 'Building a game engine from scratch in C++20' }, excerpt: { vi: 'Những quyết định kiến trúc khi ghép bgfx, EnTT, SDL3 và physics thành một engine chạy được, và các bẫy tôi đã gặp.', en: 'Architecture decisions when wiring bgfx, EnTT, SDL3 and physics into a working engine, and the traps I hit.' }, date: '2025-11-10', tag: 'Engine', url: '' },
    { id: uid(), title: { vi: 'Procedural: từ noise đến rừng thông có sương', en: 'Procedural: from noise to misty forests' }, excerpt: { vi: 'Cách tôi dùng fBm noise và domain warping để tạo địa hình, đá và thực vật trông tự nhiên.', en: 'How I use fBm noise and domain warping to grow natural-looking terrain, rocks and vegetation.' }, date: '2025-08-22', tag: 'Graphics', url: '' },
    { id: uid(), title: { vi: 'Biến ý tưởng phi lý của khách thành prototype trong 1 tuần', en: 'Turning an impossible client idea into a prototype in a week' }, excerpt: { vi: 'Quy trình R&D tôi dùng để chứng minh khả thi nhanh, học từ dự án automotive cho khách Nhật.', en: 'The R&D workflow I use to prove feasibility fast, learned on an automotive project for a Japanese client.' }, date: '2025-06-05', tag: 'R&D', url: '' }
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
